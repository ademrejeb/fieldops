import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";
import { emptySummary, mapRow, toInt } from "@/lib/import-helpers";

/** Mass import assets: upsert by serialNo. Site/Type matched by name. */
export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const { rows } = z.object({ rows: z.array(z.record(z.string(), z.unknown())).max(2000) }).parse(await req.json());
  const sites = await db.site.findMany({ where: { customer: { tenantId: tenant.id } } });
  const types = await db.assetType.findMany({ where: { tenantId: tenant.id } });
  const sum = emptySummary();
  for (let i = 0; i < rows.length; i++) {
    const r = mapRow(rows[i], {
      name: ["nom", "name", "actif", "equipement"],
      serialNo: ["serie", "serial", "n_serie", "numero_serie"],
      site: ["site", "batiment"],
      type: ["type"],
      healthScore: ["sante", "health", "etat"],
    });
    try {
      const serialNo = String(r.serialNo ?? "");
      const name = String(r.name ?? serialNo);
      if (!serialNo || !name) throw new Error("x");
      const siteName = String(r.site ?? "").toLowerCase();
      const typeName = String(r.type ?? "").toLowerCase();
      const site = sites.find((x) => x.name.toLowerCase().includes(siteName) || siteName.includes(x.name.toLowerCase()));
      const type = typeName ? types.find((x) => x.name.toLowerCase().includes(typeName)) : types[0];
      if (!siteName || !site) throw new Error("site");
      const data = { siteId: site.id, assetTypeId: (type ?? types[0]).id, serialNo, name, healthScore: toInt(r.healthScore, 100) };
      if (!types[0]) throw new Error("types");
      const existing = await db.asset.findUnique({ where: { tenantId_serialNo: { tenantId: tenant.id, serialNo } } });
      if (existing) { await db.asset.update({ where: { id: existing.id }, data }); sum.updated++; }
      else { await db.asset.create({ data: { tenantId: tenant.id, ...data } }); sum.created++; }
    } catch {
      sum.failed++;
      sum.errors.push(`Ligne ${i + 2}: série + site (nom exact) requis`);
    }
  }
  return NextResponse.json(sum);
}
