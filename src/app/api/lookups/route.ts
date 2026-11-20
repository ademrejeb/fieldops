import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getTenant();
  const session = await getServerSession(authOptions);
  const custScope = session?.user?.role === "CLIENT" ? session.user.customerId ?? null : null;

  const custFilter = { tenantId: tenant.id, ...(custScope ? { id: custScope } : {}) };
  const [customers, technicians, assets, inventory, assetTypes] = await Promise.all([
    db.customer.findMany({ where: custFilter, include: { sites: true }, take: 200 }),
    db.technician.findMany({ where: { tenantId: tenant.id } }),
    db.asset.findMany({
      where: { tenantId: tenant.id, ...(custScope ? { site: { customerId: custScope } } : {}) },
      include: { site: true, assetType: true },
      take: 200,
    }),
    db.inventoryItem.findMany({ where: { tenantId: tenant.id }, take: 200 }),
    db.assetType.findMany({ where: { tenantId: tenant.id } }),
  ]);
  const sites = customers.flatMap((c) => c.sites.map((s) => ({ ...s, customerName: c.name })));
  return NextResponse.json({ customers, technicians, assets, inventory, assetTypes, sites });
}
