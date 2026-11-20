"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui/primitives";
import { STATUS_LABEL } from "@/lib/format";

const FLOW = ["NEW", "QUALIFIED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "RESOLVED", "INVOICED", "CLOSED"];

export function StatusChanger({ id, current }: { id: string; current: string }) {
  const [next, setNext] = useState(current);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function apply() {
    setBusy(true);
    await fetch(`/api/tickets/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, actor: "dispatcher", note: "Mise à jour manuelle" }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Select value={next} onChange={(e) => setNext(e.target.value)}>
        {FLOW.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
      </Select>
      <Button onClick={apply} disabled={busy || next === current}>{busy ? "…" : "Changer statut"}</Button>
    </div>
  );
}
