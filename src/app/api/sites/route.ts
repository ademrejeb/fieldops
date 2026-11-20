import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";

export const siteSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(2).max(120),
  address: z.string().max(200).default(""),
  city: z.string().max(80).default("Casablanca"),
  lat: z.coerce.number().default(33.5731),
  lng: z.coerce.number().default(-7.5898),
  accessCode: z.string().max(40).default(""),
  contactName: z.string().max(120).default(""),
  contactPhone: z.string().max(40).default(""),
});

export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = siteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nom du site requis." }, { status: 400 });
  const item = await db.site.create({ data: parsed.data });
  return NextResponse.json({ item }, { status: 201 });
}
