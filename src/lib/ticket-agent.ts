/**
 * Khedma ticket agent pipeline.
 *
 * Public intake -> curated context -> Factory agent (guarded, RAG, skills) ->
 * stored review + invoice draft -> dispatcher accepts/edits/refuses -> work
 * order + assignment + technician notification.
 *
 * A deterministic review is always produced if the model is unreachable, so the
 * dispatcher never gets an empty screen.
 */
import type { Priority, Role } from "@prisma/client";

import {
  buildDispatchContext,
  callFactoryDispatchAgent,
  parseInvoice,
  type AgentInvoice,
  type AgentReview,
  type DispatchContext,
} from "./agent-dispatch";
import { db } from "./db";
import { assignmentMail, sendMail } from "./mailer";
import { nextNumber } from "./tenant";

const OPEN_TICKET: Record<string, true> = {
  NEW: true,
  QUALIFIED: true,
  SCHEDULED: true,
};

type AcceptInput = {
  actor: string;
  technicianId?: string | null;
  priority?: string | null;
  invoice?: unknown;
  auto?: boolean;
};

export async function notifyRoles(
  tenantId: string,
  roles: Role[],
  payload: { kind: string; title: string; body: string; href: string },
) {
  const users = await db.user.findMany({
    where: { tenantId, active: true, role: { in: roles } },
    select: { id: true },
  });
  if (users.length === 0) return;
  await db.notification.createMany({
    data: users.map((user) => ({
      tenantId,
      userId: user.id,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      href: payload.href,
    })),
  });
}

async function notifyUser(
  tenantId: string,
  userId: string,
  payload: { kind: string; title: string; body: string; href: string; meta?: object },
) {
  await db.notification.create({
    data: {
      tenantId,
      userId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      href: payload.href,
      meta: payload.meta,
    },
  });
}

function deterministicInvoice(context: DispatchContext): AgentInvoice {
  const parts = context.diagnostics.parts
    .map((wanted) => context.pricing.parts.find((item) => item.sku === wanted.sku))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 2);
  const lines = [
    { label: "Déplacement et diagnostic", qty: 1, unitPrice: context.pricing.calloutCents },
    { label: "Main-d'œuvre — 1 h", qty: 1, unitPrice: context.pricing.laborRateCents },
    ...parts.map((part) => ({ label: part.name, qty: 1, unitPrice: part.unitPrice })),
  ].filter((line) => line.unitPrice > 0);
  return {
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0),
    currency: context.pricing.currency,
  };
}

export function deterministicReview(context: DispatchContext, error?: string | null): AgentReview {
  const candidate = context.ranked.find((row) => row.eligible) ?? context.ranked[0] ?? null;
  return {
    technicianId: candidate?.id ?? null,
    summary: `${context.diagnostics.title} — ${context.diagnostics.likelyCauses
      .slice(0, 2)
      .join(" · ")}`,
    reasons: [
      ...(candidate?.reasons ?? []),
      `Diagnostic ${context.diagnostics.source}`,
      ...(error ? [error] : []),
    ].slice(0, 8),
    reasoning: [
      { step: "Diagnostic", detail: context.diagnostics.title },
      ...context.diagnostics.likelyCauses.map((cause) => ({
        step: "Cause probable",
        detail: cause,
      })),
      ...(candidate
        ? [
            {
              step: "Technicien proposé",
              detail: `${candidate.name} — ${candidate.reasons.join(" · ")}`,
            },
          ]
        : []),
    ],
    confidence: context.diagnostics.confidence,
    priority: null,
    etaMin: candidate?.etaMin ?? null,
    invoice: deterministicInvoice(context),
    engine: "deterministic",
    runId: null,
  };
}

