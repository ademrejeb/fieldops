import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { factoryStatus } from "@/lib/factory-status";
import { getTenant } from "@/lib/tenant";
import { customerScope } from "@/lib/require-auth";
import { fmtDate, mad, PRIORITY_LABEL, STATUS_LABEL, priorityTone, statusTone } from "@/lib/format";
import { Badge, Button, Card, CardHeader } from "@/components/ui/primitives";
import { TechMap } from "@/components/geo/tech-map";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Siren,
  Sparkles,
  Timer,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommandCenter() {
  const { role } = await customerScope();
  if (role === "CLIENT") redirect("/tickets");
  const tenant = await getTenant();
  // eslint-disable-next-line react-hooks/purity
  const riskAt = new Date(Date.now() + 4 * 3600e3);
  const [open, p1, slaRisk, techs, tickets, siteList, positions, inv, aiDispatches, factory] =
    await Promise.all([
    db.ticket.count({
      where: {
        tenantId: tenant.id,
        status: { notIn: ["RESOLVED", "INVOICED", "CLOSED", "CANCELLED"] },
      },
    }),
    db.ticket.count({
      where: {
        tenantId: tenant.id,
        priority: "P1_CRITICAL",
        status: { notIn: ["RESOLVED", "INVOICED", "CLOSED", "CANCELLED"] },
      },
    }),
    db.ticket.findMany({
      where: {
        tenantId: tenant.id,
        slaDueAt: { lt: riskAt },
        status: { notIn: ["RESOLVED", "INVOICED", "CLOSED", "CANCELLED"] },
      },
      include: { customer: true },
      take: 5,
      orderBy: { slaDueAt: "asc" },
    }),
    db.technician.findMany({ where: { tenantId: tenant.id } }),
    db.ticket.findMany({
      where: { tenantId: tenant.id },
      include: {
        customer: true,
        asset: true,
        workOrders: { include: { assignments: { include: { technician: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    db.site.findMany({
      where: { customer: { tenantId: tenant.id } },
      include: { customer: true },
      take: 100,
    }),
    db.position.findMany({
      where: { tenantId: tenant.id },
      orderBy: { recordedAt: "desc" },
      take: 200,
    }),
    db.invoice.aggregate({ where: { tenantId: tenant.id }, _sum: { totalCents: true } }),
    db.auditEvent.count({ where: { action: { in: ["AI_DISPATCH", "AI_REVIEW"] }, ticket: { tenantId: tenant.id } } }),
    factoryStatus(),
  ]);
  const mapSites = siteList.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    sub: s.customer.name,
  }));
  const liveByTech = new Map<string, { lat: number; lng: number; at: Date }>();
  for (const p of positions) {
    if (p.technicianId && !liveByTech.has(p.technicianId)) {
      liveByTech.set(p.technicianId, { lat: p.lat, lng: p.lng, at: p.recordedAt });
    }
  }
  const mapTechs = techs.map((t) => {
    const live = liveByTech.get(t.id);
    // eslint-disable-next-line react-hooks/purity
    const ageMin = live ? Math.round((Date.now() - new Date(live.at).getTime()) / 60000) : null;
    return {
      id: t.id,
      name: t.name,
      lat: live?.lat ?? t.lat,
      lng: live?.lng ?? t.lng,
      status: t.status,
      sub: live
        ? `Position mise à jour il y a ${ageMin! < 1 ? "moins d’1 min" : `${ageMin} min`}`
        : "Position de base",
    };
  });

  const kpis = [
    {
      label: "Interventions en cours",
      value: String(open),
      sub: p1 > 0 ? `${p1} urgente${p1 > 1 ? "s" : ""}` : "Aucune urgence",
      icon: Siren,
      accent: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
    },
    {
      label: "À traiter sous 4 h",
      value: String(slaRisk.length),
      sub: "Échéance proche",
      icon: Timer,
      accent: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
    },
    {
      label: "Techniciens sur le terrain",
      value: `${techs.filter((t) => t.status === "ON_JOB").length}/${techs.length}`,
      sub: "Équipe du jour",
      icon: MapPin,
      accent: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40",
    },
    {
      label: "Facturé",
      value: mad(inv._sum.totalCents ?? 0),
      sub: "Total des factures",
      icon: CircleDollarSign,
      accent: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Aujourd’hui · {tenant.name}
          </div>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Vue d’ensemble
          </h1>
          <p className="mt-1 max-w-2xl text-[14px] text-slate-600 dark:text-slate-300">
            Les interventions du jour, les urgences et l’équipe sur le terrain.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/planning">
            <Button variant="secondary">
              <CalendarDays /> Voir le planning
            </Button>
          </Link>
          <Link href="/tickets/new">
            <Button>＋ Nouvelle intervention</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 transition-shadow hover:shadow-md dark:hover:border-slate-700 dark:hover:shadow-none">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${k.accent}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[12.5px] font-medium text-slate-600 dark:text-slate-300">{k.label}</div>
                <div className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-slate-100">{k.value}</div>
              </div>
            </div>
            <div className="mt-2 text-[12.5px] text-slate-600 dark:text-slate-400">{k.sub}</div>
          </Card>
        ))}
      </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-[#FFFBF5] px-4 py-3 text-[13px] dark:border-orange-900/50 dark:from-orange-950/30 dark:to-[#1C1917]">
        <div className="flex items-center gap-2 font-semibold text-[#9A3412] dark:text-orange-200">
          <Sparkles className="h-4 w-4" />
          Revue IA
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            factory.configured && factory.reachable
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
          }`}>
            {factory.configured && factory.reachable ? "Agent Factory connecté" : factory.configured ? "injoignable" : "non configuré"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#9A3412]/80 dark:text-orange-200/80">
          <span>{aiDispatches} revue{aiDispatches === 1 ? "" : "s"} assistée{aiDispatches === 1 ? "" : "s"}</span>
          <Link href="/settings" className="font-semibold underline">Configurer</Link>
        </div>
      </div>

<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                Interventions à suivre
              </div>
              <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
                Les plus récentes, urgences en premier.
              </div>
            </div>
            <Link
              href="/tickets"
              className="flex items-center gap-1 text-[13px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Intervention</th>
                  <th>Client / équipement</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Technicien</th>
                  <th>À traiter avant</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
                      >
                        {t.number}
                      </Link>
                      <div className="max-w-[260px] truncate text-slate-600 dark:text-slate-300">
                        {t.title}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {t.customer.name}
                      </div>
                      <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
                        {t.asset?.name ?? "—"}
                      </div>
                    </td>
                    <td>
                      <Badge className={priorityTone(t.priority)}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                    </td>
                    <td>
                      <Badge className={statusTone(t.status)}>{STATUS_LABEL[t.status]}</Badge>
                    </td>
                    <td className="text-slate-700 dark:text-slate-300">
                      {t.workOrders[0]?.assignments[0]?.technician.name ?? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          À assigner
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {fmtDate(t.slaDueAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-[13.5px] font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Urgences à traiter
            </div>
            <div className="mt-3 space-y-2">
              {slaRisk.length === 0 && (
                <div className="text-[13px] text-slate-700 dark:text-slate-300">
                  Aucune urgence. Tout est sous contrôle.
                </div>
              )}
              {slaRisk.map((t) => (
                <Link
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  className="block rounded-lg border border-amber-200 bg-white p-3 hover:shadow-sm dark:border-amber-900/60 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                      {t.number}
                    </span>
                    <Badge className={priorityTone(t.priority)}>
                      {PRIORITY_LABEL[t.priority]}
                    </Badge>
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-slate-700 dark:text-slate-300">
                    {t.title}
                  </div>
                  <div className="mt-1 text-[12.5px] font-semibold text-amber-800 dark:text-amber-400">
                    À traiter avant : {fmtDate(t.slaDueAt)}
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
              Carte de l’équipe
            </div>
            <div className="mt-1 text-[12.5px] text-slate-600 dark:text-slate-400">
              Techniciens et sites clients en un coup d’œil.
            </div>
            <div className="mt-3 h-[240px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <TechMap techs={mapTechs} sites={mapSites} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-slate-600 dark:text-slate-400">
              <span>
                <b className="text-emerald-600">●</b> Disponible
              </span>
              <span>
                <b className="text-blue-600">●</b> En mission
              </span>
              <span>
                <b className="text-amber-500">◆</b> Site client
              </span>
            </div>
            <Link href="/planning">
              <Button variant="secondary" className="mt-3 w-full">
                Voir le planning
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
