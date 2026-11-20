import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { siteSchema } from "../route";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = siteSchema.partial().safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  const item = await db.site.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const assets = await db.asset.count({ where: { siteId: id } });
  if (assets > 0) return NextResponse.json({ error: `Suppression refusée: ${assets} actif(s) sur ce site.` }, { status: 409 });
  await db.site.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
