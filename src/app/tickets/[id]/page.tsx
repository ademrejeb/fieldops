import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { customerScope } from "@/lib/require-auth";
import { fmtDate, mad, CHANNEL_LABEL, EVENT_LABEL, ACTOR_LABEL, JOB_LABEL, PRIORITY_LABEL, STATUS_LABEL, humanizeDetail, priorityTone, statusTone } from "@/lib/format";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { ConfirmDelete } from "@/components/ux/confirm";
import { StatusChanger } from "./status-changer";
import { SuggestAssign } from "./suggest-assign";
import { Bot, FileText, MapPin, User } from "lucide-react";
import { diagnose } from "@/lib/diagnostics-kb";

export const dynamic = "force-dynamic";

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      customer: true,
      asset: { include: { site: true, assetType: true } },
      workOrders: { include: { assignments: { include: { technician: true } }, executions: true, parts: { include: { item: true } }, reports: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();
  const { role, scopedCustomerId } = await customerScope();
  if (scopedCustomerId && ticket.customerId !== scopedCustomerId) notFound();
  const canDelete = (role === "MANAGER" || role === "ADMIN") && ["NEW", "QUALIFIED", "SCHEDULED", "CANCELLED"].includes(ticket.status);
  const diag = diagnose(ticket.errorCode, `${ticket.title} ${ticket.description}`);
  const sameCode = await db.ticket.count({ where: { tenantId: ticket.tenantId, errorCode: ticket.errorCode } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-bold text-slate-500 dark:text-slate-400">{ticket.number}</span>
            <Badge className={priorityTone(ticket.priority)}>{PRIORITY_LABEL[ticket.priority]}</Badge>
            <Badge className={statusTone(ticket.status)}>{STATUS_LABEL[ticket.status]}</Badge>
            <span className="text-[12.5px] text-slate-500 dark:text-slate-400">· {CHANNEL_LABEL[ticket.channel] ?? ticket.channel} · à traiter avant {fmtDate(ticket.slaDueAt)}</span>
          </div>
          <h1 className="mt-1 max-w-3xl text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100">{ticket.title}</h1>
          <p className="mt-1 max-w-3xl text-[13.5px] text-slate-500 dark:text-slate-400">{ticket.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChanger id={ticket.id} current={ticket.status} />
          {canDelete && <ConfirmDelete url={`/api/tickets/${ticket.id}`} label={ticket.number} redirectTo="/tickets" />}
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
        <Bot className="h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-blue-900 dark:text-blue-200">
              Diagnostic suggéré · {diag.match === "exact" ? "code exact" : diag.match === "fuzzy" ? "code proche" : diag.match === "symptom" ? "d'après symptômes" : "générique"} · confiance {Math.round((ticket.aiConfidence || diag.confidence) * 100)}%
            </span>
            {ticket.errorCode && <span className="rounded bg-blue-700 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{ticket.errorCode}</span>}
            <span className="text-[11.5px] text-blue-700 dark:text-blue-300">{sameCode} cas similaires en historique</span>
          </div>
          <div className="mt-1 text-[13px] font-semibold text-blue-900 dark:text-blue-200">{diag.title}</div>
          <div className="mt-0.5 text-[12.5px] text-blue-900/80 dark:text-blue-200/80">Causes probables: {diag.likelyCauses.join(" · ")}</div>
          <ol className="mt-2 space-y-1">
            {diag.steps.slice(0, 5).map((s) => <li key={s} className="text-[12.5px] text-blue-900/90 dark:text-blue-200/90">{s}</li>)}
          </ol>
          {diag.parts.length > 0 && (
            <div className="mt-2 text-[12px] text-blue-800 dark:text-blue-300">Pièces suggérées: {diag.parts.map((p) => `${p.label} (${p.sku})`).join(" · ")}</div>
          )}
          <div className="mt-1 text-[11px] text-blue-700/70 dark:text-blue-400/70">Source: {diag.source}</div>
        </div>
      </div>
      <SuggestAssign ticketId={ticket.id} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-5">
            <div className="text-[13px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Historique de l’intervention</div>
            <div className="mt-4">
              {ticket.events.map((e) => (
                <div key={e.id} className="timeline-item relative flex gap-3 pb-5">
                  <div className="timeline-dot relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-700">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200">{EVENT_LABEL[e.action] ?? e.action.replace(/_/g, " ")}{e.fromStatus && ` · ${STATUS_LABEL[e.fromStatus] ?? e.fromStatus} → ${STATUS_LABEL[e.toStatus] ?? e.toStatus}`}</span>
                      <span className="whitespace-nowrap text-[11.5px] text-slate-400 dark:text-slate-500">{fmtDate(e.createdAt)}</span>
                    </div>
                    <div className="text-[12.5px] text-slate-600 dark:text-slate-300">par <b>{ACTOR_LABEL[e.actor] ?? e.actor}</b>{e.detail && ` — ${humanizeDetail(e.detail)}`}</div>
                  </div>
                </div>
              ))}
              {ticket.events.length === 0 && <div className="text-[13px] text-slate-500 dark:text-slate-400">Aucun événement.</div>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Missions ({ticket.workOrders.length})</div>
              <Link href="/planning"><Button variant="secondary" size="sm">Planifier / Assigner</Button></Link>
            </div>
            <div className="mt-3 space-y-3">
              {ticket.workOrders.map((wo) => (
                <div key={wo.id} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-bold">{wo.number} · {JOB_LABEL[wo.jobType] ?? wo.jobType}</span>
                    <Badge className={statusTone(wo.status)}>{STATUS_LABEL[wo.status] ?? wo.status}</Badge>
                  </div>
                  <div className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                    Planifié: {fmtDate(wo.scheduledStart)} · {wo.estimatedMin} min · {wo.assignments.map((a) => a.technician.name).join(", ") || "non assigné"}
                  </div>
                  {wo.parts.length > 0 && (
                    <div className="mt-2 text-[12.5px] text-slate-600 dark:text-slate-300">
                      Pièces: {wo.parts.map((p) => `${p.item.name} ×${p.qty} (${mad(p.unitPrice * p.qty)})`).join(" · ")}
                    </div>
                  )}
                  {wo.reports[0]?.signedBy && (
                    <div className="mt-1 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400">✓ Signé par {wo.reports[0].signedBy} · note {wo.reports[0].rating}/5</div>
                  )}
                </div>
              ))}
              {ticket.workOrders.length === 0 && <div className="text-[13px] text-slate-600 dark:text-slate-400">Pas encore de mission — créez-la depuis le Planning.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-[13px] font-bold"><User className="h-4 w-4" /> Client & site</div>
            <div className="mt-2 text-[14px] font-bold">{ticket.customer.name}</div>
            <div className="text-[12.5px] text-slate-500 dark:text-slate-400">{ticket.customer.phone} · {ticket.customer.address}</div>
            {ticket.asset && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12.5px] dark:bg-slate-800/60">
                <div className="font-bold text-slate-800 dark:text-slate-200">{ticket.asset.name}</div>
                <div className="font-mono text-slate-500 dark:text-slate-400">N° {ticket.asset.serialNo} · état {ticket.asset.healthScore}%</div>
                <div className="mt-1 flex items-center gap-1 text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" /> {ticket.asset.site.name} — {ticket.asset.site.address}</div>
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-[13px] font-bold">Passage en facture</div>
            <div className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">Le rapport signé devient une facture, prête à envoyer.</div>
            <Link href="/billing"><Button variant="dark" className="mt-3 w-full">Voir facturation</Button></Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
