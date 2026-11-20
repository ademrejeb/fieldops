import type { WorkOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildDispatchContext,
  callFactoryDispatchAgent,
  type AgentDecision,
} from "@/lib/agent-dispatch";
import { requireRole } from "@/lib/require-auth";
import { getTenant, nextNumber } from "@/lib/tenant";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ ticketId: z.string().min(1) });

const CLOSED_TICKET_STATUSES = new Set([
  "RESOLVED",
  "INVOICED",
  "CLOSED",
  "CANCELLED",
]);
const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "ASSIGNED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
];

function aiSummary(
  decision: AgentDecision | null,
  used: boolean,
  fallbackReason: string | null,
): Record<string, unknown> {
  return {
    used,
    technicianId: decision?.technicianId ?? null,
    summary: decision?.summary ?? "",
    reasons: decision?.reasons ?? [],
    confidence: decision?.confidence ?? null,
    fallbackReason,
  };
}

export async function POST(request: Request) {
  const session = await requireRole("DISPATCHER");
  if (!session) {
    return NextResponse.json({ error: "Forbidden — dispatch only" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "ticketId is required." }, { status: 400 });
  }
  const tenant = await getTenant();
  const context = await buildDispatchContext(tenant.id, parsed.data.ticketId);
  if (!context) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }
  if (CLOSED_TICKET_STATUSES.has(context.ticket.status)) {
    return NextResponse.json(
      { error: `Ticket is ${context.ticket.status.toLowerCase()} and cannot be dispatched.` },
      { status: 409 },
    );
  }

  const existing = await db.workOrder.findFirst({
    where: {
      tenantId: tenant.id,
      ticketId: context.ticket.id,
      status: { in: OPEN_WORK_ORDER_STATUSES },
      assignments: { some: {} },
    },
    include: { assignments: { include: { technician: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return NextResponse.json({
      reused: true,
      workOrder: existing,
      assignment: existing.assignments[0] ?? null,
      technician: existing.assignments[0]?.technician ?? null,
      ai: { used: false, reused: true },
      ranked: context.ranked.slice(0, 5),
      context,
    });
  }

  const eligible = context.ranked.filter((candidate) => candidate.eligible);
  if (eligible.length === 0) {
    return NextResponse.json(
      {
        error: "No eligible technician has the required skills or availability.",
        requiredSkills: context.requiredSkills,
        ranked: context.ranked,
      },
      { status: 409 },
    );
  }

  const factory = await callFactoryDispatchAgent(context.ticket.id, tenant.id);
  let decision = factory.decision;
  let fallbackReason = factory.error;
  let used = factory.used && decision !== null;

  const selectedFromAgent = decision
    ? eligible.find((candidate) => candidate.id === decision?.technicianId)
    : undefined;
  if (decision && !selectedFromAgent) {
    fallbackReason = "The agent chose a technician outside the eligible candidate set.";
    decision = null;
    used = false;
  }
  const chosen = selectedFromAgent ?? eligible[0];
  if (!used) {
    fallbackReason = fallbackReason ?? "Deterministic ranking was used.";
  }

  const actor = session.user?.email ?? "dispatcher";
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const count = await db.workOrder.count({ where: { tenantId: tenant.id } });
      const number = nextNumber("WO", count + 1 + attempt);
      const result = await db.$transaction(async (tx) => {
        const workOrder = await tx.workOrder.create({
          data: {
            tenantId: tenant.id,
            ticketId: context.ticket.id,
            number,
            jobType: "REPAIR",
            status: "ASSIGNED",
            scheduledStart: now,
            estimatedMin: 90,
            requiredSkills: context.requiredSkills,
            notes: decision?.summary ?? "Assigned by the AI dispatcher using live technician metrics.",
          },
        });
        const assignment = await tx.assignment.create({
          data: {
            workOrderId: workOrder.id,
            technicianId: chosen.id,
            etaMin: chosen.etaMin,
            seq: 1,
          },
          include: { technician: true },
        });
        await tx.ticket.update({
          where: { id: context.ticket.id },
          data: { status: "SCHEDULED" },
        });
        await tx.auditEvent.create({
          data: {
            ticketId: context.ticket.id,
            actor,
            action: "AI_DISPATCH",
            fromStatus: context.ticket.status,
            toStatus: "SCHEDULED",
            detail: JSON.stringify({
              workOrder: workOrder.number,
              technicianId: chosen.id,
              technicianName: chosen.name,
              score: chosen.score,
              etaMin: chosen.etaMin,
              aiUsed: used,
              confidence: decision?.confidence ?? null,
              fallbackReason,
            }),
          },
        });
        return { workOrder, assignment };
      });
      return NextResponse.json({
        reused: false,
        workOrder: result.workOrder,
        assignment: result.assignment,
        technician: result.assignment.technician,
        ai: aiSummary(decision, used, fallbackReason),
        ranked: context.ranked.slice(0, 5),
        context,
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002" && attempt < 2) continue;
      console.error("[agents/dispatch] failed:", error);
      return NextResponse.json({ error: "Dispatch could not be saved." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Dispatch could not be saved." }, { status: 500 });
}
