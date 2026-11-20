"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Warehouse } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ux/modal";
import { ConfirmDelete } from "@/components/ux/confirm";
import { toast } from "@/components/ux/toast";

export type Loc = { id: string; name: string; label: string; kind: string; inUse: number };
export type TechOpt = { id: string; name: string };

/** Manage real stock locations — every location dropdown in the app reads from here. */
export function LocationManager({ locations, techs }: { locations: Loc[]; techs: TechOpt[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", label: "", kind: "DEPOT", technicianId: "" });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, technicianId: form.technicianId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast("Emplacement créé.");
      setForm({ name: "", label: "", kind: "DEPOT", technicianId: "" });
      router.refresh();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
        <Warehouse className="h-3.5 w-3.5" /> Emplacements ({locations.length})
      </button>
      {open && (
        <Modal title="Emplacements de stock" sub="Dépôts + camionnettes. Utilisés partout: fiches pièces, imports, filtres." onClose={() => setOpen(false)}>
          <div className="space-y-2">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <div>
                  <span className="font-mono text-[13px] font-bold">{l.name}</span>
                  <span className="ml-2 text-[12.5px] text-slate-600 dark:text-slate-300">{l.label || (l.kind === "VAN" ? "Camionnette" : "Dépôt")}</span>
                  <span className="ml-2 text-[11.5px] text-slate-400 dark:text-slate-500">{l.inUse} pièce(s)</span>
                </div>
                <ConfirmDelete url={`/api/locations/${l.id}`} label={l.name} small />
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="VAN-03" className="font-mono" /></div>
              <div><Label>Type</Label>
                <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="DEPOT">Dépôt</option>
                  <option value="VAN">Camionnette</option>
                </Select>
              </div>
            </div>
            <div><Label>Libellé</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Camionnette Karim" /></div>
            {form.kind === "VAN" && (
              <div><Label>Technicien affecté</Label>
                <Select value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}>
                  <option value="">— Aucun —</option>
                  {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={busy}><Plus /> {busy ? "…" : "Ajouter"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
