import { NextResponse } from "next/server";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** Stock catalog for the field app (search by name/SKU). */
export async function GET(req: Request) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await db.inventoryItem.findMany({
    where: {
      tenantId: s.tenantId,
      ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}),
    },
    select: { id: true, sku: true, name: true, qtyOnHand: true, unitPrice: true, location: true },
    orderBy: { name: "asc" },
    take: 50,
  });
  return NextResponse.json({ items });
}
