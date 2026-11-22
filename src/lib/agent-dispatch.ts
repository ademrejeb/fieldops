import { db } from "./db";
import { rankTechnicians, type JobInput, type RankedTech, type TechInput } from "./dispatch";

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
  };
}

export interface AgentDecision {
  technicianId: string;
  summary: string;
  reasons: string[];
  confidence: number | null;
}

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

export function parseAgentDecision(payload: unknown): AgentDecision | null {
  const record = (payload ?? {}) as Record<string, unknown>;
  const extension = (record.provider_extension ?? {}) as Record<string, unknown>;
  const langchain = (extension.langchain ?? {}) as Record<string, unknown>;
  const values = (langchain.values ?? {}) as Record<string, unknown>;
  const output = (record.output ?? {}) as Record<string, unknown>;
  const candidates = [output.message, values.decision, record.decision];
  for (const candidate of candidates) {
    const parsed = extractJson(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const decision = parsed as Record<string, unknown>;
    const rawId =
      decision.recommended_technician_id ?? decision.technicianId ?? decision.technician_id;
    if (typeof rawId !== "string" || !rawId.trim()) continue;
    const reasons = Array.isArray(decision.reasons)
      ? decision.reasons.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [];
    const confidence =
      typeof decision.confidence === "number" && Number.isFinite(decision.confidence)
        ? Math.max(0, Math.min(1, decision.confidence))
        : null;
    return {
      technicianId: rawId.trim(),
      summary:
        typeof decision.summary === "string" ? decision.summary.slice(0, 2000) : "",
      reasons,
      confidence,
    };
  }
  return null;
}

export interface FactoryCallResult {
  used: boolean;
  fallback: boolean;
  decision: AgentDecision | null;
  error: string | null;
  runId: string | null;
}

export async function callFactoryDispatchAgent(
  ticketId: string,
  tenantId: string,
): Promise<FactoryCallResult> {
  const base = process.env.FACTORY_GATEWAY_URL?.trim();
  const agentId = process.env.FACTORY_AGENT_ID?.trim();
  const key = process.env.FACTORY_AGENT_KEY?.trim();
  if (!base || !agentId || !key) {
    return {
      used: false,
      fallback: true,
      decision: null,
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
          // Coarse bucket: double-clicks reuse the run, but a transient failure
          // can be retried on the next minute instead of being cached forever.
          "idempotency-key": `dispatch-${tenantId}-${ticketId}-${Math.floor(Date.now() / 60_000)}`,
        },
        body: JSON.stringify({ input: { ticketId, tenantId } }),
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
        error: `AI gateway returned HTTP ${response.status}.`,
        runId: null,
      };
    }
    return {
      used: true,
      fallback: false,
      decision: parseAgentDecision(payload),
      error: null,
      runId: typeof payload.run_id === "string" ? payload.run_id : null,
    };
  } catch (error) {
    return {
      used: false,
      fallback: true,
      decision: null,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "AI dispatch timed out; deterministic ranking was used."
          : "AI dispatch was unreachable; deterministic ranking was used.",
      runId: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
