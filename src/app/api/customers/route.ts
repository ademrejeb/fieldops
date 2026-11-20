import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";

export const customerSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.string().default("B2B"),
  email: z.string().max(120).default(""),
  phone: z.string().max(40).default(""),
  address: z.string().max(200).default(""),
});

export async function GET(req: Request) {
  const tenant = await getTenant();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await db.customer.findMany({
    where: { tenantId: tenant.id, ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {}) },
    include: { sites: true, contracts: true, _count: { select: { tickets: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const parsed = customerSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nom requis (min 2 lettres)." }, { status: 400 });
  const item = await db.customer.create({ data: { tenantId: tenant.id, ...parsed.data } });
  return NextResponse.json({ item }, { status: 201 });
}
