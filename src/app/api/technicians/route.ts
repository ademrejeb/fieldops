import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";

export const techSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(40).default(""),
  email: z.string().max(120).default(""),
  deviceId: z.string().max(40).default(""),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  status: z.string().default("AVAILABLE"),
  lat: z.coerce.number().default(33.5731),
  lng: z.coerce.number().default(-7.5898),
});

export async function GET(req: Request) {
  const tenant = await getTenant();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "";
  const status = sp.get("status") ?? "";
  const items = await db.technician.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}),
    },
    include: { _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const parsed = techSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  const item = await db.technician.create({ data: { tenantId: tenant.id, ...parsed.data } });
  return NextResponse.json({ item }, { status: 201 });
}
