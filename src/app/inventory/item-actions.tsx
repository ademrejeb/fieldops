"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ux/modal";
import { toast } from "@/components/ux/toast";

export type Item = {
  id: string; sku: string; name: string; category: string;
  qtyOnHand: number; unitPrice: number; reorderPt: number; location: string;
};

export type LocOpt = { name: string; label: string };

async function save(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur");
}

export function ItemButton({ item, locations }: { item?: Item; locations: LocOpt[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    sku: item?.sku ?? "", name: item?.name ?? "", category: item?.category ?? "PART",
    qtyOnHand: item?.qtyOnHand ?? 0, unitPrice: item ? item.unitPrice / 100 : 0,
    reorderPt: item?.reorderPt ?? 5, location: item?.location ?? "MAIN",
  });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, sku: form.sku.toUpperCase(), unitPrice: Math.round(Number(form.unitPrice) * 100) };
      if (item) await save(`/api/inventory/${item.id}`, "PATCH", body);
      else await save("/api/inventory", "POST", body);
      toast(item ? "Pièce mise à jour." : "Pièce créée.");
      setOpen(false);
      router.refresh();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      {item ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Ajouter une pièce</Button>
      )}
      {open && (
        <Modal title={item ? "Modifier la pièce" : "Nouvelle pièce"} sub="Référentiel stock: dépôt + camionnettes." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU / Réf *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="KONE-SENS-DOOR" className="font-mono" /></div>
              <div><Label>Emplacement *</Label>
                <Select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                  {locations.length === 0 && <option value="MAIN">MAIN</option>}
                  {locations.map((l) => <option key={l.name} value={l.name}>{l.name}{l.label ? ` — ${l.label}` : ""}</option>)}
                </Select>
              </div>
            </div>
            <div><Label>Désignation *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Stock</Label><Input type="number" min={0} value={form.qtyOnHand} onChange={(e) => setForm({ ...form, qtyOnHand: Number(e.target.value) })} /></div>
              <div><Label>Prix (MAD)</Label><Input type="number" min={0} step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} /></div>
              <div><Label>Seuil alerte</Label><Input type="number" min={0} value={form.reorderPt} onChange={(e) => setForm({ ...form, reorderPt: Number(e.target.value) })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={busy}>{busy ? "…" : item ? "Enregistrer" : "Créer"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/** Quick stock +/- stepper (réception / sortie comptoir). */
export function StockStepper({ id, qty }: { id: string; qty: number }) {
  const router = useRouter();
  async function adjust(delta: number) {
    const res = await fetch(`/api/inventory/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adjust: delta }) });
    if (!res.ok) toast("Ajustement impossible.", "error");
    else { toast(delta > 0 ? `+${delta} en stock.` : `${delta} sorti du stock.`); router.refresh(); }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button onClick={() => adjust(-1)} title="Sortie −1" className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Minus className="h-3 w-3" /></button>
      <b className="min-w-8 text-center">{qty}</b>
      <button onClick={() => adjust(1)} title="Entrée +1" className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="h-3 w-3" /></button>
    </span>
  );
}
