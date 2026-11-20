"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui/primitives";

export function BillingClient({ resolved }: { resolved: { id: string; number: string; title: string; customer: { name: string } }[] }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function convert(ticketId: string) {
    setBusy(true);
    await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId }) });
    setBusy(false);
    router.refresh();
  }

  if (resolved.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="text-[13.5px] font-bold">Interventions résolues à facturer ({resolved.length})</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {resolved.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] dark:border-slate-800 dark:bg-slate-800/60">
            <span className="font-mono font-bold">{t.number}</span><span className="max-w-[220px] truncate">{t.title}</span>
            <Button size="sm" onClick={() => convert(t.id)} disabled={busy}>→ Facturer</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
