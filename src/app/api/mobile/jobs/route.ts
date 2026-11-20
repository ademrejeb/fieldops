import { NextResponse } from "next/server";
import { mobileSession } from "@/lib/mobile-auth";
import { db } from "@/lib/db";

/** My Day: active work orders for the linked technician (others see all active). */
export async function GET(req: Request) {
  const s = await mobileSession(req);
  if (!s) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const techId = s.user.technician?.id ?? null;

  const items = await db.workOrder.findMany({
    where: {
      tenantId: s.tenantId,
      status: { notIn: ["DONE", "APPROVED", "CANCELLED"] },
      ...(techId ? { assignments: { some: { technicianId: techId } } } : {}),
    },
    include: {
      ticket: { include: { customer: true, asset: { include: { site: true, assetType: true } } } },
      assignments: { include: { technician: true } },
      checklist: true,
      executions: true,
      parts: { include: { item: true } },
    },
    orderBy: [{ ticket: { priority: "asc" } }, { scheduledStart: "asc" }],
  });
  return NextResponse.json({ items });
}
