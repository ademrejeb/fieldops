"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/primitives";
import { toast } from "@/components/ux/toast";

const NEXT = ["SENT", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"] as const;

export function InvoiceStatus({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function change(next: string) {
    setBusy(true);
    const res = await fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) toast(data.error ?? "Action impossible.", "error");
    else { toast(next === "PAID" ? "Facture encaissée. 💰" : `Facture → ${next}.`); router.refresh(); }
  }

  return (
    <Select value={status} disabled={busy} onChange={(e) => change(e.target.value)} className="w-[150px]">
      {[status, ...NEXT.filter((s) => s !== status)].map((s) => <option key={s} value={s}>{s}</option>)}
    </Select>
  );
}
