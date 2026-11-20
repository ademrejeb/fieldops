import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export type Hit = { type: string; label: string; sub: string; href: string };

/** Global search across tickets, assets, customers, techs, invoices. */
export async function GET(req: Request) {
  const tenant = await getTenant();
  const session = await getServerSession(authOptions);
  const scope = session?.user?.role === "CLIENT" ? session.user.customerId ?? null : null;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });
  const cust = scope ? { customerId: scope } : {};

  const [tickets, assets, customers, techs, invoices] = await Promise.all([
    db.ticket.findMany({
      where: { tenantId: tenant.id, ...cust, OR: [{ number: { contains: q } }, { title: { contains: q } }, { errorCode: { contains: q } }] },
      include: { customer: true }, take: 6, orderBy: { createdAt: "desc" },
    }),
    db.asset.findMany({
      where: { tenantId: tenant.id, ...(scope ? { site: { customerId: scope } } : {}), OR: [{ name: { contains: q } }, { serialNo: { contains: q } }] },
      include: { site: true }, take: 5,
    }),
    scope
      ? []
      : db.customer.findMany({
          where: { tenantId: tenant.id, OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
          take: 4,
        }),
    scope
      ? []
      : db.technician.findMany({ where: { tenantId: tenant.id, name: { contains: q } }, take: 4 }),
    db.invoice.findMany({
      where: { tenantId: tenant.id, ...(scope ? { customerId: scope } : {}), number: { contains: q } },
      include: { customer: true }, take: 4,
    }),
  ]);

  const groups: { title: string; hits: Hit[] }[] = [];
  if (tickets.length) groups.push({ title: "Tickets", hits: tickets.map((t) => ({ type: "ticket", label: `${t.number} — ${t.title}`, sub: t.customer.name, href: `/tickets/${t.id}` })) });
  if (assets.length) groups.push({ title: "Actifs", hits: assets.map((a) => ({ type: "asset", label: `${a.name} · ${a.serialNo}`, sub: a.site.name, href: `/assets?q=${encodeURIComponent(a.serialNo)}` })) });
  if (customers.length) groups.push({ title: "Clients", hits: customers.map((c) => ({ type: "customer", label: c.name, sub: c.phone, href: `/clients?q=${encodeURIComponent(c.name)}` })) });
  if (techs.length) groups.push({ title: "Techniciens", hits: techs.map((t) => ({ type: "tech", label: t.name, sub: t.status, href: `/technicians?q=${encodeURIComponent(t.name)}` })) });
  if (invoices.length) groups.push({ title: "Factures", hits: invoices.map((f) => ({ type: "invoice", label: f.number, sub: f.customer.name, href: `/billing?q=${encodeURIComponent(f.number)}` })) });

  return NextResponse.json({ groups });
}
