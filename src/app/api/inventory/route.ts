import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";

export const itemSchema = z.object({
  sku: z.string().min(2).max(40),
  name: z.string().min(2).max(140),
  category: z.string().default("PART"),
  qtyOnHand: z.coerce.number().min(0).default(0),
  unitPrice: z.coerce.number().min(0).default(0), // cents
  reorderPt: z.coerce.number().min(0).default(5),
  location: z.string().default("MAIN"),
});

export async function GET(req: Request) {
  const tenant = await getTenant();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "";
  const low = sp.get("low") ?? "";
  const all = await db.inventoryItem.findMany({
    where: { tenantId: tenant.id, ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}) },
    orderBy: { name: "asc" },
    take: 500,
  });
  const items = low ? all.filter((i) => i.qtyOnHand <= i.reorderPt) : all;
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const parsed = itemSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "SKU + nom requis." }, { status: 400 });
  const dup = await db.inventoryItem.findUnique({ where: { tenantId_sku: { tenantId: tenant.id, sku: parsed.data.sku } } });
  if (dup) return NextResponse.json({ error: "SKU déjà utilisé." }, { status: 409 });
  const item = await db.inventoryItem.create({ data: { tenantId: tenant.id, ...parsed.data } });
  return NextResponse.json({ item }, { status: 201 });
}
