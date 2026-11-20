"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select } from "@/components/ui/primitives";

type Ranked = { id: string; name: string; score: number; etaMin: number; km: number; reasons: string[]; eligible: boolean; status: string };

const TECH_STATUS: Record<string, string> = {
  AVAILABLE: "Disponible",
  ON_JOB: "En mission",
  OFFLINE: "Hors ligne",
};

export function PlannerClient({ techs, workOrders, unassigned }: {
  techs: { id: string; name: string; status: string }[];
  workOrders: { id: string; number: string }[];
  unassigned: { id: string; number: string; title: string }[];
}) {
  const [ticketId, setTicketId] = useState(unassigned[0]?.id ?? "");
  const [techId, setTechId] = useState(techs[0]?.id ?? "");
  const [suggest, setSuggest] = useState<Ranked[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!ticketId) return;
    fetch(`/api/dispatch/suggest?ticketId=${ticketId}`)
      .then((r) => r.json())
      .then((d) => {
        setSuggest(d.ranked ?? []);
        if (d.ranked?.[0]) setTechId(d.ranked[0].id);
      });
  }, [ticketId]);

  async function autoAssign() {
    if (!ticketId || !techId) return;
    setBusy(true);
    await fetch("/api/workorders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, jobType: "REPAIR", estimatedMin: 90, technicianIds: [techId] }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Intervention à planifier</div>
          <Select value={ticketId} onChange={(e) => setTicketId(e.target.value)} className="w-[280px]">
            {unassigned.map((t) => <option key={t.id} value={t.id}>{t.number} · {t.title.slice(0, 40)}</option>)}
          </Select>
        </div>
        <div>
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Technicien recommandé</div>
          <Select value={techId} onChange={(e) => setTechId(e.target.value)} className="w-[280px]">
            {techs.map((t) => {
              const s = suggest.find((x) => x.id === t.id);
              return <option key={t.id} value={t.id}>{t.name} · {s ? `${s.score}/100 · arrivée ${s.etaMin} min` : (TECH_STATUS[t.status] ?? t.status)}</option>;
            })}
          </Select>
        </div>
        <Button onClick={autoAssign} disabled={busy || !ticketId}>{busy ? "Assignation…" : "Assigner ce technicien"}</Button>
      </div>
      {suggest.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggest.slice(0, 3).map((s, i) => (
            <button key={s.id} onClick={() => setTechId(s.id)}
              className={`rounded-lg border px-3 py-2 text-left text-[12px] ${techId === s.id ? "border-violet-600 bg-violet-50 dark:bg-violet-950/40" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
              <span className="font-bold">#{i + 1} {s.name}</span>
              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">{s.score}</span>
              <div className="mt-0.5 max-w-[300px] truncate text-slate-500 dark:text-slate-400">{s.reasons.join(" · ")}</div>
            </button>
          ))}
          <div className="self-center text-[12.5px] text-slate-600 dark:text-slate-400">Missions en cours : <b>{workOrders.length}</b> · classement selon compétences, distance et disponibilité.</div>
        </div>
      )}
    </Card>
  );
}
