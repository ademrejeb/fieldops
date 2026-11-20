import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

async function job(tenantId: string, id: string) {
  return db.workOrder.findFirst({
    where: { id, tenantId },
    include: {
      ticket: { include: { customer: true, asset: { include: { site: true, assetType: true } }, events: { orderBy: { createdAt: "desc" }, take: 5 } } },
      assignments: { include: { technician: true } },
      checklist: true,
      executions: { orderBy: { createdAt: "asc" } },
      parts: { include: { item: true } },
      timeLogs: { orderBy: { startedAt: "desc" } },
      reports: true,
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const wo = await job(s.tenantId, id);
  if (!wo) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ job: wo });
}

const WO_STATUS = ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "DONE"] as const;
const TICKET_SYNC: Record<string, string> = {
  EN_ROUTE: "EN_ROUTE", ON_SITE: "ON_SITE", IN_PROGRESS: "IN_PROGRESS", DONE: "RESOLVED",
};

/** Advance job status (mobile) — syncs ticket + audit trail. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const { status, note } = z.object({ status: z.enum(WO_STATUS), note: z.string().max(500).default("") }).parse(await req.json());
  const wo = await db.workOrder.findFirst({ where: { id, tenantId: s.tenantId } });
  if (!wo) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await db.workOrder.update({ where: { id }, data: { status: status as never } });
  const ticketStatus = TICKET_SYNC[status];
  if (ticketStatus) await db.ticket.update({ where: { id: wo.ticketId }, data: { status: ticketStatus as never } });
  await db.auditEvent.create({
    data: { ticketId: wo.ticketId, actor: `mobile:${s.user.name}`, action: "STATUS_CHANGED", toStatus: ticketStatus ?? status, detail: note || `Tech → ${status}` },
  });
  return NextResponse.json({ ok: true, status });
}
