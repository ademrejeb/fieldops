import Link from "next/link";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { Card } from "@/components/ui/primitives";
import { CONTRACT_TIER_LABEL, CUSTOMER_TYPE_LABEL } from "@/lib/format";
import { ConfirmDelete } from "@/components/ux/confirm";
import { SearchInput } from "@/components/ux/search-input";
import { ExportButtons } from "@/components/ux/export-buttons";
import { ImportButton } from "@/components/ux/import-button";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { CustomerButton, SiteButton } from "./client-actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { q, sort } = await searchParams;
  const tenant = await getTenant();
  const query = q ?? "";
  const customers = await db.customer.findMany({
    where: {
      tenantId: tenant.id,
      ...(query ? { OR: [{ name: { contains: query } }, { phone: { contains: query } }, { email: { contains: query } }] } : {}),
    },
    include: { sites: { include: { _count: { select: { assets: true } } } }, contracts: true, _count: { select: { tickets: true } } },
    orderBy: { name: "asc" },
  });
  if (sort === "tickets") customers.sort((a, b) => b._count.tickets - a._count.tickets);
  if (sort === "sites") customers.sort((a, b) => b.sites.length - a.sites.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Clients ({customers.length})</h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300">Coordonnées, sites et historique de chaque client.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            filename="clients"
            fetchUrl={`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`}
            columns={[
              { key: "name", label: "Nom" }, { key: "type", label: "Type" }, { key: "email", label: "Email" },
              { key: "phone", label: "Téléphone" }, { key: "address", label: "Adresse" },
            ]}
          />
          <ImportButton uploadUrl="/api/customers/import" label="Clients" templateHeaders={["Nom", "Type", "Email", "Téléphone", "Adresse"]} />
          <CustomerButton />
        </div>
      </div>

      <FilterBar>
        <SearchInput placeholder="Rechercher un client, téléphone, email…" />
        <FilterSelect param="sort" value={sort ?? ""} placeholder="Tri: Nom"
          options={[{ value: "name", label: "Tri : Nom" }, { value: "tickets", label: "Tri : Interventions" }, { value: "sites", label: "Tri : Sites" }]} />
      </FilterBar>

      {customers.length === 0 && (
        <Card className="p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">
          Aucun client trouvé. <span className="font-semibold text-slate-700 dark:text-slate-200">Ajoutez votre premier client</span> ou importez un fichier.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {customers.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold">{c.name}</span>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">{c.contracts[0]?.tier ? (CONTRACT_TIER_LABEL[c.contracts[0].tier] ?? c.contracts[0].tier) : (CUSTOMER_TYPE_LABEL[c.type] ?? c.type)}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">{[c.phone, c.email, c.address].filter(Boolean).join(" · ")}</div>
                <div className="mt-1 text-[13px] text-slate-700 dark:text-slate-300">
                  {c._count.tickets} intervention(s) · Réponse sous {c.contracts[0]?.slaResponseH ?? 8} h · résolution {c.contracts[0]?.slaResolveH ?? 48} h
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <CustomerButton customer={c} />
                <ConfirmDelete url={`/api/customers/${c.id}`} label={c.name} small />
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Sites ({c.sites.length})</div>
              {c.sites.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <span className="text-[13px] font-semibold">{s.name}</span>
                    <span className="ml-2 text-[12.5px] text-slate-600 dark:text-slate-400">{s.address} · {s._count.assets} équipement(s){s.accessCode && ` · accès ${s.accessCode}`}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <SiteButton customerId={c.id} site={s} />
                    <ConfirmDelete url={`/api/sites/${s.id}`} label={s.name} small />
                  </div>
                </div>
              ))}
              <SiteButton customerId={c.id} />
            </div>
            <Link href={`/tickets?q=${encodeURIComponent(c.name)}`} className="mt-3 inline-block text-[13px] font-semibold text-blue-700 hover:underline dark:text-blue-400">
              Voir les interventions →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
