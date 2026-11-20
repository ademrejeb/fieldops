/**
 * In-process fixed-window rate limiter.
 *
 * Note: per-instance only (fine for a single Node server / demo). For multi-instance
 * production, swap the Map for Redis (Upstash) behind the same interface.
 */
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (now > b.resetAt) store.delete(k);
}

export type RateResult = { ok: boolean; remaining: number; retryAfterMs: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}

/** Best-effort client identifier (proxy-aware). Handles Fetch Headers and Node header maps. */
export function clientKey(req: Request | { headers?: unknown }, scope: string): string {
  const h = (req as { headers?: unknown } | undefined)?.headers as
    | { get?: (n: string) => string | null }
    | Record<string, string | string[] | undefined>
    | undefined;

  const read = (name: string): string | undefined => {
    if (!h) return undefined;
    if (typeof (h as { get?: unknown }).get === "function") {
      return (h as { get: (n: string) => string | null }).get(name) ?? undefined;
    }
    const rec = h as Record<string, string | string[] | undefined>;
    const v = rec[name] ?? rec[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };

  const ip =
    read("x-forwarded-for")?.split(",")[0]?.trim() ||
    read("x-real-ip") ||
    read("cf-connecting-ip") ||
    "local";
  return `${scope}:${ip}`;
}

// Coarse route wrappers for the sensitive endpoints.
export const LIMITS = {
  login: { limit: 8, windowMs: 60_000 },
  ingest: { limit: 240, windowMs: 60_000 },
  mobile: { limit: 10, windowMs: 60_000 },
} as const;
