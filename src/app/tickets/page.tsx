import Link from "next/link";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { customerScope } from "@/lib/require-auth";
import { fmtDate, PRIORITY_LABEL, STATUS_LABEL, priorityTone, statusTone } from "@/lib/format";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { SearchInput } from "@/components/ux/search-input";
import { ExportButtons } from "@/components/ux/export-buttons";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { SortHeader, type SortDir } from "@/components/ux/sort-header";

export const dynamic = "force-dynamic";

const SORTS = ["number", "priority", "status", "sla", "created"] as const;
type SortKey = (typeof SORTS)[number];

const STATUS_OPTS = ["NEW", "QUALIFIED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "RESOLVED", "INVOICED", "CLOSED", "CANCELLED"].map((s) => ({ value: s, label: STATUS_LABEL[s as keyof typeof STATUS_LABEL] }));
const PRIO_OPTS = ["P1_CRITICAL", "P2_HIGH", "P3_NORMAL", "P4_LOW"].map((p) => ({ value: p, label: PRIORITY_LABEL[p as keyof typeof PRIORITY_LABEL] }));

export default async function TicketsPage({ searchParams }: {
  searchParams: Promise<{ status?: string; q?: string; priority?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const { scopedCustomerId } = await customerScope();
  const status = sp.status ?? "";
  const priority = sp.priority ?? "";
  const q = sp.q ?? "";
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as SortKey) : null;
  const dir = (sp.dir === "asc" ? "asc" : "desc") as SortDir;

  const orderBy = sort === "number" ? { number: dir }
    : sort === "priority" ? { priority: dir }
    : sort === "status" ? { status: dir }
    : sort === "sla" ? { slaDueAt: dir }
    : sort === "created" ? { createdAt: dir }
    : [{ priority: "asc" as const }, { createdAt: "desc" as const }];

  const tickets = await db.ticket.findMany({
    where: {
      tenantId: tenant.id,
      ...(scopedCustomerId ? { customerId: scopedCustomerId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(priority ? { priority: priority as never } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { number: { contains: q } }, { errorCode: { contains: q } }] } : {}),
    },
    include: { customer: true, asset: true, workOrders: { include: { assignments: { include: { technician: true } } } } },
    orderBy,
    take: 200,
  });

  const kept = { ...(status ? { status } : {}), ...(priority ? { priority } : {}), ...(q ? { q } : {}) };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Interventions ({tickets.length})</h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300">Suivez chaque demande, du premier appel à la facture.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            filename="interventions"
            fetchUrl={`/api/tickets${Object.keys(kept).length ? `?${new URLSearchParams({ ...kept, status: status || "ALL" })}` : ""}`}
            columns={[
              { key: "number", label: "N°" }, { key: "title", label: "Titre" }, { key: "customer.name", label: "Client" },
              { key: "priority", label: "Priorité" }, { key: "status", label: "Statut" },
              { key: "slaDueAt", label: "À traiter avant", kind: "date" },
            ]}
          />
          <Link href="/tickets/new"><Button>＋ Nouvelle intervention</Button></Link>
        </div>
      </div>

      <FilterBar>
        <SearchInput placeholder="Rechercher par titre, numéro…" />
        <FilterSelect param="status" value={status} placeholder="Tous les statuts" options={STATUS_OPTS} />
        <FilterSelect param="priority" value={priority} placeholder="Toutes les priorités" options={PRIO_OPTS} />
      </FilterBar>

      <Card>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr>
              <SortHeader label="N° / Titre" sortKey="number" current={sort ?? ""} dir={dir} />
              <th>Client</th><th>Priorité</th><th>Statut</th><th>Technicien</th>
              <SortHeader label="À traiter avant" sortKey="sla" current={sort ?? ""} dir={dir} />
            </tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/tickets/${t.id}`} className="font-bold text-blue-700 hover:underline dark:text-blue-400">{t.number}</Link>
                      {t.reviewSource === "PUBLIC" && (
                        <Badge
                          className={
                            t.reviewStatus === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : t.reviewStatus === "REFUSED"
                                ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300"
                                : t.agentStatus === "RUNNING"
                                  ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300"
                                  : "bg-orange-50 text-[#9A3412] ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300"
                          }
                        >
                          {t.reviewStatus === "ACCEPTED"
                            ? "IA validée"
                            : t.reviewStatus === "REFUSED"
                              ? "IA refusée"
                              : t.agentStatus === "RUNNING"
                                ? "Agent…"
                                : "Revue IA"}
                        </Badge>
                      )}
                    </div>
                    <div className="max-w-[320px] truncate text-slate-600 dark:text-slate-300">{t.title}</div>
                  </td>
                  <td className="font-medium">{t.customer.name}</td>
                  <td><Badge className={priorityTone(t.priority)}>{PRIORITY_LABEL[t.priority]}</Badge></td>
                  <td><Badge className={statusTone(t.status)}>{STATUS_LABEL[t.status]}</Badge></td>
                  <td>{t.workOrders[0]?.assignments[0]?.technician.name ?? <span className="font-semibold text-amber-700 dark:text-amber-400">À assigner</span>}</td>
                  <td className="whitespace-nowrap">{fmtDate(t.slaDueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && <div className="p-10 text-center text-[13px] text-slate-600 dark:text-slate-400">Aucune intervention sur ces filtres. <Link href="/tickets/new" className="font-semibold text-blue-700 hover:underline dark:text-blue-400">Créer un ticket →</Link></div>}
        </div>
      </Card>
    </div>
  );
}
