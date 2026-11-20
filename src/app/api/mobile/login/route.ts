import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { hashToken, newToken } from "@/lib/mobile-auth";
import { clientKey, LIMITS, rateLimit } from "@/lib/rate-limit";
import { ApiError, json, readBody, route } from "@/lib/api";
import { z } from "zod";
import bcrypt from "bcryptjs";

const LoginSchema = z.object({
  email: z.string().email("email invalide"),
  password: z.string().min(1, "mot de passe requis"),
});

const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8DvJ0o2B1F4n3s6L5kQ9pR8tV7wXy2";

/** Mobile login → opaque Bearer token (30 days, revocable server-side). */
export const POST = route(async (req: Request) => {
  if (!rateLimit(clientKey(req, "mobile-login"), LIMITS.mobile.limit, LIMITS.mobile.windowMs).ok) {
    throw new ApiError("Trop de tentatives. Réessayez dans une minute.", 429);
  }
  const tenant = await getTenant();
  const { email, password } = await readBody(req, LoginSchema);
  const user = await db.user.findFirst({
    where: { email: email.toLowerCase().trim(), active: true },
    include: { technician: true },
  });
  const okPwd = await bcrypt.compare(password, user?.passwordH ?? DUMMY_HASH);
  if (!user || !user.passwordH || !okPwd) {
    throw new ApiError("Email ou mot de passe invalide.", 401);
  }
  const raw = newToken();
  const token = await db.apiToken.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      name: "mobile",
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 30 * 86400e3),
    },
  });
  return json({
    token: raw,
    expiresAt: token.expiresAt,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      customerId: user.customerId ?? null,
      technicianId: user.technician?.id ?? null,
    },
  });
});

/** Logout = revoke token. */
export const DELETE = route(async (req: Request) => {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/);
  if (m) await db.apiToken.deleteMany({ where: { tokenHash: hashToken(m[1].trim()) } });
  return json({ ok: true });
});
