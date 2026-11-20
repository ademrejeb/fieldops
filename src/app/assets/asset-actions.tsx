"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ux/modal";
import { toast } from "@/components/ux/toast";

export type AssetOpt = { id: string; name: string };
export type SiteOpt = { id: string; name: string; customerName?: string };
export type Asset = { id: string; name: string; serialNo: string; siteId: string; assetTypeId: string; healthScore: number; iotDeviceId: string };

async function save(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur");
}

export function AssetButton({ asset, sites, types }: { asset?: Asset; sites: SiteOpt[]; types: AssetOpt[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: asset?.name ?? "", serialNo: asset?.serialNo ?? "",
    siteId: asset?.siteId ?? sites[0]?.id ?? "", assetTypeId: asset?.assetTypeId ?? types[0]?.id ?? "",
    healthScore: asset?.healthScore ?? 100, iotDeviceId: asset?.iotDeviceId ?? "",
  });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (asset) await save(`/api/assets/${asset.id}`, "PATCH", form);
      else await save("/api/assets", "POST", form);
      toast(asset ? "Équipement mis à jour." : "Équipement enregistré.");
      setOpen(false);
      router.refresh();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      {asset ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Ajouter un équipement</Button>
      )}
      {open && (
        <Modal title={asset ? "Modifier l’équipement" : "Nouvel équipement"} sub="Historique, garantie et fiche technique au même endroit." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Ascenseur Tour A — N°2" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>N° de série *</Label><Input value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} required placeholder="KONE-MS-…" className="font-mono" /></div>
              <div><Label>État (%)</Label><Input type="number" min={0} max={100} value={form.healthScore} onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Site *</Label>
              <Select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}{s.customerName ? ` — ${s.customerName}` : ""}</option>)}
              </Select>
            </div>
            <div><Label>Type d’équipement *</Label>
              <Select value={form.assetTypeId} onChange={(e) => setForm({ ...form, assetTypeId: e.target.value })}>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div><Label>Identifiant de l’équipement connecté (optionnel)</Label><Input value={form.iotDeviceId} onChange={(e) => setForm({ ...form, iotDeviceId: e.target.value })} placeholder="Ex: compteur-01" className="font-mono" /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={busy}>{busy ? "…" : asset ? "Enregistrer" : "Enregistrer l’équipement"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
