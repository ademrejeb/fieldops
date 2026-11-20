import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      customer: true,
      asset: { include: { site: true, assetType: true } },
      workOrders: {
        include: {
          assignments: { include: { technician: true } },
          executions: true,
          parts: { include: { item: true } },
          reports: true,
          checklist: true,
        },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("MANAGER");
  if (!s) return NextResponse.json({ error: "Manager requis." }, { status: 403 });
  const { id } = await params;
  const t = await db.ticket.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!["NEW", "QUALIFIED", "SCHEDULED", "CANCELLED"].includes(t.status)) {
    return NextResponse.json({ error: "Seul un ticket non démarré peut être supprimé. Annulez-le plutôt." }, { status: 409 });
  }
  await db.auditEvent.deleteMany({ where: { ticketId: id } });
  await db.workOrder.deleteMany({ where: { ticketId: id } });
  await db.ticket.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
