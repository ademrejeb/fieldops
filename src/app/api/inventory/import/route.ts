import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/require-auth";
import { emptySummary, mapRow, toCentsMAD, toInt } from "@/lib/import-helpers";

/** Mass import stock: upsert by SKU. Prix en MAD (ex: 850 ou 850,50). */
export async function POST(req: Request) {
  const s = await requireRole("DISPATCHER");
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenant = await getTenant();
  const { rows } = z.object({ rows: z.array(z.record(z.string(), z.unknown())).max(2000) }).parse(await req.json());
  const sum = emptySummary();
  for (let i = 0; i < rows.length; i++) {
    const r = mapRow(rows[i], {
      sku: ["sku", "ref", "reference", "code"],
      name: ["nom", "name", "piece", "designation"],
      location: ["emplacement", "location", "depot"],
      qtyOnHand: ["quantite", "qty", "stock", "qte"],
      unitPrice: ["prix", "price", "pu", "prix_mad"],
      reorderPt: ["seuil", "reorder", "alerte"],
    });
    try {
      const sku = String(r.sku ?? "").toUpperCase();
      const name = String(r.name ?? sku);
      if (!sku || !name) throw new Error("x");
      const locName = String(r.location ?? "MAIN").toUpperCase().replace(/\s+/g, "-") || "MAIN";
      // Auto-create unknown locations so imports never reference dead values
      const locExists = await db.stockLocation.findUnique({ where: { tenantId_name: { tenantId: tenant.id, name: locName } } });
      if (!locExists) await db.stockLocation.create({ data: { tenantId: tenant.id, name: locName, label: "", kind: locName.startsWith("VAN") ? "VAN" : "DEPOT" } });
      const data = {
        sku, name,
        location: locName,
        qtyOnHand: toInt(r.qtyOnHand, 0),
        unitPrice: toCentsMAD(r.unitPrice),
        reorderPt: toInt(r.reorderPt, 5),
      };
      const existing = await db.inventoryItem.findUnique({ where: { tenantId_sku: { tenantId: tenant.id, sku } } });
      if (existing) { await db.inventoryItem.update({ where: { id: existing.id }, data }); sum.updated++; }
      else { await db.inventoryItem.create({ data: { tenantId: tenant.id, category: "PART", ...data } }); sum.created++; }
    } catch {
      sum.failed++;
      sum.errors.push(`Ligne ${i + 2}: SKU + nom requis`);
    }
  }
  return NextResponse.json(sum);
}
