import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { mad } from "@/lib/format";
import { Card } from "@/components/ui/primitives";
import { ConfirmDelete } from "@/components/ux/confirm";
import { SearchInput } from "@/components/ux/search-input";
import { ExportButtons } from "@/components/ux/export-buttons";
import { ImportButton } from "@/components/ux/import-button";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { SortHeader, type SortDir } from "@/components/ux/sort-header";
import { ItemButton, StockStepper } from "./item-actions";
import { LocationManager } from "./location-manager";

export const dynamic = "force-dynamic";

const SORTS: Record<string, "name" | "sku" | "qtyOnHand" | "unitPrice"> = {
  name: "name", sku: "sku", qty: "qtyOnHand", price: "unitPrice",
};

export default async function InventoryPage({ searchParams }: {
  searchParams: Promise<{ q?: string; low?: string; loc?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const query = sp.q ?? "";
  const lowOnly = sp.low === "1";
  const loc = sp.loc ?? "";
  const sortKey = SORTS[sp.sort ?? ""] ?? "name";
  const dir = (sp.dir === "desc" ? "desc" : "asc") as SortDir;

  const [locations, techs] = await Promise.all([
    db.stockLocation.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    db.technician.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
  ]);

  const all = await db.inventoryItem.findMany({
    where: {
      tenantId: tenant.id,
      ...(loc ? { location: loc } : {}),
      ...(query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }] } : {}),
    },
    orderBy: { [sortKey]: dir },
  });
  const items = lowOnly ? all.filter((i) => i.qtyOnHand <= i.reorderPt) : all;
  const locOpts = locations.map((l) => ({ name: l.name, label: l.label }));

  const kept = { ...(query ? { q: query } : {}), ...(lowOnly ? { low: "1" } : {}), ...(loc ? { loc } : {}) };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Stock ({items.length})</h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300">Pièces au dépôt et dans les camionnettes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LocationManager locations={locations.map((l) => ({ id: l.id, name: l.name, label: l.label, kind: l.kind, inUse: 0 }))} techs={techs} />
          <ExportButtons
            filename="stock"
            fetchUrl={`/api/inventory${Object.keys(kept).length ? `?${new URLSearchParams(kept)}` : ""}`}
            columns={[
              { key: "sku", label: "Réf." }, { key: "name", label: "Nom" }, { key: "location", label: "Emplacement" },
              { key: "qtyOnHand", label: "Quantité" }, { key: "unitPrice", label: "Prix", kind: "mad" },
              { key: "reorderPt", label: "Seuil" },
            ]}
          />
          <ImportButton uploadUrl="/api/inventory/import" label="Stock" templateHeaders={["SKU", "Nom", "Emplacement", "Quantite", "Prix", "Seuil"]} />
          <ItemButton locations={locOpts} />
        </div>
      </div>

      <FilterBar>
        <SearchInput placeholder="Rechercher une référence, une pièce…" />
        <FilterSelect param="loc" value={loc} placeholder="Tous emplacements" options={locations.map((l) => ({ value: l.name, label: `${l.name}${l.label ? ` — ${l.label}` : ""}` }))} />
        <FilterSelect param="low" value={lowOnly ? "1" : ""} placeholder="Tout stock" options={[{ value: "1", label: "⚠ À réassortir" }]} />
      </FilterBar>

      <Card>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr>
              <SortHeader label="Réf." sortKey="sku" current={sortKey === "sku" ? "sku" : ""} dir={dir} />
              <SortHeader label="Pièce" sortKey="name" current={sortKey === "name" ? "name" : ""} dir={dir} />
              <th>Emplacement</th>
              <SortHeader label="Stock" sortKey="qty" current={sortKey === "qtyOnHand" ? "qty" : ""} dir={dir} />
              <SortHeader label="Prix" sortKey="price" current={sortKey === "unitPrice" ? "price" : ""} dir={dir} />
              <th>État</th><th></th>
            </tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono font-bold">{i.sku}</td>
                  <td>{i.name}</td>
                  <td><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] dark:bg-slate-800 dark:text-slate-300">{i.location}</span></td>
                  <td><StockStepper id={i.id} qty={i.qtyOnHand} /></td>
                  <td className="font-semibold">{mad(i.unitPrice)}</td>
                  <td>{i.qtyOnHand <= i.reorderPt
                    ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">Réassort (seuil {i.reorderPt})</span>
                    : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">En stock</span>}</td>
                  <td className="whitespace-nowrap">
                    <ItemButton item={i} locations={locOpts} />
                    <span className="mx-1 text-slate-200 dark:text-slate-700">|</span>
                    <ConfirmDelete url={`/api/inventory/${i.id}`} label={i.sku} small />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">Aucune pièce sur ces filtres.</div>}
        </div>
      </Card>
    </div>
  );
}
