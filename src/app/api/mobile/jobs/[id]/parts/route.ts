import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** Log a part used on site — decrements real stock. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const wo = await db.workOrder.findFirst({ where: { id, tenantId: s.tenantId } });
  if (!wo) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { itemId, qty } = z.object({ itemId: z.string().min(1), qty: z.coerce.number().min(1).max(999) }).parse(await req.json());
  const item = await db.inventoryItem.findFirst({ where: { id: itemId, tenantId: s.tenantId } });
  if (!item) return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
  if (item.qtyOnHand < qty) return NextResponse.json({ error: `Stock insuffisant (${item.qtyOnHand} dispo).` }, { status: 409 });
  const [usage] = await Promise.all([
    db.partUsage.create({ data: { workOrderId: id, itemId, qty, unitPrice: item.unitPrice } }),
    db.inventoryItem.update({ where: { id: itemId }, data: { qtyOnHand: item.qtyOnHand - qty } }),
  ]);
  return NextResponse.json({ ok: true, id: usage.id, remaining: item.qtyOnHand - qty }, { status: 201 });
}
