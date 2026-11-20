import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** Log time spent on site. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const wo = await db.workOrder.findFirst({ where: { id, tenantId: s.tenantId } });
  if (!wo) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const { minutes } = z.object({ minutes: z.coerce.number().min(1).max(1440) }).parse(await req.json());
  const log = await db.timeLog.create({
    data: { workOrderId: id, techName: s.user.name ?? "tech", startedAt: new Date(Date.now() - minutes * 60000), endedAt: new Date(), minutes },
  });
  return NextResponse.json({ ok: true, id: log.id }, { status: 201 });
}
