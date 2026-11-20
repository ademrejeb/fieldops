import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { customerSchema } from "../route";

async function owned(id: string) {
  return db.customer.findUnique({ where: { id }, include: { sites: true } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!(await owned(id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const parsed = customerSchema.partial().safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  const item = await db.customer.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const c = await owned(id);
  if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const [tickets, assets] = await Promise.all([
    db.ticket.count({ where: { customerId: id } }),
    db.asset.count({ where: { site: { customerId: id } } }),
  ]);
  if (tickets > 0 || assets > 0) {
    return NextResponse.json(
      { error: `Suppression refusée: ${tickets} ticket(s), ${assets} actif(s) liés. Archivez plutôt.` },
      { status: 409 }
    );
  }
  await db.site.deleteMany({ where: { customerId: id } });
  await db.contract.deleteMany({ where: { customerId: id } });
  await db.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
