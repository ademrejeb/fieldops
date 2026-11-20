import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";
import { emptySummary, mapRow, splitList } from "@/lib/import-helpers";
import { techSchema } from "../route";

/** Mass import technicians: upsert by phone, else by name. skills split on , ; / | */
export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const { rows } = z.object({ rows: z.array(z.record(z.string(), z.unknown())).max(2000) }).parse(await req.json());
  const sum = emptySummary();
  for (let i = 0; i < rows.length; i++) {
    const r = mapRow(rows[i], {
      name: ["nom", "name", "technicien"],
      phone: ["telephone", "tel", "phone"],
      email: ["email", "mail"],
      deviceId: ["traceur", "device", "gps", "imei", "boitier"],
      skills: ["competences", "skills", "metiers"],
      certifications: ["certifications", "certifs", "habilitations"],
      status: ["statut", "status"],
    });
    try {
      const data = techSchema.parse({
        phone: "",
        status: "AVAILABLE",
        ...r,
        skills: Array.isArray(r.skills) ? r.skills : splitList(r.skills),
        certifications: Array.isArray(r.certifications) ? r.certifications : splitList(r.certifications),
      });
      const phone = String(data.phone ?? "");
      const existing = phone
        ? await db.technician.findFirst({ where: { tenantId: tenant.id, phone } })
        : await db.technician.findFirst({ where: { tenantId: tenant.id, name: data.name } });
      if (existing) { await db.technician.update({ where: { id: existing.id }, data }); sum.updated++; }
      else { await db.technician.create({ data: { tenantId: tenant.id, ...data } }); sum.created++; }
    } catch {
      sum.failed++;
      sum.errors.push(`Ligne ${i + 2}: nom requis`);
    }
  }
  return NextResponse.json(sum);
}
