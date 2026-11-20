/**
 * Diagnostics KB — curated troubleshooting entries (OEM manuals + field history).
 * RAG-ready shape: { code, assetCategory, title, causes[], steps[], parts[], confidence, source }
 * Later: replace `searchKb()` internals with pgvector/Elasticsearch — same return type.
 */

export type DiagEntry = {
  code: string;
  assetCategory: string; // ELEVATOR | HVAC | SECURITY | GENERAL
  title: string;
  likelyCauses: string[];
  steps: string[];
  parts: { sku: string; label: string }[];
  confidence: number; // 0..1 (historical fix rate)
  source: string; // manual ref
};

export const DIAG_KB: DiagEntry[] = [
  {
    code: "E30",
    assetCategory: "ELEVATOR",
    title: "Défaut capteur porte — porte bloquée",
    likelyCauses: ["Seuil (sill) encrassé", "Faisceau porte coupé/pincé (harness X)", "Capteur désaligné après choc"],
    steps: [
      "1. Consigner + verrouiller la puissance (lockout) — photo avant.",
      "2. Nettoyer le seuil + vérifier corps étranger rail porte.",
      "3. Contrôler le faisceau porte (continuité) au niveau du 4e étage.",
      "4. Réaligner le capteur, effacer le code, faire 3 cycles d'essai.",
      "5. Photo après + essai avec client.",
    ],
    parts: [{ sku: "KONE-SENS-DOOR", label: "Door sensor KONE" }, { sku: "CABLE-HARNESS-X", label: "Harness X" }],
    confidence: 0.78,
    source: "KONE MonoSpace manuel §4.2 + 41 interventions (Casa)",
  },
  {
    code: "U4",
    assetCategory: "HVAC",
    title: "VRV — surchauffe / débit faible",
    likelyCauses: ["Filtre encrassé", "Ventilateur / courroie", "Charge réfrigérant basse"],
    steps: [
      "1. Relever T° refoulement + pression — photo plaque.",
      "2. Remplacer/nettoyer le filtre VRV.",
      "3. Contrôler ventilateur + alarmes carte.",
      "4. Si persistant: recherche de fuite R410A.",
    ],
    parts: [{ sku: "DKN-FILTER-VRV", label: "Filtre VRV Daikin" }],
    confidence: 0.74,
    source: "Daikin VRV install guide + 27 interventions",
  },
  {
    code: "F-12",
    assetCategory: "SECURITY",
    title: "CCTV — perte signal caméra",
    likelyCauses: ["Alimentation POE", "Connecteur RJ45 oxydé", "Câble sectionné"],
    steps: ["1. Tester POE au switch.", "2. Refaire RJ45 + tester continuité.", "3. Swap caméra test."],
    parts: [],
    confidence: 0.66,
    source: "Hikvision troubleshooting",
  },
];

export type DiagResult = DiagEntry & { match: "exact" | "fuzzy" | "symptom" | "generic"; historyNote?: string };

const SYMPTOM_INDEX: { keys: string[]; code: string }[] = [
  { keys: ["bloqué", "porte", "ascenseur", "stuck", "door", "coincé"], code: "E30" },
  { keys: ["surchauffe", "vrv", "clim", "débit", "chaud", "filtre", "vibration"], code: "U4" },
  { keys: ["caméra", "cctv", "signal", "vidéo"], code: "F-12" },
];

export function diagnose(errorCode: string, symptom = ""): DiagResult {
  const code = (errorCode ?? "").trim().toUpperCase();
  const exact = DIAG_KB.find((e) => e.code === code);
  if (exact && code) return { ...exact, match: "exact" };
  if (code) {
    const fuzzy = DIAG_KB.find((e) => e.code.includes(code) || code.includes(e.code));
    if (fuzzy) return { ...fuzzy, match: "fuzzy" };
  }
  const s = symptom.toLowerCase();
  for (const idx of SYMPTOM_INDEX) {
    if (idx.keys.some((k) => s.includes(k))) {
      const e = DIAG_KB.find((x) => x.code === idx.code)!;
      return { ...e, match: "symptom" };
    }
  }
  return {
    code: code || "—",
    assetCategory: "GENERAL",
    title: "Diagnostic générique — qualification requise",
    likelyCauses: ["À qualifier sur site (photos + mesures)"],
    steps: ["1. Sécuriser.", "2. Photos avant.", "3. Relever codes + mesures.", "4. Escalader au senior si doute."],
    parts: [],
    confidence: 0.3,
    source: "Procédure standard FieldOps",
    match: "generic",
  };
}
