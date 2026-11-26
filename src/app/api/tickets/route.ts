import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getTenant, nextNumber } from "@/lib/tenant";
import { ticketCreateSchema } from "@/lib/validations";
import { requireRole, customerScope } from "@/lib/require-auth";
import { diagnose } from "@/lib/diagnostics-kb";
import { runTicketAgent } from "@/lib/ticket-agent";

export async function GET(req: Request) {
  const tenant = await getTenant();
  const { scopedCustomerId } = await customerScope();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q") ?? "";

  const tickets = await db.ticket.findMany({
    where: {
      tenantId: tenant.id,
      ...(scopedCustomerId ? { customerId: scopedCustomerId } : {}),
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(q
        ? { OR: [{ title: { contains: q } }, { number: { contains: q } }, { errorCode: { contains: q } }] }
        : {}),
    },
    include: {
      customer: true,
      asset: { include: { site: true } },
      workOrders: { include: { assignments: { include: { technician: true } } } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const session = await requireRole("CLIENT");
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const isAdmin = session.user.role === "ADMIN";
  const tenant = await getTenant();
  const body = await req.json();
  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const count = await db.ticket.count({ where: { tenantId: tenant.id } });
  const number = nextNumber("TK", count + 1);

  // SLA: Gold P1=2h, else 8/24/72
  const hours = parsed.data.priority === "P1_CRITICAL" ? 2 : parsed.data.priority === "P2_HIGH" ? 8 : 24;

  // Smart triage: KB diagnostic at intake (exact/fuzzy/symptom)
  const diag = diagnose(parsed.data.errorCode, `${parsed.data.title} ${parsed.data.description}`);
  const aiSummary =
    parsed.data.errorCode || diag.match !== "generic"
      ? `${diag.title} — ${diag.likelyCauses.slice(0, 2).join(" · ")} (source: ${diag.source})`
      : "";

  const ticket = await db.ticket.create({
    data: {
      tenantId: tenant.id,
      number,
      customerId: parsed.data.customerId,
      assetId: parsed.data.assetId || null,
      channel: parsed.data.channel,
      priority: parsed.data.priority,
      title: parsed.data.title,
      description: parsed.data.description,
      errorCode: parsed.data.errorCode,
      aiSummary,
      aiConfidence: aiSummary ? diag.confidence : 0,
      slaDueAt: new Date(Date.now() + hours * 3600e3),
      reviewSource: "INTERNAL",
      reviewStatus: isAdmin ? "PENDING" : "NONE",
      agentStatus: isAdmin ? "PENDING" : "NONE",
      events: { create: [{ actor: "dispatcher", action: "CREATED", detail: `Intake ${parsed.data.channel}` }] },
    },
  });

  // Admins skip the review gate: the agent runs and accepts its own proposal.
  // Everyone else gets the review by pressing "Relancer" on the ticket.
  if (isAdmin) {
    after(async () => {
      try {
        await runTicketAgent(ticket.id, { autoAccept: true });
      } catch (cause) {
        console.error("[khedma] admin ticket agent failed", cause);
      }
    });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
