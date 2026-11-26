import "next-auth";
import type { BasacoreIdentity } from "@/lib/basacore";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      tenantId?: string;
      tenantName?: string;
      tenantSlug?: string;
      customerId?: string | null;
      authProvider?: "credentials" | "basacore";
      /** Verified Basacore claims (no tokens). */
      basacore?: BasacoreIdentity | null;
      /** Unix seconds; the access token is refreshed server-side when near expiry. */
      basacoreExpiresAt?: number;
      basacoreRefreshError?: boolean;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string;
    tenantName?: string;
    tenantSlug?: string;
    customerId?: string | null;
    authProvider?: "credentials" | "basacore";
    basacore?: BasacoreIdentity | null;
    /** Server-side only: never copied onto the session. */
    basacoreAccessToken?: string;
    basacoreRefreshToken?: string;
    basacoreExpiresAt?: number;
    basacoreRefreshError?: boolean;
  }
}
