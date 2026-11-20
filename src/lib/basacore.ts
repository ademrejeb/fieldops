/**
 * Basacore identity provider integration.
 *
 * Basacore is the company identity gateway: the browser signs in on Basacore,
 * which returns an authorization code plus an OIDC ID token. This module owns
 * everything that is specific to Basacore:
 *
 * - provider configuration (issuer, client credentials, tenant hint),
 * - mapping the Basacore tenant to a local FieldOps tenant,
 * - just-in-time provisioning of the local `User` row,
 * - mapping Basacore roles to the local role enum,
 * - refreshing tokens with the stored refresh token.
 *
 * Tokens stay server-side (NextAuth JWT). Only non-sensitive claims are copied
 * onto the session by `auth-options.ts`.
 */
import type { Role } from "@prisma/client";
import type { OAuthConfig } from "next-auth/providers/oauth";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Claims Basacore puts in the ID token (verified by NextAuth/openid-client). */
export type BasacoreProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  tenant_id?: string;
  tenant_slug?: string;
  app_id?: string;
  client_id?: string;
  roles?: string[];
  permissions?: string[];
  sid?: string;
  auth_time?: number;
  amr?: string[];
};

/** Non-sensitive identity snapshot exposed to the UI through the session. */
export type BasacoreIdentity = {
  sub: string;
  email?: string;
  tenantId?: string;
  tenantSlug?: string;
  appId?: string;
  clientId?: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  authTime?: number;
  amr: string[];
};

export const basacoreConfig = {
  issuer: env.basacore.issuer.replace(/\/+$/, ""),
  clientId: env.basacore.clientId,
  clientSecret: env.basacore.clientSecret,
  tenantHint: env.basacore.tenantHint,
  scopes: "openid profile email offline_access",
  /** Enabled only when both client credentials are present. */
  get enabled() {
    return Boolean(this.clientId && this.clientSecret);
  },
};

/**
 * Basacore tenant roles → FieldOps roles. The first recognised role wins, so
 * an owner/admin maps to ADMIN and an unknown role falls back to DISPATCHER.
 */
const ROLE_MAP: Record<string, Role> = {
  platform_admin: "ADMIN",
  tenant_owner: "ADMIN",
  tenant_admin: "ADMIN",
  tenant_manager: "MANAGER",
  tenant_dispatcher: "DISPATCHER",
  tenant_technician: "TECHNICIAN",
  tenant_viewer: "CLIENT",
  tenant_client: "CLIENT",
};

export function mapBasacoreRole(roles: string[] | undefined): Role {
  for (const role of roles ?? []) {
    const mapped = ROLE_MAP[role.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  return "DISPATCHER";
}

/**
 * Resolve the local tenant for a Basacore tenant slug.
 *
 * `BASACORE_TENANT_MAP` holds comma-separated `basacore=local` pairs. Unknown
 * tenants fall back to `DEMO_TENANT_SLUG`, which keeps the seeded demo data
 * visible for the single-tenant deployment.
 */
export function resolveLocalTenantSlug(basacoreTenantSlug: string | undefined): string {
  for (const pair of env.basacore.tenantMap.split(",")) {
    const [from, to] = pair.split("=").map((value) => value.trim());
    if (from && to && from === basacoreTenantSlug) return to;
  }
  return env.demoTenantSlug;
}

export type ProvisionedBasacoreUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  customerId: string | null;
};

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Create (or update) the local FieldOps user for a verified Basacore identity.
 *
 * Local users are keyed by `(tenantId, email)`. SSO users are created with an
 * empty password hash, so the credentials provider can never authenticate
 * them. An existing user keeps their local role (manual grants are not
 * clobbered); only the display name is kept in sync.
 */
export async function provisionBasacoreUser(
  profile: BasacoreProfile
): Promise<ProvisionedBasacoreUser> {
  const email = (profile.email ?? profile.preferred_username ?? "").toLowerCase().trim();
  if (!email) throw new Error("Basacore did not return an email address.");

  const slug = resolveLocalTenantSlug(profile.tenant_slug);
  const tenant = await db.tenant.upsert({
    where: { slug },
    update: {},
    create: {
      name: titleFromSlug(slug) || slug,
      slug,
      industry: "HVAC",
      locale: "fr-MA",
    },
  });

  const name = profile.name?.trim() || email.split("@")[0];
  const existing = await db.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });

  if (existing && !existing.active) {
    throw new Error("This account is disabled in FieldOps.");
  }

  const user = existing
    ? existing.name === name
      ? existing
      : await db.user.update({ where: { id: existing.id }, data: { name } })
    : await db.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name,
          role: mapBasacoreRole(profile.roles),
          passwordH: "",
        },
      });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    customerId: user.customerId ?? null,
  };
}

