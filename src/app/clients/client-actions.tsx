"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { GeoPicker } from "@/components/geo/geo-picker";
import { Modal } from "@/components/ux/modal";
import { toast } from "@/components/ux/toast";

type Customer = { id: string; name: string; type: string; email: string; phone: string; address: string };
type Site = { id: string; customerId: string; name: string; address: string; city: string; contactName: string; contactPhone: string; accessCode: string; lat: number; lng: number };

async function save(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return data;
}

export function CustomerButton({ customer }: { customer?: Customer }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: customer?.name ?? "", type: customer?.type ?? "B2B", email: customer?.email ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (customer) await save(`/api/customers/${customer.id}`, "PATCH", form);
      else await save("/api/customers", "POST", form);
      toast(customer ? "Client mis à jour." : "Client créé.");
      setOpen(false);
      router.refresh();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      {customer ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> Ajouter un client</Button>
      )}
      {open && (
        <Modal title={customer ? "Modifier le client" : "Nouveau client"} sub="Ajoutez ses coordonnées, puis ses sites d’intervention." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom / Société *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: AnfaPark Mall" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="B2B">Entreprise</option><option value="B2C">Particulier</option></Select></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 …" /></div>
            </div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@…" /></div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Bd d'Anfa, Casablanca" /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={busy}>{busy ? "…" : customer ? "Enregistrer" : "Créer le client"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function SiteButton({ customerId, site }: { customerId: string; site?: Site }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: site?.name ?? "", address: site?.address ?? "", city: site?.city ?? "Casablanca",
    contactName: site?.contactName ?? "", contactPhone: site?.contactPhone ?? "", accessCode: site?.accessCode ?? "",
    lat: site?.lat ?? 33.5731, lng: site?.lng ?? -7.5898,
  });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (site) await save(`/api/sites/${site.id}`, "PATCH", form);
      else await save("/api/sites", "POST", { ...form, customerId });
      toast(site ? "Site mis à jour." : "Site ajouté.");
      setOpen(false);
      router.refresh();
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
              className={`text-[12px] font-semibold ${site ? "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" : "rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-blue-700 hover:bg-blue-50 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-blue-950/40"}`}>
        {site ? "Modifier" : "+ Ajouter un site"}
      </button>
      {open && (
        <Modal title={site ? "Modifier le site" : "Nouveau site"} sub="Bâtiment / accès technicien." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom du site *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Tour A — Accès livraison" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact sur place</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
              <div><Label>Tél. contact</Label><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
            </div>
            <div><Label>Code d’accès (digicode, badge…)</Label><Input value={form.accessCode} onChange={(e) => setForm({ ...form, accessCode: e.target.value })} placeholder="Ex: 4521B" /></div>
            <div>
              <Label>Position sur la carte — sert à estimer le trajet</Label>
              <GeoPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => setForm({ ...form, lat, lng })} />
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input type="number" step="0.00001" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} /></div>
                <div><Label>Longitude</Label><Input type="number" step="0.00001" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={busy}>{busy ? "…" : site ? "Enregistrer" : "Ajouter le site"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
