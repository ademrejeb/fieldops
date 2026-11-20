import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";

export const locationSchema = z.object({
  name: z.string().min(2).max(20).transform((s) => s.toUpperCase().replace(/\s+/g, "-")),
  label: z.string().max(120).default(""),
  kind: z.enum(["DEPOT", "VAN"]).default("DEPOT"),
  technicianId: z.string().optional().nullable(),
});

export async function GET() {
  const tenant = await getTenant();
  const items = await db.stockLocation.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });
  const withUsage = await Promise.all(
    items.map(async (l) => ({ ...l, inUse: await db.inventoryItem.count({ where: { tenantId: tenant.id, location: l.name } }) }))
  );
  return NextResponse.json({ items: withUsage });
}

export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const parsed = locationSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nom requis (ex: VAN-03)." }, { status: 400 });
  const data = { ...parsed.data, technicianId: parsed.data.technicianId || null };
  const dup = await db.stockLocation.findUnique({ where: { tenantId_name: { tenantId: tenant.id, name: data.name } } });
  if (dup) return NextResponse.json({ error: "Emplacement déjà existant." }, { status: 409 });
  const item = await db.stockLocation.create({ data: { tenantId: tenant.id, ...data } });
  return NextResponse.json({ item }, { status: 201 });
}
