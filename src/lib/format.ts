export function mad(cents: number, currency = "MAD") {
  return `${(cents / 100).toLocaleString("fr-MA", { maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Nouveau",
  QUALIFIED: "Qualifié",
  SCHEDULED: "Planifié",
  EN_ROUTE: "En route",
  ON_SITE: "Sur site",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  INVOICED: "Facturé",
  CLOSED: "Clôturé",
  CANCELLED: "Annulé",
  DRAFT: "Brouillon",
  ASSIGNED: "Assigné",
  DONE: "Terminé",
  APPROVED: "Approuvé",
};

export const PRIORITY_LABEL: Record<string, string> = {
  P1_CRITICAL: "Critique",
  P2_HIGH: "Haute",
  P3_NORMAL: "Normale",
  P4_LOW: "Basse",
};

export const CHANNEL_LABEL: Record<string, string> = {
  PHONE: "Téléphone",
  EMAIL: "Email",
  PORTAL: "Portail client",
  IOT: "Alerte automatique",
  WHATSAPP: "WhatsApp",
};

export const JOB_LABEL: Record<string, string> = {
  INSTALL: "Installation",
  REPAIR: "Réparation",
  PREVENTIVE: "Entretien préventif",
};

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  B2B: "Entreprise",
  B2C: "Particulier",
};

export const CONTRACT_TIER_LABEL: Record<string, string> = {
  GOLD: "Contrat Or",
  SILVER: "Contrat Argent",
  BRONZE: "Contrat Bronze",
};

export const EVENT_LABEL: Record<string, string> = {
  CREATED: "Création",
  STATUS_CHANGED: "Changement de statut",
  ASSIGNED: "Assignation",
  NOTE: "Note",
  SLA_BREACH: "Délai dépassé",
  INVOICED: "Facturé",
  NOTIFIED: "Notification",
};

export const ACTOR_LABEL: Record<string, string> = {
  dispatcher: "Répartiteur",
  system: "Système",
  admin: "Administrateur",
  manager: "Responsable",
  technician: "Technicien",
  client: "Client",
};

/** Turns audit details into a sentence a non-technical person can read. */
export function humanizeDetail(detail: string): string {
  return detail
    .replace(/^Intake\s+/i, "Reçue via ")
    .replace(/\bPORTAL\b/g, "Portail client")
    .replace(/\bPHONE\b/g, "Téléphone")
    .replace(/\bEMAIL\b/g, "Email")
    .replace(/\bIOT\b/g, "Alerte automatique")
    .replace(/\bWHATSAPP\b/g, "WhatsApp")
    .replace(/\bWO\s+(?=WO-)/g, "")
    .replace(/email en log \(SMTP non configuré\)/i, "email enregistré (envoi non configuré)");
}

export function priorityTone(p: string) {
  if (p.includes("P1")) return "bg-red-50 text-red-700 ring-red-200";
  if (p.includes("P2")) return "bg-orange-50 text-orange-700 ring-orange-200";
  if (p.includes("P3")) return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function statusTone(s: string) {
  if (["ON_SITE", "EN_ROUTE"].includes(s)) return "bg-violet-50 text-violet-700 ring-violet-200";
  if (["IN_PROGRESS", "SCHEDULED", "ASSIGNED"].includes(s)) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (["RESOLVED", "DONE", "APPROVED"].includes(s)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["INVOICED", "CLOSED"].includes(s)) return "bg-slate-900 text-white ring-slate-900";
  if (["CANCELLED"].includes(s)) return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}
