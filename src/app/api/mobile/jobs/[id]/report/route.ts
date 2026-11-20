import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** Close the job: service report + e-signature + photos → WO DONE, ticket RESOLVED. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const wo = await db.workOrder.findFirst({ where: { id, tenantId: s.tenantId } });
  if (!wo) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const body = z.object({
    summary: z.string().max(2000).default(""),
    signedBy: z.string().min(2).max(120),
    signature: z.string().max(2_000_000).default(""), // data URL from pad
    rating: z.coerce.number().min(0).max(5).default(0),
    photos: z.array(z.string().max(2_000_000)).max(10).default([]),
  }).parse(await req.json());

  const report = await db.serviceReport.create({
    data: {
      workOrderId: id, summary: body.summary,
      photosJson: body.photos, signatureUrl: body.signature,
      signedBy: body.signedBy, rating: body.rating,
    },
  });
  await db.workOrder.update({ where: { id }, data: { status: "DONE" } });
  await db.ticket.update({ where: { id: wo.ticketId }, data: { status: "RESOLVED" } });
  await db.auditEvent.create({
    data: { ticketId: wo.ticketId, actor: `mobile:${s.user.name}`, action: "STATUS_CHANGED", toStatus: "RESOLVED", detail: `Rapport signé par ${body.signedBy} (${body.rating}/5)` },
  });
  return NextResponse.json({ ok: true, id: report.id }, { status: 201 });
}
