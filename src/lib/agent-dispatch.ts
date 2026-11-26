import { db } from "./db";
import { rankTechnicians, type JobInput, type RankedTech, type TechInput } from "./dispatch";
import { diagnose } from "./diagnostics-kb";

/** A deliberately narrow view of a ticket that is safe to send to the agent. */
export interface DispatchTicket {
  id: string;
  number: string;
  title: string;
  description: string;
  priority: JobInput["priority"];
  status: string;
  channel: string;
  errorCode: string;
  slaDueAt: string | null;
  customer: string;
  site: {
    name: string;
    city: string;
    address: string;
    lat: number;
    lng: number;
  } | null;
  asset: {
    name: string;
    serialNo: string;
    category: string;
    healthScore: number;
  } | null;
  contractTier: string | null;
}

export interface DispatchContext {
  tenantId: string;
  generatedAt: string;
  ticket: DispatchTicket;
  requiredSkills: string[];
  requiredCertifications: string[];
  ranked: RankedTech[];
  diagnostics: {
    title: string;
    likelyCauses: string[];
    steps: string[];
    parts: { sku: string; label: string }[];
    confidence: number;
    source: string;
    match: string;
  };
  pricing: {
    currency: string;
    laborRateCents: number;
    calloutCents: number;
    parts: { sku: string; name: string; unitPrice: number; qtyOnHand: number }[];
  };
  operations: {
    tenantName: string;
    locale: string;
  };
}

const SKILL_HINTS: Array<[RegExp, string]> = [
  [/ASCENSEUR|ELEVATOR|MONTE|LIFT/i, "ELEVATOR"],
  [/CLIM|HVAC|CHAUFFAGE|FRIGO|VRV|SPLIT/i, "HVAC"],
  [/CAMERA|CAMÉRA|ALARME|SECURITE|SÉCURITÉ|ACCES|ACCÈS|INTERPHONE/i, "SECURITY"],
  [/ELECTRI|ÉLECTRI|TABLEAU|DISJONCTEUR|TGBT/i, "ELECTRICAL"],
  [/PLOMB|FUITE|EAU|POMPE|CHAUFFE-EAU/i, "PLUMBING"],
  [/ASCENSEUR|ELEVATOR|HYDRAULIQUE/i, "ELEVATOR"],
];

function inferRequiredSkills(ticket: {
  title: string;
  description: string;
  errorCode: string;
  asset: { category: string } | null;
}): string[] {
  const skills = new Set<string>();
  const category = ticket.asset?.category?.trim().toUpperCase();
  if (category) skills.add(category);
  const text = `${ticket.title} ${ticket.description} ${ticket.errorCode}`;
  for (const [pattern, skill] of SKILL_HINTS) {
    if (pattern.test(text)) skills.add(skill);
  }
  return [...skills];
}

function asUtc(value: Date | null | undefined): Date | null {
  return value ?? null;
}

