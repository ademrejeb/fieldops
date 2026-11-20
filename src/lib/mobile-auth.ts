import { createHash, randomBytes } from "crypto";
import { db } from "./db";

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(t: string) {
  return createHash("sha256").update(t).digest("hex");
}

/** Mobile Bearer auth: opaque token (hashed at rest, 30d expiry, revocable). */
export async function mobileSession(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/);
  if (!m) return null;
  const tok = await db.apiToken.findUnique({
    where: { tokenHash: hashToken(m[1].trim()) },
    include: { user: { include: { technician: true } }, tenant: true },
  });
  if (!tok) return null;
  if (tok.expiresAt && tok.expiresAt < new Date()) return null;
  await db.apiToken.update({ where: { id: tok.id }, data: { lastUsedAt: new Date() } });
  return tok;
}

/** Tracker ingest key auth: matches tenant settings.ingestKey. */
export async function tenantByIngestKey(key: string) {
  if (!key) return null;
  const tenants = await db.tenant.findMany({ select: { id: true, settings: true } });
  for (const t of tenants) {
    const s = (t.settings ?? {}) as Record<string, unknown>;
    if (typeof s.ingestKey === "string" && s.ingestKey === key) {
      return db.tenant.findUnique({ where: { id: t.id } });
    }
  }
  return null;
}
