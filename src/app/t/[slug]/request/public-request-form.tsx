"use client";

import { useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";

type Priority = "P1_CRITICAL" | "P2_HIGH" | "P3_NORMAL" | "P4_LOW";
type AssetCategory = "ELEVATOR" | "HVAC" | "SECURITY" | "OTHER";

const PRIORITIES: { value: Priority; label: string; hint: string }[] = [
  { value: "P1_CRITICAL", label: "Bloqué", hint: "Sécurité / plus de service" },
  { value: "P2_HIGH", label: "Sous 24 h", hint: "Impact fort" },
  { value: "P3_NORMAL", label: "Cette semaine", hint: "Gênant mais stable" },
  { value: "P4_LOW", label: "Quand possible", hint: "Confort / entretien" },
];

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: "ELEVATOR", label: "Ascenseur" },
  { value: "HVAC", label: "Climatisation" },
  { value: "SECURITY", label: "Sécurité" },
  { value: "OTHER", label: "Autre" },
];

type Success = { number: string; statusUrl: string };

export function PublicRequestForm({
  slug,
  tenantName,
}: {
  slug: string;
  tenantName: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<AssetCategory>("ELEVATOR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [priority, setPriority] = useState<Priority>("P2_HIGH");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/public/${slug}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          address,
          city,
          assetCategory: category,
          title,
          description,
          errorCode,
          priority,
          consent,
          website,
          startedAt,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        number?: string;
        statusUrl?: string;
      };
      if (!response.ok || !payload.number || !payload.statusUrl) {
        setError(payload.error ?? "Envoi impossible. Réessayez dans un instant.");
        return;
      }
      setSuccess({ number: payload.number, statusUrl: payload.statusUrl });
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.35)]">
        <BrandMark size={48} />
        <h2 className="mt-4 text-[24px] font-extrabold tracking-tight">
          Demande reçue. Merci.
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-stone-600">
          Votre demande <strong className="font-mono">{success.number}</strong> est en cours
          d’analyse par l’agent Khedma. L’équipe {tenantName} valide ensuite l’intervention.
        </p>
        <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-[12.5px] text-orange-900">
          Gardez ce lien : il suit le statut sans compte.
        </div>
        <Link
          href={success.statusUrl}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#C2410C] px-4 text-[13.5px] font-semibold text-white hover:bg-[#9A3412]"
        >
          Suivre ma demande →
        </Link>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-3 w-full text-center text-[12.5px] font-semibold text-stone-500 hover:text-stone-800"
        >
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.35)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-tight">Décrire la demande</h2>
          <p className="mt-1 text-[12.5px] text-stone-500">
            Aucun compte requis · réponse suivie par numéro.
          </p>
        </div>
        <span className="rounded-full bg-[#F4ECDF] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A3412]">
          Sécurisé
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Votre nom
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="Yassine Ben Ali"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Téléphone
          </span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            minLength={6}
            maxLength={30}
            inputMode="tel"
            autoComplete="tel"
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="+216 22 000 000"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Email <span className="font-medium normal-case tracking-normal text-stone-400">(optionnel)</span>
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            maxLength={160}
            autoComplete="email"
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="vous@exemple.tn"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Ville
          </span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            maxLength={80}
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="Tunis"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Adresse de l’intervention
          </span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
            minLength={5}
            maxLength={200}
            autoComplete="street-address"
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="12 rue de Rome, Tunis"
          />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
          Type d’équipement
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              aria-pressed={category === option.value}
              className={
                "h-10 rounded-xl border px-2 text-[12.5px] font-semibold transition-colors " +
                (category === option.value
                  ? "border-[#C2410C] bg-[#C2410C] text-white"
                  : "border-stone-200 bg-[#FBFAF7] text-stone-600 hover:border-orange-200")
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Le problème en une phrase
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={4}
            maxLength={120}
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="Ascenseur bloqué au 4e étage"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Détails
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 py-2.5 text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="Depuis quand ? Bruit, code affiché, personnes bloquées…"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
            Code erreur <span className="font-medium normal-case tracking-normal text-stone-400">(si affiché)</span>
          </span>
          <input
            value={errorCode}
            onChange={(event) => setErrorCode(event.target.value)}
            maxLength={40}
            className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-[#FBFAF7] px-3 font-mono text-[14px] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-orange-100"
            placeholder="E30"
          />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
          Urgence
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PRIORITIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPriority(option.value)}
              aria-pressed={priority === option.value}
              className={
                "rounded-xl border px-3 py-2 text-left transition-colors " +
                (priority === option.value
                  ? "border-[#C2410C] bg-orange-50 ring-1 ring-[#C2410C]"
                  : "border-stone-200 bg-[#FBFAF7] hover:border-orange-200")
              }
            >
              <span className="block text-[12.5px] font-bold text-stone-800">{option.label}</span>
              <span className="block text-[11px] text-stone-500">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 flex items-start gap-2.5 rounded-xl border border-stone-200 bg-[#FBFAF7] p-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 accent-[#C2410C]"
        />
        <span className="text-[12px] leading-relaxed text-stone-600">
          J’accepte que {tenantName} utilise ces informations pour traiter ma demande. Aucun
          compte n’est créé.
        </span>
      </label>

      <input
        type="text"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <button
        type="submit"
        disabled={busy || !consent}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171310] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#2A231D] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Envoi…" : "Envoyer la demande →"}
      </button>
      <p className="mt-3 text-center text-[11px] text-stone-400">
        Protégé contre les envois en masse · aucune donnée revendue.
      </p>
    </form>
  );
}
