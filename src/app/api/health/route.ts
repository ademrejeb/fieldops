import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

/** Liveness + readiness probe (Docker/K8s/uptime monitors). */
export async function GET() {
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};
  const t = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, ms: Date.now() - t };
  } catch (e) {
    checks.database = { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : "unknown" };
  }

  const healthy = Object.values(checks).every((c) => c.ok);
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "fieldops-fsm",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