/** Build the non-sensitive identity snapshot stored on the session. */
export function basacoreIdentity(profile: BasacoreProfile): BasacoreIdentity {
  return {
    sub: profile.sub,
    email: profile.email,
    tenantId: profile.tenant_id,
    tenantSlug: profile.tenant_slug,
    appId: profile.app_id,
    clientId: profile.client_id,
    roles: profile.roles ?? [],
    permissions: profile.permissions ?? [],
    sessionId: profile.sid,
    authTime: profile.auth_time,
    amr: profile.amr ?? [],
  };
}

/** NextAuth OAuth provider for Basacore (authorization code + PKCE + nonce). */
export const BasacoreProvider: OAuthConfig<BasacoreProfile> = {
  id: "basacore",
  name: "Basacore",
  type: "oauth",
  wellKnown: `${basacoreConfig.issuer}/.well-known/openid-configuration`,
  clientId: basacoreConfig.clientId ?? "",
  clientSecret: basacoreConfig.clientSecret ?? "",
  authorization: {
    params: {
      scope: basacoreConfig.scopes,
      ...(basacoreConfig.tenantHint ? { tenant: basacoreConfig.tenantHint } : {}),
    },
  },
  idToken: true,
  checks: ["pkce", "state", "nonce"],
  client: { token_endpoint_auth_method: "client_secret_post" },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name ?? profile.preferred_username ?? profile.email ?? profile.sub,
      email: profile.email ?? null,
      image: null,
    };
  },
};

// ------------------------------------------------------------------------ token refresh

type BasacoreDiscovery = {
  issuer: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
};

let discoveryCache: { fetchedAt: number; document: BasacoreDiscovery } | null = null;
const DISCOVERY_TTL_MS = 5 * 60 * 1000;

/** Fetch (and briefly cache) the Basacore discovery document. */
export async function basacoreDiscovery(): Promise<BasacoreDiscovery> {
  if (discoveryCache && Date.now() - discoveryCache.fetchedAt < DISCOVERY_TTL_MS) {
    return discoveryCache.document;
  }
  const response = await fetch(
    `${basacoreConfig.issuer}/.well-known/openid-configuration`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(`Basacore discovery failed (${response.status}).`);
  }
  const document = (await response.json()) as BasacoreDiscovery;
  if (!document.token_endpoint) {
    throw new Error("Basacore discovery document has no token_endpoint.");
  }
  discoveryCache = { fetchedAt: Date.now(), document };
  return document;
}

/**
 * Exchange a refresh token for a fresh access token.
 *
 * Basacore rotates refresh tokens; callers must persist the returned
 * `refresh_token` when it changes.
 */
export async function refreshBasacoreTokens(refreshToken: string): Promise<TokenResponse> {
  const { token_endpoint } = await basacoreDiscovery();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: basacoreConfig.clientId ?? "",
    client_secret: basacoreConfig.clientSecret ?? "",
  });

  const response = await fetch(token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Basacore token refresh failed (${response.status}).`);
  }
  return (await response.json()) as TokenResponse;
}
