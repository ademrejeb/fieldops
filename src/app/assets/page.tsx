import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { Card } from "@/components/ui/primitives";
import { ConfirmDelete } from "@/components/ux/confirm";
import { SearchInput } from "@/components/ux/search-input";
import { ExportButtons } from "@/components/ux/export-buttons";
import { ImportButton } from "@/components/ux/import-button";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { SortHeader, type SortDir } from "@/components/ux/sort-header";
import { AssetButton } from "./asset-actions";

export const dynamic = "force-dynamic";

export default async function AssetsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const query = sp.q ?? "";
  const type = sp.type ?? "";
  const sort = sp.sort === "serial" ? "serialNo" : sp.sort === "health" ? "healthScore" : "name";
  const dir = (sp.dir === "desc" ? "desc" : "asc") as SortDir;
  const [assets, types, sites] = await Promise.all([
    db.asset.findMany({
      where: {
        tenantId: tenant.id,
        ...(type ? { assetTypeId: type } : {}),
        ...(query ? { OR: [{ name: { contains: query } }, { serialNo: { contains: query } }] } : {}),
      },
      include: { site: { include: { customer: true } }, assetType: true, _count: { select: { tickets: true } } },
      orderBy: { [sort]: dir },
    }),
    db.assetType.findMany({ where: { tenantId: tenant.id } }),
    db.site.findMany({ where: { customer: { tenantId: tenant.id } }, include: { customer: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Sites & équipements ({assets.length})</h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300">Équipements installés chez vos clients, avec leur historique.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            filename="equipements"
            fetchUrl={`/api/assets${type || query ? `?${new URLSearchParams({ ...(type ? { type } : {}), ...(query ? { q: query } : {}) })}` : ""}`}
            columns={[
              { key: "name", label: "Équipement" }, { key: "serialNo", label: "N° de série" },
              { key: "site.name", label: "Site" }, { key: "site.customer.name", label: "Client" },
              { key: "assetType.name", label: "Type" }, { key: "healthScore", label: "État" },
            ]}
          />
          <ImportButton uploadUrl="/api/assets/import" label="Équipements" templateHeaders={["Nom", "Serie", "Site", "Type", "Sante"]} />
          <AssetButton sites={sites.map((s) => ({ id: s.id, name: s.name, customerName: s.customer.name }))} types={types} />
        </div>
      </div>

      <FilterBar>
        <SearchInput placeholder="Rechercher un équipement, un n° de série…" />
        <FilterSelect param="type" value={type} placeholder="Tous types"
          options={types.map((t) => ({ value: t.id, label: t.name }))} />
      </FilterBar>

      <Card>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr>
              <SortHeader label="Équipement" sortKey="name" current={sp.sort ?? ""} dir={dir} />
              <SortHeader label="N° de série" sortKey="serial" current={sp.sort ?? ""} dir={dir} />
              <th>Site / Client</th><th>Type</th>
              <SortHeader label="État" sortKey="health" current={sp.sort ?? ""} dir={dir} />
              <th>Interventions</th><th></th>
            </tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.name}</td>
                  <td className="font-mono text-[12.5px]">{a.serialNo}</td>
                  <td>{a.site.name} · <span className="text-slate-500 dark:text-slate-400">{a.site.customer.name}</span></td>
                  <td>{a.assetType.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full ${a.healthScore > 75 ? "bg-emerald-500" : a.healthScore > 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${a.healthScore}%` }} />
                      </div>
                      <span className="text-[12px] font-bold">{a.healthScore}%</span>
                    </div>
                  </td>
                  <td>{a._count.tickets}</td>
                  <td className="whitespace-nowrap">
                    <AssetButton asset={{ id: a.id, name: a.name, serialNo: a.serialNo, siteId: a.siteId, assetTypeId: a.assetTypeId, healthScore: a.healthScore, iotDeviceId: a.iotDeviceId }} sites={sites.map((s) => ({ id: s.id, name: s.name, customerName: s.customer.name }))} types={types} />
                    <span className="mx-1 text-slate-200 dark:text-slate-700">|</span>
                    <ConfirmDelete url={`/api/assets/${a.id}`} label={a.name} small />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assets.length === 0 && <div className="p-10 text-center text-[13px] text-slate-600 dark:text-slate-400">Aucun équipement sur ce filtre.</div>}
        </div>
      </Card>
    </div>
  );
}
