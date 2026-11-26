import { NextResponse } from "next/server";

import { buildDispatchContext } from "@/lib/agent-dispatch";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { acceptTicketReview, refuseTicketReview, runTicketAgent } from "@/lib/ticket-agent";
import { reviewActionSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

async function ticketForTenant(ticketId: string, tenantId: string) {
  return db.ticket.findFirst({
    where: { id: ticketId, tenantId },
    include: {
      customer: true,
      invoice: true,
      workOrders: { include: { assignments: { include: { technician: true } } } },
    },
  });
}

/** The native dispatcher review payload: agent work, candidates, invoice draft. */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("DISPATCHER");
  const user = session?.user;
  if (!user?.tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const tenantId = user.tenantId;
  const ticket = await ticketForTenant(id, tenantId);
  if (!ticket) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const context = await buildDispatchContext(tenantId, ticket.id);
  return NextResponse.json({
    ticket: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      reviewStatus: ticket.reviewStatus,
      agentStatus: ticket.agentStatus,
      agentError: ticket.agentError,
      aiSummary: ticket.aiSummary,
      aiConfidence: ticket.aiConfidence,
      agentRunId: ticket.agentRunId,
    },
    review: ticket.agentDecision ?? null,
    invoice: ticket.agentInvoice ?? null,
    savedInvoice: ticket.invoice,
    candidates:
      context?.ranked.slice(0, 6).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        skills: row.skills,
        score: row.score,
        etaMin: row.etaMin,
        km: row.km,
        reasons: row.reasons,
        eligible: row.eligible,
      })) ?? [],
    technicians: context
      ? context.ranked.map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          skills: row.skills,
        }))
      : [],
  });
}

/** Accept (optionally edited) or refuse the stored review. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("DISPATCHER");
  const user = session?.user;
  if (!user?.tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const tenantId = user.tenantId;
  const ticket = await ticketForTenant(id, tenantId);
  if (!ticket) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = request ? await request.json().catch(() => null) : null;
  const parsed = reviewActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
  }
  const actor = user.name || user.email || "dispatcher";
  try {
    if (parsed.data.action === "refuse") {
      const refused = await refuseTicketReview(ticket.id, actor, parsed.data.reason);
      return NextResponse.json({ ok: true, ticket: refused });
    }
    const accepted = await acceptTicketReview(ticket.id, {
      actor,
      technicianId: parsed.data.technicianId,
      priority: parsed.data.priority,
      invoice: parsed.data.invoiceLines
        ? { lines: parsed.data.invoiceLines }
        : undefined,
    });
    return NextResponse.json({ ok: true, ticket: accepted });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Action impossible." },
      { status: 409 },
    );
  }
}

/** Re-run the agent on demand (dispatcher). */
export async function PUT(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("DISPATCHER");
  const user = session?.user;
  if (!user?.tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ticket = await ticketForTenant(id, user.tenantId);
  if (!ticket) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  try {
    const updated = await runTicketAgent(ticket.id, { force: true });
    return NextResponse.json({ ok: true, ticket: updated });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Revue impossible." },
      { status: 409 },
    );
  }
}
