import { db } from "./db";

export const DEMO_TENANT_SLUG =
  (process.env.DEMO_TENANT_SLUG ?? "demo-casablanca").trim() || "demo-casablanca";

/** Resolve a tenant from a public, tenant-scoped URL (`/t/{slug}/...`). */
export async function getTenantBySlug(slug: string | undefined | null) {
  if (!slug) return null;
  return db.tenant.findUnique({ where: { slug } });
}

/** Single-tenant demo resolver. Production: resolve from subdomain / JWT. */
export async function getTenant() {
  let tenant = await db.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
  });
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: "Demo Casablanca",
        slug: DEMO_TENANT_SLUG,
        industry: "ELEVATOR_HVAC",
        locale: "fr-MA",
      },
    });
  }
  return tenant;
}

export function nextNumber(prefix: string, n: number) {
  return `${prefix}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
}
