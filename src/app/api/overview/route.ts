import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { customerScope } from "@/lib/require-auth";
import { json, route } from "@/lib/api";

export const dynamic = "force-dynamic";

const HOT: ("RESOLVED" | "INVOICED" | "CLOSED" | "CANCELLED")[] = ["RESOLVED", "INVOICED", "CLOSED", "CANCELLED"];
const DONE: ("RESOLVED" | "INVOICED" | "CLOSED")[] = ["RESOLVED", "INVOICED", "CLOSED"];

/** Lightweight live KPIs for the shell (topbar/sidebar). Role-scoped. */
export const GET = route(async () => {
  const tenant = await getTenant();
  const { scopedCustomerId } = await customerScope();
  const scope = scopedCustomerId ? { customerId: scopedCustomerId } : {};
  const riskAt = new Date(Date.now() + 4 * 3600e3);

  const [open, p1, slaRisk, techsOnline, techsTotal, resolved] = await Promise.all([
    db.ticket.count({ where: { tenantId: tenant.id, ...scope, status: { notIn: HOT } } }),
    db.ticket.count({ where: { tenantId: tenant.id, ...scope, priority: "P1_CRITICAL", status: { notIn: HOT } } }),
    db.ticket.count({ where: { tenantId: tenant.id, ...scope, slaDueAt: { lt: riskAt }, status: { notIn: HOT } } }),
    db.technician.count({ where: { tenantId: tenant.id, status: { in: ["ON_JOB", "AVAILABLE"] } } }),
    db.technician.count({ where: { tenantId: tenant.id } }),
    db.ticket.count({ where: { tenantId: tenant.id, ...scope, status: { in: DONE } } }),
  ]);

  // SLA compliance = closed tickets that did NOT breach their SLA window.
  const closed = await db.ticket.findMany({
    where: { tenantId: tenant.id, ...scope, status: { in: DONE } },
    select: { slaBreached: true },
    take: 500,
  });
  const breached = closed.filter((t) => t.slaBreached).length;
  const slaCompliance = closed.length ? Math.round((1 - breached / closed.length) * 100) : 100;

  return json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, industry: tenant.industry },
    open, p1, slaRisk, techsOnline, techsTotal, resolved, slaCompliance,
    generatedAt: new Date().toISOString(),
  });
});
