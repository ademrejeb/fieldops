import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const loc = await db.stockLocation.findUnique({ where: { id } });
  if (!loc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const used = await db.inventoryItem.count({ where: { tenantId: loc.tenantId, location: loc.name } });
  if (used > 0) return NextResponse.json({ error: `Suppression refusée: ${used} pièce(s) stockée(s) ici. Déplacez-les d'abord.` }, { status: 409 });
  await db.stockLocation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
