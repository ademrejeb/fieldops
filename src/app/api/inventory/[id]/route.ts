import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { itemSchema } from "../route";

const patchSchema = itemSchema.partial().extend({ adjust: z.coerce.number().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  const current = await db.inventoryItem.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const { adjust, ...fields } = parsed.data;
  const qtyOnHand = adjust !== undefined ? Math.max(0, current.qtyOnHand + adjust) : fields.qtyOnHand;
  const item = await db.inventoryItem.update({ where: { id }, data: { ...fields, qtyOnHand } });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const used = await db.partUsage.count({ where: { itemId: id } });
  if (used > 0) return NextResponse.json({ error: `Suppression refusée: pièce utilisée dans ${used} intervention(s).` }, { status: 409 });
  await db.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
