import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";

export const assetSchema = z.object({
  siteId: z.string().min(1),
  assetTypeId: z.string().min(1),
  serialNo: z.string().min(2).max(80),
  name: z.string().min(2).max(140),
  healthScore: z.coerce.number().min(0).max(100).default(100),
  iotDeviceId: z.string().max(80).default(""),
});

export async function GET(req: Request) {
  const tenant = await getTenant();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "";
  const type = sp.get("type") ?? "";
  const items = await db.asset.findMany({
    where: {
      tenantId: tenant.id,
      ...(type ? { assetTypeId: type } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { serialNo: { contains: q } }] } : {}),
    },
    include: { site: { include: { customer: true } }, assetType: true, _count: { select: { tickets: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const parsed = assetSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Site, type, série et nom requis." }, { status: 400 });
  const dup = await db.asset.findUnique({ where: { tenantId_serialNo: { tenantId: tenant.id, serialNo: parsed.data.serialNo } } });
  if (dup) return NextResponse.json({ error: "N° de série déjà utilisé." }, { status: 409 });
  const item = await db.asset.create({ data: { tenantId: tenant.id, ...parsed.data } });
  return NextResponse.json({ item }, { status: 201 });
}
