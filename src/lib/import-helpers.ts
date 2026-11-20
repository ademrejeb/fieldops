/** Shared import helpers: French/English header aliases, coercions. */

export function normHeader(h: string) {
  return String(h ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function mapRow(row: Record<string, unknown>, aliases: Record<string, string[]>) {
  const normed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) normed[normHeader(k)] = typeof v === "string" ? v.trim() : v;
  const out: Record<string, unknown> = {};
  for (const [field, keys] of Object.entries(aliases)) {
    for (const k of keys) {
      const v = normed[normHeader(k)];
      if (v !== undefined && v !== "") { out[field] = v; break; }
    }
  }
  return out;
}

export function toInt(v: unknown, d = 0) {
  const n = typeof v === "number" ? Math.round(v) : parseInt(String(v ?? "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : d;
}

export function toCentsMAD(v: unknown) {
  if (typeof v === "number") return Math.round(v * 100);
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const f = parseFloat(s);
  return Number.isFinite(f) ? Math.round(f * 100) : 0;
}

export function splitList(v: unknown): string[] {
  return String(v ?? "")
    .split(/[,;/|]/)
    .map((s) => s.trim().toUpperCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

export type BulkSummary = { created: number; updated: number; failed: number; errors: string[] };
export function emptySummary(): BulkSummary {
  return { created: 0, updated: 0, failed: 0, errors: [] };
}
