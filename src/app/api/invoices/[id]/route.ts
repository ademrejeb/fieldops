import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("MANAGER");
  if (!s) return NextResponse.json({ error: "Manager requis." }, { status: 403 });
  const { id } = await params;
  const { status } = z.object({ status: z.enum(["SENT", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]) }).parse(await req.json());
  const item = await db.invoice.update({
    where: { id },
    data: { status: status as never, ...(status === "PAID" ? { paidAt: new Date() } : {}) },
  });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireRole("MANAGER");
  if (!s) return NextResponse.json({ error: "Manager requis." }, { status: 403 });
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id } });
  if (!inv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (inv.status !== "DRAFT") return NextResponse.json({ error: "Seule une facture brouillon peut être supprimée. Annulez-la plutôt." }, { status: 409 });
  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