/** Run the guarded Factory agent for a ticket and store its review + invoice. */
export async function runTicketAgent(
  ticketId: string,
  opts: { autoAccept?: boolean; force?: boolean } = {},
) {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;
  if (
    !opts.force &&
    (ticket.reviewStatus === "READY" || ticket.reviewStatus === "ACCEPTED") &&
    ticket.agentDecision
  ) {
    return ticket;
  }

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      agentStatus: "RUNNING",
      reviewStatus: ticket.reviewStatus === "NONE" ? "PENDING" : ticket.reviewStatus,
      agentError: "",
    },
  });

  let review: AgentReview;
  let error: string | null = null;
  let runId: string | null = null;
  try {
    const context = await buildDispatchContext(ticket.tenantId, ticket.id);
    if (!context) throw new Error("Contexte de dispatch introuvable.");
    const result = await callFactoryDispatchAgent(ticket.id, ticket.tenantId, context);
    runId = result.runId;
    error = result.error;
    review = result.review ?? deterministicReview(context, result.error);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Agent indisponible.";
    const context = await buildDispatchContext(ticket.tenantId, ticket.id);
    review = context
      ? deterministicReview(context, error)
      : {
          technicianId: null,
          summary: "",
          reasons: [error],
          reasoning: [],
          confidence: null,
          priority: null,
          etaMin: null,
          invoice: null,
          engine: "deterministic",
          runId: null,
        };
  }

  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: {
      agentStatus: "READY",
      reviewStatus: "READY",
      agentRunId: runId ?? "",
      agentDecision: review as unknown as object,
      agentInvoice: (review.invoice ?? undefined) as unknown as object | undefined,
      agentError: error ?? "",
      aiSummary: review.summary || ticket.aiSummary,
      aiConfidence: review.confidence ?? ticket.aiConfidence,
    },
  });

  await db.auditEvent.create({
    data: {
      ticketId,
      actor: "agent",
      action: "AI_REVIEW",
      detail: `${review.engine} · ${review.summary || "revue prête"}`,
    },
  });
  await notifyRoles(ticket.tenantId, ["DISPATCHER", "MANAGER", "ADMIN"], {
    kind: "REVIEW",
    title: `Revue IA prête — ${ticket.number}`,
    body: review.summary || ticket.title,
    href: `/tickets/${ticket.id}`,
  });

  if (opts.autoAccept) {
    return acceptTicketReview(ticketId, { actor: "agent", auto: true });
  }
  return updated;
}

