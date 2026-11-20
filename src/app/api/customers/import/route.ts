import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";
import { emptySummary, mapRow } from "@/lib/import-helpers";
import { customerSchema } from "../route";

/** Mass import customers: upsert by email, else by name. */
export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const { rows } = z.object({ rows: z.array(z.record(z.string(), z.unknown())).max(2000) }).parse(await req.json());
  const sum = emptySummary();
  for (let i = 0; i < rows.length; i++) {
    const r = mapRow(rows[i], {
      name: ["nom", "name", "client", "societe"],
      type: ["type"],
      email: ["email", "mail"],
      phone: ["telephone", "tel", "phone"],
      address: ["adresse", "address"],
    });
    try {
      const data = customerSchema.parse({ type: "B2B", email: "", phone: "", address: "", ...r });
      const email = String(data.email ?? "");
      const existing = email
        ? await db.customer.findFirst({ where: { tenantId: tenant.id, email } })
        : await db.customer.findFirst({ where: { tenantId: tenant.id, name: data.name } });
      if (existing) { await db.customer.update({ where: { id: existing.id }, data }); sum.updated++; }
      else { await db.customer.create({ data: { tenantId: tenant.id, ...data } }); sum.created++; }
    } catch {
      sum.failed++;
      sum.errors.push(`Ligne ${i + 2}: nom requis`);
    }
  }
  return NextResponse.json(sum);
}
