import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { techSchema } from "../route";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = techSchema.partial().safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  const item = await db.technician.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const active = await db.assignment.count({
    where: { technicianId: id, workOrder: { status: { notIn: ["DONE", "APPROVED", "CANCELLED"] } } },
  });
  if (active > 0) return NextResponse.json({ error: `Suppression refusée: ${active} mission(s) active(s). Passez-le hors ligne.` }, { status: 409 });
  await db.assignment.deleteMany({ where: { technicianId: id } });
  await db.technician.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
