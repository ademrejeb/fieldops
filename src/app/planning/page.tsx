import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { fmtDate, STATUS_LABEL, statusTone } from "@/lib/format";
import { Badge, Card } from "@/components/ui/primitives";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { SortHeader, type SortDir } from "@/components/ux/sort-header";
import { PlannerClient } from "./planner-client";

export const dynamic = "force-dynamic";

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ mine?: string; tech?: string; sort?: string; dir?: string }> }) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const session = await getServerSession(authOptions);
  const isTech = session?.user?.role === "TECHNICIAN";

  // Linked technician for "Mes missions"
  const me = session?.user?.email
    ? await db.user.findFirst({ where: { tenantId: tenant.id, email: session.user.email }, include: { technician: true } })
    : null;
  const myTechId = me?.technician?.id ?? null;
  const mine = sp.mine === "1" || (isTech && sp.mine !== "0");
  const techFilter = sp.tech ?? "";
  const sort = sp.sort === "number" ? "number" : "date";
  const dir = (sp.dir === "desc" ? "desc" : "asc") as SortDir;

  const [techs, wos, unassigned] = await Promise.all([
    db.technician.findMany({ where: { tenantId: tenant.id } }),
    db.workOrder.findMany({
      where: {
        tenantId: tenant.id,
        status: { notIn: ["DONE", "APPROVED", "CANCELLED"] },
        ...(mine && myTechId ? { assignments: { some: { technicianId: myTechId } } } : {}),
        ...(techFilter ? { assignments: { some: { technicianId: techFilter } } } : {}),
      },
      include: { ticket: { include: { customer: true } }, assignments: { include: { technician: true } } },
      orderBy: sort === "number" ? { number: dir } : { scheduledStart: dir },
      take: 100,
    }),
    db.ticket.findMany({ where: { tenantId: tenant.id, status: "NEW" }, include: { customer: true }, take: 10 }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">
          {mine ? `Mes missions — ${me?.technician?.name ?? me?.name}` : "Planning des interventions"}
        </h1>
        <p className="text-[14px] text-slate-600 dark:text-slate-300">
          Organisez les missions selon les compétences et la proximité. {wos.length} intervention(s) affichée(s).
        </p>
      </div>
      {!isTech && (
        <PlannerClient techs={techs} workOrders={JSON.parse(JSON.stringify(wos))} unassigned={JSON.parse(JSON.stringify(unassigned))} />
      )}
      <FilterBar>
        {myTechId && (
          <div className="flex gap-1.5">
            <Link href="/planning" className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${!mine && !techFilter ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>Tout</Link>
            <Link href="/planning?mine=1" className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${mine ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>★ Mes missions</Link>
          </div>
        )}
        <FilterSelect param="tech" value={techFilter} placeholder="Tous techniciens"
          options={techs.map((t) => ({ value: t.id, label: `${t.name} ${t.status === "ON_JOB" ? "●" : "○"}` }))} />
      </FilterBar>
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr>
              <SortHeader label="Mission" sortKey="number" current={sort} dir={dir} />
              <th>Intervention / Client</th>
              <SortHeader label="Planifié" sortKey="date" current={sort} dir={dir} />
              <th>Statut</th><th>Technicien(s)</th>
            </tr></thead>
            <tbody>
              {wos.map((w) => (
                <tr key={w.id}>
                  <td className="font-mono font-bold">{w.number}</td>
                  <td><Link href={`/tickets/${w.ticketId}`} className="font-semibold text-blue-700 hover:underline dark:text-blue-400">{w.ticket.number}</Link> · {w.ticket.customer.name}</td>
                  <td>{fmtDate(w.scheduledStart)} · {w.estimatedMin} min</td>
                  <td><Badge className={statusTone(w.status)}>{STATUS_LABEL[w.status] ?? w.status}</Badge></td>
                  <td>{w.assignments.map((a) => a.technician.name).join(", ") || <span className="font-semibold text-amber-600 dark:text-amber-400">À assigner</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {wos.length === 0 && <div className="p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">Rien à afficher — belle journée calme. ☀️</div>}
        </div>
      </Card>
    </div>
  );
}
