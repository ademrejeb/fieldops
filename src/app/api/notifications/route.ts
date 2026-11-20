import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export type Notif = {
  id: string;
  kind: "SLA" | "P1" | "STOCK" | "BILLING" | "NEW";
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  detail: string;
  href: string;
  at: string;
};

/** Live ops alerts: SLA risk, unassigned P1, low stock, overdue bills, stale NEW. */
export async function GET() {
  const tenant = await getTenant();
  const session = await getServerSession(authOptions);
  const scope = session?.user?.role === "CLIENT" ? session.user.customerId ?? null : null;
  const cust = scope ? { customerId: scope } : {};
  const now = Date.now();
  const items: Notif[] = [];

  const [sla, p1bare, stale, low, overdue] = await Promise.all([
    db.ticket.findMany({
      where: { tenantId: tenant.id, ...cust, slaDueAt: { lt: new Date(now + 4 * 3600e3) }, status: { notIn: ["RESOLVED", "INVOICED", "CLOSED", "CANCELLED"] } },
      take: 5, orderBy: { slaDueAt: "asc" },
    }),
    db.ticket.findMany({
      where: { tenantId: tenant.id, ...cust, priority: "P1_CRITICAL", status: { notIn: ["RESOLVED", "INVOICED", "CLOSED", "CANCELLED"] }, workOrders: { none: {} } },
      take: 5, orderBy: { createdAt: "desc" },
    }),
    db.ticket.findMany({
      where: { tenantId: tenant.id, ...cust, status: "NEW", createdAt: { lt: new Date(now - 2 * 3600e3) } },
      take: 5, orderBy: { createdAt: "asc" },
    }),
    db.inventoryItem.findMany({ where: { tenantId: tenant.id }, take: 200 }),
    db.invoice.findMany({
      where: { tenantId: tenant.id, ...(scope ? { customerId: scope } : {}), status: "OVERDUE" },
      include: { customer: true }, take: 5, orderBy: { dueAt: "asc" },
    }),
  ]);

  for (const t of sla) {
    const h = Math.max(0, (new Date(t.slaDueAt!).getTime() - now) / 3600e3);
    items.push({
      id: `sla-${t.id}`, kind: "SLA", severity: h < 1 ? "critical" : "high",
      title: h < 1 ? `Délai dépassé — ${t.number}` : `À traiter dans ${h.toFixed(1)} h — ${t.number}`,
      detail: t.title, href: `/tickets/${t.id}`, at: t.slaDueAt!.toISOString(),
    });
  }
  for (const t of p1bare) {
    items.push({
      id: `p1-${t.id}`, kind: "P1", severity: "critical",
      title: `Urgence non assignée — ${t.number}`, detail: t.title,
      href: `/tickets/${t.id}`, at: t.createdAt.toISOString(),
    });
  }
  for (const t of stale) {
    items.push({
      id: `new-${t.id}`, kind: "NEW", severity: "info",
      title: `Intervention à qualifier — ${t.number}`, detail: t.title,
      href: `/tickets/${t.id}`, at: t.createdAt.toISOString(),
    });
  }
  for (const i of low.filter((x) => x.qtyOnHand <= x.reorderPt).slice(0, 5)) {
    items.push({
      id: `stock-${i.id}`, kind: "STOCK", severity: "medium",
      title: `Stock bas — ${i.name}`, detail: `${i.sku} · ${i.qtyOnHand} restant(s)`,
      href: "/inventory?low=1", at: new Date().toISOString(),
    });
  }
  for (const f of overdue) {
    items.push({
      id: `bill-${f.id}`, kind: "BILLING", severity: "medium",
      title: `Facture en retard — ${f.number}`, detail: f.customer.name,
      href: "/billing?status=OVERDUE", at: (f.dueAt ?? f.createdAt).toISOString(),
    });
  }

  const rank = { critical: 0, high: 1, medium: 2, info: 3 } as const;
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return NextResponse.json({ items, count: items.length });
}
