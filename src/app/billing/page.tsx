import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { customerScope } from "@/lib/require-auth";
import { fmtDate, mad } from "@/lib/format";
import { Badge, Card } from "@/components/ui/primitives";
import { ConfirmDelete } from "@/components/ux/confirm";
import { SearchInput } from "@/components/ux/search-input";
import { ExportButtons } from "@/components/ux/export-buttons";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { SortHeader, type SortDir } from "@/components/ux/sort-header";
import { BillingClient } from "./billing-client";
import { InvoiceStatus } from "./invoice-actions";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const { role, scopedCustomerId } = await customerScope();
  const query = sp.q ?? "";
  const status = sp.status ?? "";
  const sort = sp.sort === "number" ? "number" : sp.sort === "total" ? "totalCents" : sp.sort === "due" ? "dueAt" : sp.sort === "status" ? "status" : "createdAt";
  const dir = (sp.dir === "asc" ? "asc" : "desc") as SortDir;
  const isManager = role === "MANAGER" || role === "ADMIN";

  const [invoices, resolved] = await Promise.all([
    db.invoice.findMany({
      where: {
        tenantId: tenant.id,
        ...(scopedCustomerId ? { customerId: scopedCustomerId } : {}),
        ...(status ? { status: status as never } : {}),
        ...(query ? { OR: [{ number: { contains: query } }, { customer: { name: { contains: query } } }] } : {}),
      },
      include: { customer: true },
      orderBy: { [sort]: dir },
      take: 200,
    }),
    isManager
      ? db.ticket.findMany({
          where: { tenantId: tenant.id, status: "RESOLVED" },
          include: { customer: true, workOrders: { include: { parts: { include: { item: true } } } } },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const total = invoices.filter((f) => f.status !== "CANCELLED").reduce((s, f) => s + f.totalCents, 0);
  const overdue = invoices.filter((f) => f.status === "OVERDUE").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Facturation</h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Total {mad(total)} · {overdue > 0 ? <b className="text-red-700 dark:text-red-400">{overdue} en retard</b> : "aucun retard"} · paiement par lien à l’envoi.
          </p>
        </div>
        <ExportButtons
          filename="factures"
            fetchUrl="/api/billing"
            columns={[
              { key: "number", label: "Facture" }, { key: "customer.name", label: "Client" },
              { key: "totalCents", label: "Total", kind: "mad" },
              { key: "status", label: "Statut" }, { key: "dueAt", label: "Échéance", kind: "date" },
            ]}
        />
      </div>

      {isManager && <BillingClient resolved={JSON.parse(JSON.stringify(resolved))} />}

      <FilterBar>
        <SearchInput placeholder="Rechercher facture, client…" />
        <FilterSelect param="status" value={status} placeholder="Tous statuts"
          options={[{ value: "SENT", label: "Envoyées" }, { value: "PAID", label: "Payées" }, { value: "PARTIAL", label: "Partielles" }, { value: "OVERDUE", label: "En retard" }, { value: "DRAFT", label: "Brouillons" }, { value: "CANCELLED", label: "Annulées" }]} />
      </FilterBar>

      <Card>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr>
              <SortHeader label="Facture" sortKey="number" current={sp.sort ?? ""} dir={dir} />
              <th>Client</th>
              <SortHeader label="Total" sortKey="total" current={sp.sort ?? ""} dir={dir} />
              <th>Statut</th>
              <SortHeader label="Échéance" sortKey="due" current={sp.sort ?? ""} dir={dir} />
              <th></th>
            </tr></thead>
            <tbody>
              {invoices.map((f) => (
                <tr key={f.id}>
                  <td className="font-mono font-bold">{f.number}</td>
                  <td>{f.customer.name}</td>
                  <td className="font-bold">{mad(f.totalCents, f.currency)}</td>
                  <td>{isManager ? <InvoiceStatus id={f.id} status={f.status} /> : <Badge className="bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">{f.status}</Badge>}</td>
                  <td className="whitespace-nowrap">{fmtDate(f.dueAt)}</td>
                  <td>{isManager && f.status === "DRAFT" && <ConfirmDelete url={`/api/invoices/${f.id}`} label={f.number} small />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div className="p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">Aucune facture sur ce filtre.</div>}
        </div>
      </Card>
    </div>
  );
}