export async function buildDispatchContext(
  tenantId: string,
  ticketId: string,
): Promise<DispatchContext | null> {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      customer: true,
      contract: true,
      asset: { include: { assetType: true, site: true } },
      workOrders: { include: { assignments: true } },
    },
  });
  if (!ticket || ticket.tenantId !== tenantId) return null;

  const technicians = await db.technician.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
  const technicianIds = technicians.map((tech) => tech.id);

  const loads = technicianIds.length
    ? await db.assignment.groupBy({
        by: ["technicianId"],
        where: {
          technicianId: { in: technicianIds },
          workOrder: {
            tenantId,
            status: { notIn: ["DONE", "APPROVED", "CANCELLED"] },
          },
        },
        _count: true,
      })
    : [];
  const loadMap = new Map(loads.map((row) => [row.technicianId, row._count]));

  const completedAssignments = technicianIds.length
    ? await db.assignment.findMany({
        where: {
          technicianId: { in: technicianIds },
          workOrder: { tenantId, status: { in: ["DONE", "APPROVED"] } },
        },
        select: { technicianId: true, workOrderId: true },
      })
    : [];
  const completedByTech = new Map<string, Set<string>>();
  for (const row of completedAssignments) {
    const set = completedByTech.get(row.technicianId) ?? new Set<string>();
    set.add(row.workOrderId);
    completedByTech.set(row.technicianId, set);
  }
  const completedWorkOrderIds = [...new Set(completedAssignments.map((row) => row.workOrderId))];
  const timeLogs = completedWorkOrderIds.length
    ? await db.timeLog.findMany({
        where: { workOrderId: { in: completedWorkOrderIds }, minutes: { gt: 0 } },
        select: { workOrderId: true, minutes: true },
      })
    : [];
  const minutesByWorkOrder = new Map<string, number>();
  for (const log of timeLogs) {
    minutesByWorkOrder.set(
      log.workOrderId,
      (minutesByWorkOrder.get(log.workOrderId) ?? 0) + log.minutes,
    );
  }
  function averageResolution(technicianId: string): number | null {
    const workOrders = completedByTech.get(technicianId);
    if (!workOrders || workOrders.size === 0) return null;
    let total = 0;
    let counted = 0;
    for (const workOrderId of workOrders) {
      const minutes = minutesByWorkOrder.get(workOrderId);
      if (minutes && minutes > 0) {
        total += minutes;
        counted += 1;
      }
    }
    return counted > 0 ? Math.round(total / counted) : null;
  }

  // GPS history can be large; take enough recent rows to cover every technician.
  const positions = technicianIds.length
    ? await db.position.findMany({
        where: { tenantId, technicianId: { in: technicianIds } },
        orderBy: { recordedAt: "desc" },
        take: Math.max(200, technicianIds.length * 10),
        select: { technicianId: true, lat: true, lng: true, recordedAt: true },
      })
    : [];
  const lastPosition = new Map<string, { lat: number; lng: number; recordedAt: Date }>();
  for (const position of positions) {
    if (position.technicianId && !lastPosition.has(position.technicianId)) {
      lastPosition.set(position.technicianId, {
        lat: position.lat,
        lng: position.lng,
        recordedAt: position.recordedAt,
      });
    }
  }

  const site = ticket.asset?.site ?? null;
  const requiredSkills = inferRequiredSkills({
    title: ticket.title,
    description: ticket.description,
    errorCode: ticket.errorCode,
    asset: ticket.asset ? { category: ticket.asset.assetType.category } : null,
  });

  const inputs: TechInput[] = technicians.map((tech) => {
    const position = lastPosition.get(tech.id);
    return {
      id: tech.id,
      name: tech.name,
      skills: Array.isArray(tech.skills) ? (tech.skills as string[]) : [],
      certifications: Array.isArray(tech.certifications)
        ? (tech.certifications as string[])
        : [],
      lat: position?.lat ?? tech.lat,
      lng: position?.lng ?? tech.lng,
      status: tech.status,
      rating: tech.rating,
      activeJobs: loadMap.get(tech.id) ?? 0,
      completedJobs: completedByTech.get(tech.id)?.size ?? 0,
      avgResolutionMin: averageResolution(tech.id),
      lastSeenAt: position?.recordedAt.toISOString() ?? null,
    };
  });

  const ranked = rankTechnicians(inputs, {
    requiredSkills,
    requiredCertifications: [],
    siteLat: site?.lat ?? 33.5731,
    siteLng: site?.lng ?? -7.5898,
    priority: ticket.priority,
    slaDueAt: asUtc(ticket.slaDueAt),
  });

  const [tenant, inventory] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, locale: true, settings: true },
    }),
    db.inventoryItem.findMany({
      where: { tenantId, qtyOnHand: { gt: 0 } },
      orderBy: { name: "asc" },
      take: 40,
      select: { sku: true, name: true, unitPrice: true, qtyOnHand: true },
    }),
  ]);
  const tenantSettings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const configuredCurrency =
    typeof tenantSettings.currency === "string" ? tenantSettings.currency.trim() : "";
  const currency = configuredCurrency || (tenant?.locale?.endsWith("TN") ? "TND" : "MAD");
  const laborRateCents =
    typeof tenantSettings.laborRateCents === "number" && tenantSettings.laborRateCents > 0
      ? Math.round(tenantSettings.laborRateCents)
      : 45_000;
  const calloutCents =
    typeof tenantSettings.calloutCents === "number" && tenantSettings.calloutCents >= 0
      ? Math.round(tenantSettings.calloutCents)
      : 15_000;
  const diag = diagnose(ticket.errorCode, `${ticket.title} ${ticket.description}`);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    ticket: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      channel: ticket.channel,
      errorCode: ticket.errorCode,
      slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
      customer: ticket.customer.name,
      site: site
        ? {
            name: site.name,
            city: site.city,
            address: site.address,
            lat: site.lat,
            lng: site.lng,
          }
        : null,
      asset: ticket.asset
        ? {
            name: ticket.asset.name,
            serialNo: ticket.asset.serialNo,
            category: ticket.asset.assetType.category,
            healthScore: ticket.asset.healthScore,
          }
        : null,
      contractTier: ticket.contract?.tier ?? null,
    },
    requiredSkills,
    requiredCertifications: [],
    ranked: ranked.slice(0, 10),
    diagnostics: {
      title: diag.title,
      likelyCauses: diag.likelyCauses,
      steps: diag.steps,
      parts: diag.parts,
      confidence: diag.confidence,
      source: diag.source,
      match: diag.match,
    },
    pricing: {
      currency,
      laborRateCents,
      calloutCents,
      parts: inventory.map((item) => ({
        sku: item.sku,
        name: item.name,
        unitPrice: item.unitPrice,
        qtyOnHand: item.qtyOnHand,
      })),
    },
    operations: {
      tenantName: tenant?.name ?? "Khedma",
      locale: tenant?.locale ?? "fr-MA",
    },
  };
}

