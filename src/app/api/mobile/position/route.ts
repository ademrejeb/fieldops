import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** Periodic GPS from the mobile app (foreground + background task). */
export async function POST(req: Request) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const techId = s.user.technician?.id ?? null;
  if (!techId) return NextResponse.json({ error: "Aucun technicien lié." }, { status: 403 });
  const { lat, lng, speed, battery } = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    speed: z.coerce.number().default(0),
    battery: z.coerce.number().default(0),
  }).parse(await req.json());

  const tech = await db.technician.findUnique({ where: { id: techId } });
  const pos = await db.position.create({
    data: {
      tenantId: s.tenantId, technicianId: techId,
      deviceId: tech?.deviceId || `mobile-${techId.slice(0, 8)}`,
      lat, lng, speed: Math.round(speed), battery: Math.round(battery),
      source: "mobile",
    },
  });
  await db.technician.update({ where: { id: techId }, data: { lat, lng, status: "ON_JOB" } });
  return NextResponse.json({ ok: true, id: pos.id }, { status: 201 });
}
