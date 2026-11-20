import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { statusChangeSchema } from "@/lib/validations";
import { requireRole } from "@/lib/require-auth";

const FLOW = ["NEW", "QUALIFIED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "RESOLVED", "INVOICED", "CLOSED"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("TECHNICIAN");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = statusChangeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await db.ticket.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ticket = await db.ticket.update({
    where: { id },
    data: { status: parsed.data.status as never },
  });
  await db.auditEvent.create({
    data: {
      ticketId: id,
      actor: parsed.data.actor,
      action: "STATUS_CHANGED",
      fromStatus: current.status,
      toStatus: parsed.data.status,
      detail: parsed.data.note,
    },
  });

  // Keep work order in sync for dispatcher board (best-effort)
  const wo = await db.workOrder.findFirst({ where: { ticketId: id }, orderBy: { createdAt: "desc" } });
  if (wo) {
    const map: Record<string, string> = {
      SCHEDULED: "SCHEDULED", EN_ROUTE: "EN_ROUTE", ON_SITE: "ON_SITE",
      IN_PROGRESS: "IN_PROGRESS", RESOLVED: "DONE",
    };
    if (map[parsed.data.status]) {
      await db.workOrder.update({ where: { id: wo.id }, data: { status: map[parsed.data.status] as never } });
    }
  }

  return NextResponse.json({ ticket, flow: FLOW });
}
