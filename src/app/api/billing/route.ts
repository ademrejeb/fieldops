import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getTenant, nextNumber } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";

export async function GET() {
  const tenant = await getTenant();
  const session = await getServerSession(authOptions);
  const scope = session?.user?.role === "CLIENT" ? session.user.customerId ?? null : null;
  const items = await db.invoice.findMany({
    where: { tenantId: tenant.id, ...(scope ? { customerId: scope } : {}) },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await requireRole("MANAGER");
  if (!session) return NextResponse.json({ error: "Forbidden — manager only" }, { status: 403 });
  const tenant = await getTenant();
  const { ticketId } = z.object({ ticketId: z.string() }).parse(await req.json());

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { workOrders: { include: { parts: { include: { item: true } } } }, customer: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const partsTotal = ticket.workOrders.flatMap((w) => w.parts).reduce((s, p) => s + p.qty * p.unitPrice, 0);
  const laborCents = 95000; // 950 MAD forfait déplacement + 1h (démo, configurable par contrat)
  const total = partsTotal + laborCents;

  const count = await db.invoice.count({ where: { tenantId: tenant.id } });
  const invoice = await db.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: ticket.customerId,
      number: nextNumber("FAC", count + 1),
      lines: [
        { label: `Main d'oeuvre — ${ticket.number}`, qty: 1, unitPrice: laborCents },
        ...ticket.workOrders.flatMap((w) => w.parts.map((p) => ({ label: p.item.name, qty: p.qty, unitPrice: p.unitPrice }))),
      ],
      totalCents: total,
      currency: "MAD",
      status: "SENT",
      dueAt: new Date(Date.now() + 30 * 86400e3),
    },
  });
  await db.ticket.update({ where: { id: ticketId }, data: { status: "INVOICED" } });
  await db.auditEvent.create({ data: { ticketId, actor: "billing", action: "INVOICED", detail: `Facture ${invoice.number}` } });

  return NextResponse.json({ invoice });
}