export interface AgentDecision {
  technicianId: string;
  summary: string;
  reasons: string[];
  confidence: number | null;
}

export interface AgentInvoiceLine {
  label: string;
  qty: number;
  unitPrice: number;
}

export interface AgentInvoice {
  lines: AgentInvoiceLine[];
  totalCents: number;
  currency: string;
}

export interface AgentReasoningStep {
  step: string;
  detail: string;
}

export interface AgentReview {
  technicianId: string | null;
  summary: string;
  reasons: string[];
  reasoning: AgentReasoningStep[];
  confidence: number | null;
  priority: string | null;
  etaMin: number | null;
  invoice: AgentInvoice | null;
  engine: "factory" | "deterministic";
  runId: string | null;
}

const PRIORITIES: Record<string, true> = {
  P1_CRITICAL: true,
  P2_HIGH: true,
  P3_NORMAL: true,
  P4_LOW: true,
};

function extractJson(text: unknown): unknown {
  if (typeof text !== "string") return null;
  let value = text.trim();
  if (value.startsWith("```")) {
    value = value.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    const parsed = extractJson(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cents(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10_000_000, Math.round(value)));
}

export function parseInvoice(raw: unknown, fallbackCurrency: string): AgentInvoice | null {
  const record = asObject(raw);
  if (!record) return null;
  const rows = Array.isArray(record.lines) ? record.lines : [];
  const lines: AgentInvoiceLine[] = [];
  for (const row of rows.slice(0, 20)) {
    const line = asObject(row);
    if (!line) continue;
    const label = typeof line.label === "string" ? line.label.trim().slice(0, 120) : "";
    const qty =
      typeof line.qty === "number" && Number.isFinite(line.qty)
        ? Math.max(1, Math.min(20, Math.round(line.qty)))
        : 1;
    const unitPrice = cents(line.unitPrice);
    if (!label || unitPrice <= 0) continue;
    lines.push({ label, qty, unitPrice });
  }
  if (lines.length === 0) return null;
  const currency =
    typeof record.currency === "string" && record.currency.trim()
      ? record.currency.trim().slice(0, 8)
      : fallbackCurrency;
  return {
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0),
    currency,
  };
}

export function parseAgentReview(
  payload: unknown,
  fallbackCurrency = "MAD",
): AgentReview | null {
  const record = (payload ?? {}) as Record<string, unknown>;
  const extension = (record.provider_extension ?? {}) as Record<string, unknown>;
  const langchain = (extension.langchain ?? {}) as Record<string, unknown>;
  const values = (langchain.values ?? {}) as Record<string, unknown>;
  const output = (record.output ?? {}) as Record<string, unknown>;

  const candidates = [
    output.message,
    output.value,
    values.review,
    values.decision,
    values.answer,
    record.decision,
    record.review,
    record.output,
  ];
  for (const candidate of candidates) {
    const decision = asObject(candidate);
    if (!decision) continue;
    const rawId =
      decision.recommended_technician_id ?? decision.technicianId ?? decision.technician_id;
    const technicianId =
      typeof rawId === "string" && rawId.trim() ? rawId.trim().slice(0, 64) : null;
    const invoice = parseInvoice(decision.invoice, fallbackCurrency);
    const reasoningRaw = Array.isArray(decision.reasoning) ? decision.reasoning : [];
    const reasoning: AgentReasoningStep[] = [];
    for (const item of reasoningRaw.slice(0, 10)) {
      if (typeof item === "string" && item.trim()) {
        reasoning.push({ step: "Analyse", detail: item.trim().slice(0, 600) });
        continue;
      }
      const step = asObject(item);
      if (!step) continue;
      const detail =
        typeof step.detail === "string"
          ? step.detail.trim().slice(0, 600)
          : typeof step.text === "string"
            ? step.text.trim().slice(0, 600)
            : "";
      const title =
        typeof step.step === "string"
          ? step.step.trim().slice(0, 120)
          : typeof step.title === "string"
            ? step.title.trim().slice(0, 120)
            : "Analyse";
      if (detail || title) reasoning.push({ step: title || "Analyse", detail });
    }
    if (!technicianId && !invoice && reasoning.length === 0) continue;

    const reasons = Array.isArray(decision.reasons)
      ? decision.reasons
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.slice(0, 300))
          .slice(0, 8)
      : [];
    const confidence =
      typeof decision.confidence === "number" && Number.isFinite(decision.confidence)
        ? Math.max(0, Math.min(1, decision.confidence))
        : null;
    const priority =
      typeof decision.priority === "string" && PRIORITIES[decision.priority]
        ? decision.priority
        : null;
    const etaMin =
      typeof decision.etaMin === "number" && Number.isFinite(decision.etaMin)
        ? Math.max(0, Math.min(600, Math.round(decision.etaMin)))
        : null;

    return {
      technicianId,
      summary:
        typeof decision.summary === "string" ? decision.summary.slice(0, 2000) : "",
      reasons,
      reasoning,
      confidence,
      priority,
      etaMin,
      invoice,
      engine: "factory",
      runId: typeof record.run_id === "string" ? record.run_id : null,
    };
  }
  return null;
}

