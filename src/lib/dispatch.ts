import { etaMinutes, haversineKm } from "./geo";

export type TechInput = {
  id: string;
  name: string;
  skills: string[];
  certifications: string[];
  lat: number;
  lng: number;
  status: string; // AVAILABLE | ON_JOB | OFFLINE
  rating: number;
  activeJobs: number;
  completedJobs?: number;
  avgResolutionMin?: number | null;
  lastSeenAt?: string | null;
};

export type JobInput = {
  requiredSkills: string[];
  siteLat: number;
  siteLng: number;
  priority: "P1_CRITICAL" | "P2_HIGH" | "P3_NORMAL" | "P4_LOW";
  slaDueAt: Date | null;
  trafficFactor?: number;
  requiredCertifications?: string[];
};

export type RankedTech = TechInput & {
  km: number;
  etaMin: number;
  skillScore: number; // 0..1
  score: number; // 0..100
  reasons: string[];
  eligible: boolean;
};

const PRIORITY_W = { P1_CRITICAL: 1.0, P2_HIGH: 0.75, P3_NORMAL: 0.5, P4_LOW: 0.3 } as const;

function normSkills(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.toUpperCase());
  return [];
}

/**
 * Dispatch scoring: skills × proximity/ETA × SLA urgency × availability.
 * Pure + deterministic — same input → same ranking (testable, RAG-ready later).
 * Weights: skill 0.40, ETA 0.30, availability 0.20, rating 0.10.
 * P1 urgency boosts nearby+available techs via ETA weight scaling.
 */
export function rankTechnicians(techs: TechInput[], job: JobInput): RankedTech[] {
  const now = Date.now();
  const hoursToSla = job.slaDueAt ? Math.max(0, (job.slaDueAt.getTime() - now) / 3600e3) : 72;
  const urgency = Math.min(1, PRIORITY_W[job.priority] * (hoursToSla <= 2 ? 1.3 : hoursToSla <= 8 ? 1.1 : 1.0));
  const req = job.requiredSkills.map((s) => s.toUpperCase());

  return techs
    .map((t) => {
      const skills = normSkills(t.skills);
      const matched = req.length === 0 ? 1 : req.filter((r) => skills.some((s) => s.includes(r) || r.includes(s))).length / req.length;
      const km = haversineKm(t.lat, t.lng, job.siteLat, job.siteLng);
      const etaMin = etaMinutes(km, job.trafficFactor ?? 1.25);
      const etaScore = Math.max(0, 1 - etaMin / 90); // 90min+ → 0
      const availScore = t.status === "AVAILABLE" ? 1 : t.status === "ON_JOB" ? 0.35 : 0;
      const loadPenalty = Math.min(0.4, t.activeJobs * 0.12);
      const ratingScore = Math.min(1, t.rating / 5);
      const completed = Math.max(0, t.completedJobs ?? 0);
      const experienceScore = Math.min(1, completed / 20);
      const avgResolution = t.avgResolutionMin ?? null;
      const efficiencyScore =
        avgResolution && avgResolution > 0
          ? Math.max(0, Math.min(1, 120 / Math.max(avgResolution, 15)))
          : 0.5;
      const lastSeenHours = t.lastSeenAt
        ? Math.max(0, (now - new Date(t.lastSeenAt).getTime()) / 3600e3)
        : null;
      const freshnessPenalty =
        lastSeenHours === null ? 0 : Math.min(0.15, (lastSeenHours / 24) * 0.15);

      // Urgent P1: ETA matters more (up to +50%)
      const etaW = 0.26 * (1 + urgency * 0.5);
      const skillW = 0.34;
      const availW = 0.18;
      const ratingW = 0.08;
      const experienceW = 0.08;
      const efficiencyW = 0.06;
      const total = skillW + etaW + availW + ratingW + experienceW + efficiencyW;
      const score =
        ((skillW * matched +
          etaW * etaScore +
          availW * Math.max(0, availScore - loadPenalty - freshnessPenalty) +
          ratingW * ratingScore +
          experienceW * experienceScore +
          efficiencyW * efficiencyScore) /
          total) *
        100;

      const reasons: string[] = [];
      if (matched >= 1) reasons.push("Compétences adaptées");
      else if (matched > 0) reasons.push(`Compétence partielle (${Math.round(matched * 100)} %)`);
      else if (req.length) reasons.push("Compétence manquante");
      reasons.push(`${km.toFixed(1)} km · ~${etaMin} min de trajet`);
      if (t.status !== "AVAILABLE") reasons.push(t.status === "ON_JOB" ? "Déjà en mission" : "Hors ligne");
      if (t.activeJobs > 1) reasons.push(`${t.activeJobs} missions en cours`);
      if (completed > 0) reasons.push(`${completed} missions terminées`);
      if (avgResolution) reasons.push(`~${Math.round(avgResolution)} min de résolution moyenne`);
      if (hoursToSla <= 2) reasons.push("Échéance proche — priorité à la proximité");

      return {
        ...t,
        km: Math.round(km * 10) / 10,
        etaMin,
        skillScore: Math.round(matched * 100) / 100,
        score: Math.round(score * 10) / 10,
        reasons,
        eligible: t.status !== "OFFLINE" && (req.length === 0 || matched > 0),
      };
    })
    .sort((a, b) => b.score - a.score);
}
