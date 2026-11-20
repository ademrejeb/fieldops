import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { assetSchema } from "../route";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = assetSchema.partial().safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  const item = await db.asset.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const tickets = await db.ticket.count({ where: { assetId: id } });
  if (tickets > 0) return NextResponse.json({ error: `Suppression refusée: ${tickets} ticket(s) liés à cet actif.` }, { status: 409 });
  await db.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