/** Backwards-compatible narrow decision used by the existing dispatch route. */
export function parseAgentDecision(payload: unknown): AgentDecision | null {
  const review = parseAgentReview(payload);
  if (!review?.technicianId) return null;
  return {
    technicianId: review.technicianId,
    summary: review.summary,
    reasons: review.reasons,
    confidence: review.confidence,
  };
}

export interface FactoryCallResult {
  used: boolean;
  fallback: boolean;
  decision: AgentDecision | null;
  review: AgentReview | null;
  error: string | null;
  runId: string | null;
}

/** Compact, token-budgeted context for the model (no raw DB rows, no PII noise). */
export function buildAgentInput(context: DispatchContext) {
  return {
    ticket: context.ticket,
    requiredSkills: context.requiredSkills,
    candidates: context.ranked.slice(0, 6).map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      skills: candidate.skills,
      status: candidate.status,
      rating: candidate.rating,
      activeJobs: candidate.activeJobs,
      completedJobs: candidate.completedJobs ?? 0,
      avgResolutionMin: candidate.avgResolutionMin ?? null,
      km: candidate.km,
      etaMin: candidate.etaMin,
      score: candidate.score,
      skillScore: candidate.skillScore,
      eligible: candidate.eligible,
      reasons: candidate.reasons.slice(0, 4),
    })),
    diagnostics: context.diagnostics,
    pricing: {
      currency: context.pricing.currency,
      laborRateCents: context.pricing.laborRateCents,
      calloutCents: context.pricing.calloutCents,
      parts: context.pricing.parts.slice(0, 15),
    },
    rules: [
      "Choose only a candidate with eligible=true; prefer skills, ETA, workload and history.",
      "Explain the reasoning in French, step by step; the dispatcher reads it before deciding.",
      "Draft an invoice in integer cents: callout + labor (1 to 4 hours) + at most two catalog parts (qty <= 2).",
      "Return ONLY JSON: {technicianId, summary, reasons[], reasoning[{step,detail}], confidence 0..1, priority, etaMin, invoice{lines[{label,qty,unitPrice}],currency}}.",
    ],
  };
}

export async function callFactoryDispatchAgent(
  ticketId: string,
  tenantId: string,
  context: DispatchContext,
): Promise<FactoryCallResult> {
  const base = process.env.FACTORY_GATEWAY_URL?.trim();
  const agentId = process.env.FACTORY_AGENT_ID?.trim();
  const key = process.env.FACTORY_AGENT_KEY?.trim();
  if (!base || !agentId || !key) {
    return {
      used: false,
      fallback: true,
      decision: null,
      review: null,
      error: "AI dispatch is not configured.",
      runId: null,
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(
      `${base.replace(/\/+$/, "")}/api/v1/agents/${encodeURIComponent(agentId)}/runs`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "idempotency-key": `review-${tenantId}-${ticketId}-${Math.floor(Date.now() / 60_000)}`,
        },
        body: JSON.stringify({
          input: {
            ticketId,
            tenantId,
            context: buildAgentInput(context),
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        used: false,
        fallback: true,
        decision: null,
        review: null,
        error: `AI gateway returned HTTP ${response.status}.`,
        runId: null,
      };
    }
    const review = parseAgentReview(payload, context.pricing.currency);
    const decision = review?.technicianId
      ? {
          technicianId: review.technicianId,
          summary: review.summary,
          reasons: review.reasons,
          confidence: review.confidence,
        }
      : null;
    return {
      used: Boolean(review),
      fallback: !review,
      decision,
      review,
      error: review ? null : "The agent returned no usable review.",
      runId:
        (typeof payload.run_id === "string" ? payload.run_id : null) ??
        review?.runId ??
        null,
    };
  } catch (error) {
    return {
      used: false,
      fallback: true,
      decision: null,
      review: null,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "AI review timed out; deterministic review was used."
          : "AI review was unreachable; deterministic review was used.",
      runId: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
