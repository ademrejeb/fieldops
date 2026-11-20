/**
 * Environment validation.
 *
 * Fail fast in production (misconfiguration should not serve traffic), warn loudly in dev.
 * Import for side effects from server entry points (auth).
 */
const REQUIRED = ["NEXTAUTH_SECRET"] as const;
const RECOMMENDED = ["NEXTAUTH_URL", "APP_URL", "DATABASE_URL"] as const;

type Key = (typeof REQUIRED)[number] | (typeof RECOMMENDED)[number] | string;

function read(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

const missingRequired = REQUIRED.filter((k) => !read(k));
const missingRecommended = RECOMMENDED.filter((k) => !read(k));

if (process.env.NODE_ENV === "production" && missingRequired.length > 0) {
  throw new Error(
    `Configuration invalide — variables requises manquantes: ${missingRequired.join(", ")}. ` +
      `Voir .env.example.`
  );
}
if (missingRequired.length > 0 || missingRecommended.length > 0) {
  console.warn(
    `[env] variables manquantes (${[...missingRequired, ...missingRecommended].join(", ")}). ` +
      `Des valeurs de développement sont utilisées.`
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  appName: read("NEXT_PUBLIC_APP_NAME") ?? "FieldOps FSM",
  appUrl: read("APP_URL") ?? read("NEXTAUTH_URL") ?? "http://localhost:3000",
  authSecret: read("NEXTAUTH_SECRET") ?? "insecure-dev-secret-do-not-use-in-prod",
  databaseUrl: read("DATABASE_URL") ?? "file:./prisma/dev.db",
  demoTenantSlug: read("DEMO_TENANT_SLUG") ?? "demo-casablanca",
  basacore: {
    issuer: read("BASACORE_ISSUER") ?? "http://localhost:8000",
    clientId: read("BASACORE_CLIENT_ID"),
    clientSecret: read("BASACORE_CLIENT_SECRET"),
    tenantHint: read("BASACORE_TENANT_HINT"),
    /** Comma-separated `basacore-tenant-slug=local-tenant-slug` pairs. */
    tenantMap: read("BASACORE_TENANT_MAP") ?? "",
  },
  smtp: {
    host: read("SMTP_HOST"),
    port: Number(read("SMTP_PORT") ?? 587),
    user: read("SMTP_USER"),
    pass: read("SMTP_PASS"),
    from: read("SMTP_FROM") ?? "FieldOps <no-reply@fieldops.ma>",
  },
};

export function envStatus(): { key: string; present: boolean; level: "required" | "recommended" }[] {
  return [
    ...REQUIRED.map((k) => ({ key: k as string, present: Boolean(read(k)), level: "required" as const })),
    ...RECOMMENDED.map((k) => ({ key: k as string, present: Boolean(read(k)), level: "recommended" as const })),
  ];
}

export type EnvKey = Key;
