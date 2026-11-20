import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenant, nextNumber } from "@/lib/tenant";
import { workOrderCreateSchema } from "@/lib/validations";
import { requireRole } from "@/lib/require-auth";
import { assignmentMail, sendMail } from "@/lib/mailer";

export async function GET() {
  const tenant = await getTenant();
  const items = await db.workOrder.findMany({
    where: { tenantId: tenant.id },
    include: { ticket: { include: { customer: true } }, assignments: { include: { technician: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ workOrders: items });
}

export async function POST(req: Request) {
  const session = await requireRole("DISPATCHER");
  if (!session) return NextResponse.json({ error: "Forbidden — dispatch only" }, { status: 403 });
  const tenant = await getTenant();
  const body = await req.json();
  const parsed = workOrderCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await db.workOrder.count({ where: { tenantId: tenant.id } });
  const wo = await db.workOrder.create({
    data: {
      tenantId: tenant.id,
      ticketId: parsed.data.ticketId,
      number: nextNumber("WO", count + 1),
      jobType: parsed.data.jobType,
      status: parsed.data.technicianIds.length ? "ASSIGNED" : "SCHEDULED",
      scheduledStart: parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : new Date(),
      estimatedMin: parsed.data.estimatedMin,
    },
  });
  for (const techId of parsed.data.technicianIds) {
    await db.assignment.create({ data: { workOrderId: wo.id, technicianId: techId } });
  }
  await db.ticket.update({ where: { id: parsed.data.ticketId }, data: { status: "SCHEDULED" } });
  await db.auditEvent.create({
    data: { ticketId: parsed.data.ticketId, actor: "dispatcher", action: "ASSIGNED", detail: `WO ${wo.number} créé` },
  });

  // Notify assigned techs by mail (never blocks the assignment)
  if (parsed.data.technicianIds.length > 0) {
    try {
      const [ticket, techs] = await Promise.all([
        db.ticket.findUnique({
          where: { id: parsed.data.ticketId },
          include: { customer: true, asset: { include: { site: true } } },
        }),
        db.technician.findMany({ where: { id: { in: parsed.data.technicianIds } }, include: { user: true } }),
      ]);
      for (const t of techs) {
        const to = t.email || t.user?.email || "";
        if (!to) continue;
        const mail = assignmentMail({
          number: wo.number,
          ticketNumber: ticket?.number ?? "",
          title: ticket?.title ?? "",
          jobType: wo.jobType,
          scheduledStart: wo.scheduledStart,
          estimatedMin: wo.estimatedMin,
          customer: ticket?.customer.name ?? "",
          site: ticket?.asset?.site.name ?? "",
          address: ticket?.asset?.site.address ?? "",
          accessCode: ticket?.asset?.site.accessCode ?? "",
          ticketId: parsed.data.ticketId,
        });
        const r = await sendMail({ to, ...mail });
        await db.auditEvent.create({
          data: {
            ticketId: parsed.data.ticketId, actor: "system", action: "NOTIFIED",
            detail: `${t.name} <${to}> — ${r.sent ? "email envoyé" : "email en log (SMTP non configuré)"}`,
          },
        });
      }
    } catch (e) {
      console.error("[dispatch] notify failed:", e);
    }
  }
  return NextResponse.json({ workOrder: wo }, { status: 201 });
}
