import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** Log a checklist step from the field (photo = base64 data URL or storage key). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const wo = await db.workOrder.findFirst({ where: { id, tenantId: s.tenantId } });
  if (!wo) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = z.object({
    stepKey: z.string().min(1).max(80),
    label: z.string().max(200).default(""),
    result: z.string().max(500).default("PASS"),
    photo: z.string().max(2_000_000).default(""),
  }).parse(await req.json());
  const item = await db.checklistExecution.create({
    data: { workOrderId: id, stepKey: body.stepKey, label: body.label, result: body.result, photoUrl: body.photo },
  });
  return NextResponse.json({ ok: true, id: item.id }, { status: 201 });
}
