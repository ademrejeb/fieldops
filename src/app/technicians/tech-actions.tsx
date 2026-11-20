"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { GeoPicker } from "@/components/geo/geo-picker";
import { Modal } from "@/components/ux/modal";
import { toast } from "@/components/ux/toast";

export type Tech = {
  id: string; name: string; phone: string; email: string; deviceId: string;
  skills: string[]; certifications: string[]; status: string;
  lat: number; lng: number;
};

const toCSV = (v: string[] | unknown) => (Array.isArray(v) ? (v as string[]).join(", ") : "");
const fromCSV = (s: string) => s.split(/[,;/|]/).map((x) => x.trim().toUpperCase().replace(/\s+/g, "_")).filter(Boolean);

async function save(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur");
}

export function TechButton({ tech }: { tech?: Tech }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: tech?.name ?? "", phone: tech?.phone ?? "", email: tech?.email ?? "", deviceId: tech?.deviceId ?? "",
    skills: toCSV(tech?.skills), certifications: toCSV(tech?.certifications),
    status: tech?.status ?? "AVAILABLE",
    lat: tech?.lat ?? 33.5731, lng: tech?.lng ?? -7.5898,
  });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { name: form.name, phone: form.phone, email: form.email, deviceId: form.deviceId, status: form.status, lat: form.lat, lng: form.lng, skills: fromCSV(form.skills), certifications: fromCSV(form.certifications) };
      if (tech) await save(`/api/technicians/${tech.id}`, "PATCH", body);
      else await save("/api/technicians", "POST", body);
      toast(tech ? "Technicien mis à jour." : "Technicien ajouté.");
      setOpen(false);
      router.refresh();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      {tech ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Ajouter un technicien</Button>
      )}
      {open && (
        <Modal title={tech ? "Modifier le technicien" : "Nouveau technicien"} sub="Renseignez ses compétences et sa zone d’intervention." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Yassine El Amrani" /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 …" /></div>
            </div>
            <div><Label>Email (notifications de mission)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tech@…" /></div>
            <div><Label>Code du traceur du véhicule</Label><Input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="VAN01-GPS" className="font-mono" /></div>
            <div><Label>Compétences (séparées par virgules)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="ELEVATOR, HVAC_VRV, ELECTRICAL" className="font-mono" /></div>
            <div><Label>Certifications / habilitations</Label><Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="KONE_L2, DAIKIN_P" className="font-mono" /></div>
            <div><Label>Statut</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="AVAILABLE">Disponible</option>
                <option value="ON_JOB">En mission</option>
                <option value="OFFLINE">Hors ligne</option>
              </Select>
            </div>
            <div>
              <Label>Point de départ — sert à estimer le temps de trajet</Label>
              <GeoPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => setForm({ ...form, lat, lng })} />
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input type="number" step="0.00001" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} /></div>
                <div><Label>Longitude</Label><Input type="number" step="0.00001" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={busy}>{busy ? "…" : tech ? "Enregistrer" : "Ajouter"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
