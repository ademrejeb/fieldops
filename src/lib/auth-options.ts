import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientKey, LIMITS, rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import {
  BasacoreProvider,
  basacoreConfig,
  basacoreIdentity,
  provisionBasacoreUser,
  refreshBasacoreTokens,
  type BasacoreProfile,
} from "@/lib/basacore";

/* Constant-cost dummy hash so unknown emails take the same time as known ones (anti-enumeration). */
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8DvJ0o2B1F4n3s6L5kQ9pR8tV7wXy2";

export const authOptions: NextAuthOptions = {
  secret: env.authSecret,
  session: { strategy: "jwt", maxAge: 12 * 3600 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(creds, req) {
        const email = (creds?.email ?? "").toLowerCase().trim();
        if (!email || !creds?.password) return null;

        // Throttle per IP to blunt credential stuffing (8 attempts / min).
        const key = clientKey(req, "login");
        if (!rateLimit(key, LIMITS.login.limit, LIMITS.login.windowMs).ok) return null;

        const user = await db.user.findFirst({ where: { email, active: true }, include: { tenant: true } });
        const ok = await bcrypt.compare(creds.password, user?.passwordH ?? DUMMY_HASH);
        if (!user || !user.passwordH || !ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // passed through jwt callback below
          role: user.role,
          tenantId: user.tenantId,
          customerId: user.customerId,
          tenantSlug: user.tenant.slug,
          tenantName: user.tenant.name,
        };
      },
    }),
    // Only registered when BASACORE_CLIENT_ID / BASACORE_CLIENT_SECRET exist.
    ...(basacoreConfig.enabled ? [BasacoreProvider] : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // ---- Basacore sign-in: provision the local user, store tokens server-side
      if (account?.provider === "basacore" && profile) {
        const basacoreProfile = profile as BasacoreProfile;
        const local = await provisionBasacoreUser(basacoreProfile);

        token.role = local.role;
        token.tenantId = local.tenantId;
        token.tenantName = local.tenantName;
        token.tenantSlug = local.tenantSlug;
        token.customerId = local.customerId;
        token.authProvider = "basacore";

        // Sensible identity only — never tokens — may reach the client session.
        token.basacore = basacoreIdentity(basacoreProfile);

        // Kept in the encrypted NextAuth JWT, never exposed to the browser session.
        token.basacoreAccessToken = account.access_token;
        token.basacoreRefreshToken = account.refresh_token;
        token.basacoreExpiresAt = account.expires_at;
        return token;
      }

      // ---- Credentials sign-in
      if (user) {
        token.role = (user as { role?: string }).role;
        token.tenantId = (user as { tenantId?: string }).tenantId;
        token.tenantName = (user as { tenantName?: string }).tenantName;
        token.tenantSlug = (user as { tenantSlug?: string }).tenantSlug;
        token.customerId = (user as { customerId?: string | null }).customerId ?? null;
        token.authProvider = "credentials";
        return token;
      }

      // ---- Subsequent session reads: refresh the Basacore access token when close to expiry
      if (token.authProvider === "basacore" && token.basacoreRefreshToken) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = token.basacoreExpiresAt ?? 0;
        if (expiresAt - 60 <= now) {
          try {
            const refreshed = await refreshBasacoreTokens(token.basacoreRefreshToken);
            token.basacoreAccessToken = refreshed.access_token;
            if (refreshed.refresh_token) token.basacoreRefreshToken = refreshed.refresh_token;
            token.basacoreExpiresAt = now + refreshed.expires_in;
            token.basacoreRefreshError = undefined;
          } catch {
            // Keep the session usable; the next request will try again.
            token.basacoreRefreshError = true;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.tenantName = token.tenantName;
        session.user.tenantSlug = token.tenantSlug;
        session.user.customerId = token.customerId ?? null;
        session.user.authProvider = token.authProvider ?? "credentials";
        session.user.basacore = token.basacore ?? null;
        session.user.basacoreExpiresAt = token.basacoreExpiresAt;
        session.user.basacoreRefreshError = token.basacoreRefreshError ?? false;
      }
      return session;
    },
  },
};

export const ROLE_HIERARCHY: Record<string, number> = {
  CLIENT: 1,
  TECHNICIAN: 2,
  DISPATCHER: 3,
  MANAGER: 4,
  ADMIN: 5,
};

export function canRole(userRole: string | undefined, min: keyof typeof ROLE_HIERARCHY) {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= ROLE_HIERARCHY[min];
}
