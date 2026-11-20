"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/primitives";

type Lookup = { customers: { id: string; name: string }[]; assets: { id: string; name: string; serialNo: string }[] };

export default function NewTicketPage() {
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookup>({ customers: [], assets: [] });
  const [form, setForm] = useState({ customerId: "", assetId: "", title: "", description: "", priority: "P3_NORMAL", channel: "PHONE", errorCode: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<{ title: string; confidence: number; match: string } | null>(null);

  useEffect(() => {
    fetch("/api/lookups").then((r) => r.json()).then((d) => {
      setLookups(d);
      // Portail client: un seul compte → présélectionné et verrouillé
      if (d.customers?.length === 1) setForm((f) => ({ ...f, customerId: f.customerId || d.customers[0].id }));
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!form.errorCode && form.title.length < 6) {
        setPreview(null);
        return;
      }
      fetch(`/api/diagnostics?code=${encodeURIComponent(form.errorCode)}&q=${encodeURIComponent(form.title)}`)
        .then((r) => r.json()).then((d) => setPreview(d)).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.errorCode, form.title]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr("");
    const res = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr("Vérifiez les champs (titre min 4 caractères, client requis)."); return; }
    router.push(`/tickets/${data.ticket.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Nouvelle intervention</h1>
        <p className="text-[14px] text-slate-600 dark:text-slate-300">Décrivez la demande, nous proposons le technicien le plus adapté.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label>Client *</Label>
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required className="w-full">
              <option value="">— Choisir —</option>
              {lookups.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>Équipement concerné</Label>
            <Select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} className="w-full">
              <option value="">— Optionnel —</option>
              {lookups.assets.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.serialNo}</option>)}
            </Select>
          </div>
          <div>
            <Label>Comment la demande est arrivée</Label>
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full">
              <option value="PHONE">Téléphone</option><option value="EMAIL">Email</option>
              <option value="PORTAL">Portail client</option><option value="IOT">Alerte automatique</option>
              <option value="WHATSAPP">WhatsApp</option>
            </Select>
          </div>
          <div>
            <Label>Priorité</Label>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full">
              <option value="P1_CRITICAL">Critique (bloqué / sécurité)</option>
              <option value="P2_HIGH">Haute</option>
              <option value="P3_NORMAL">Normale</option>
              <option value="P4_LOW">Basse</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Titre *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Ascenseur bloqué — pers. à l'intérieur (Tour A N°2)" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Code erreur (optionnel)</Label>
            <Input value={form.errorCode} onChange={(e) => setForm({ ...form, errorCode: e.target.value })} placeholder="E30, U4, F-12…" className="font-mono" />
          </div>
          <div className="flex items-end text-[12px] text-slate-500 dark:text-slate-400">
            {preview ? (
              <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
                🤖 {preview.title} · {Math.round(preview.confidence * 100)} % de correspondance
              </span>
            ) : (
              "Un diagnostic est proposé dès qu’un code erreur est saisi."
            )}
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
            placeholder="Symptômes, étage, accès site, contact sur place…" />
        </div>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>Annuler</Button>
          <Button loading={saving}>{saving ? "Création…" : "Créer l’intervention"}</Button>
        </div>
      </form>
    </div>
  );
}