/** Accept the agent review (optionally edited) and create WO + assignment + invoice. */
export async function acceptTicketReview(ticketId: string, input: AcceptInput) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { customer: true, asset: { include: { site: true } } },
  });
  if (!ticket) throw new Error("Ticket introuvable.");
  if (!OPEN_TICKET[ticket.status] && ticket.reviewStatus !== "READY") {
    throw new Error("Ce ticket n'est plus en attente de revue.");
  }
  if (ticket.reviewStatus === "ACCEPTED") return ticket;

  const context = await buildDispatchContext(ticket.tenantId, ticket.id);
  const stored = (ticket.agentDecision ?? {}) as Partial<AgentReview>;
  const storedInvoice = (ticket.agentInvoice ?? null) as unknown;
  const currency = context?.pricing.currency ?? "MAD";

  const technicianId =
    input.technicianId ||
    stored.technicianId ||
    context?.ranked.find((row) => row.eligible)?.id ||
    null;
  if (!technicianId) throw new Error("Aucun technicien disponible pour cette intervention.");
  const technician = await db.technician.findFirst({
    where: { id: technicianId, tenantId: ticket.tenantId },
    include: { user: true },
  });
  if (!technician) throw new Error("Technicien introuvable dans cette entreprise.");

  const priority: Priority =
    input.priority === "P1_CRITICAL" ||
    input.priority === "P2_HIGH" ||
    input.priority === "P3_NORMAL" ||
    input.priority === "P4_LOW"
      ? input.priority
      : ticket.priority;

  const invoice =
    parseInvoice(input.invoice, currency) ??
    parseInvoice(storedInvoice, currency) ??
    parseInvoice(stored.invoice, currency) ??
    (context ? deterministicInvoice(context) : null);
  if (!invoice) throw new Error("Facture brouillon introuvable.");

  const [workOrderCount, invoiceCount] = await Promise.all([
    db.workOrder.count({ where: { tenantId: ticket.tenantId } }),
    db.invoice.count({ where: { tenantId: ticket.tenantId } }),
  ]);

  const etaMin = Math.max(5, Math.round(stored.etaMin ?? 30));
  const workOrder = await db.workOrder.create({
    data: {
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      number: nextNumber("WO", workOrderCount + 1),
      jobType: "REPAIR",
      status: "ASSIGNED",
      scheduledStart: new Date(),
      estimatedMin: 90,
      requiredSkills: (context?.requiredSkills ?? []) as unknown as object,
      notes: stored.summary ?? "",
    },
  });
  await db.assignment.create({
    data: {
      workOrderId: workOrder.id,
      technicianId: technician.id,
      etaMin,
    },
  });

  const existingInvoice = await db.invoice.findUnique({ where: { ticketId: ticket.id } });
  const invoiceData = {
    tenantId: ticket.tenantId,
    customerId: ticket.customerId,
    ticketId: ticket.id,
    number: existingInvoice?.number ?? nextNumber("FAC", invoiceCount + 1),
    lines: invoice.lines as unknown as object,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    status: "DRAFT" as const,
    dueAt: new Date(Date.now() + 14 * 24 * 3600e3),
  };
  const savedInvoice = existingInvoice
    ? await db.invoice.update({ where: { id: existingInvoice.id }, data: invoiceData })
    : await db.invoice.create({ data: invoiceData });

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      priority,
      status: "SCHEDULED",
      reviewStatus: "ACCEPTED",
      reviewedBy: input.actor,
      reviewedAt: new Date(),
      agentInvoice: invoice as unknown as object,
    },
  });
  await db.auditEvent.createMany({
    data: [
      {
        ticketId: ticket.id,
        actor: input.actor,
        action: "AI_REVIEW_ACCEPTED",
        detail: input.auto
          ? "Acceptation automatique (admin)"
          : `Revue acceptée · ${technician.name}`,
      },
      {
        ticketId: ticket.id,
        actor: input.actor,
        action: "ASSIGNED",
        detail: `WO ${workOrder.number} · ${technician.name} · ETA ${etaMin} min`,
      },
      {
        ticketId: ticket.id,
        actor: input.actor,
        action: "INVOICED",
        detail: `Facture brouillon ${savedInvoice.number} · ${invoice.totalCents / 100} ${invoice.currency}`,
      },
    ],
  });

  if (technician.userId) {
    await notifyUser(ticket.tenantId, technician.userId, {
      kind: "TASK",
      title: `Nouvelle mission — ${ticket.number}`,
      body: `${ticket.title} · ${ticket.customer.name} · ETA ${etaMin} min`,
      href: `/tickets/${ticket.id}`,
      meta: { ticketId: ticket.id, workOrderId: workOrder.id },
    });
  }
  const to = technician.email || technician.user?.email || "";
  if (to) {
    try {
      const mail = assignmentMail({
        number: workOrder.number,
        ticketNumber: ticket.number,
        title: ticket.title,
        jobType: workOrder.jobType,
        scheduledStart: workOrder.scheduledStart,
        estimatedMin: workOrder.estimatedMin,
        customer: ticket.customer.name,
        site: ticket.asset?.site?.name ?? ticket.customer.address,
        address: ticket.asset?.site?.address ?? ticket.customer.address,
        accessCode: ticket.asset?.site?.accessCode ?? "",
        ticketId: ticket.id,
      });
      const sent = await sendMail({ to, ...mail });
      await db.auditEvent.create({
        data: {
          ticketId: ticket.id,
          actor: "system",
          action: "NOTIFIED",
          detail: `${technician.name} <${to}> — ${sent.sent ? "email envoyé" : "email en log (SMTP non configuré)"}`,
        },
      });
    } catch (cause) {
      console.error("[khedma] technician notification failed", cause);
    }
  }

  return db.ticket.findUnique({
    where: { id: ticket.id },
    include: { customer: true, invoice: true, workOrders: { include: { assignments: true } } },
  });
}

/** Refuse the request after review. */
export async function refuseTicketReview(ticketId: string, actor: string, reason: string) {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket introuvable.");
  await db.ticket.update({
    where: { id: ticketId },
    data: {
      reviewStatus: "REFUSED",
      status: "CANCELLED",
      reviewedBy: actor,
      reviewedAt: new Date(),
    },
  });
  await db.auditEvent.create({
    data: {
      ticketId,
      actor,
      action: "AI_REVIEW_REFUSED",
      detail: reason.slice(0, 500) || "Refusé par le répartiteur",
    },
  });
  return db.ticket.findUnique({ where: { id: ticketId } });
}
