"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Radio, ShieldCheck, Sparkles, MapPinned, ReceiptText } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/ui/brand-mark";

const isDev = process.env.NODE_ENV !== "production";

const QUICK = [
  { email: "dispatch@fieldops.ma", label: "Répartiteur" },
  { email: "manager@fieldops.ma", label: "Responsable" },
  { email: "tech@fieldops.ma", label: "Technicien" },
  { email: "client@anfa.ma", label: "Client" },
];

export function LoginForm({ basacoreEnabled }: { basacoreEnabled: boolean }) {
  const [email, setEmail] = useState(isDev ? "dispatch@fieldops.ma" : "");
  const [password, setPassword] = useState(isDev ? "FieldOps123!" : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) { setErr("Email ou mot de passe invalide."); return; }
    router.push("/");
    router.refresh();
  }

  async function basacoreLogin() {
    setSsoBusy(true); setErr("");
    await signIn("basacore", { callbackUrl: "/" });
  }

  return (
    <div className="flex min-h-screen bg-[#171310]">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 420px at 18% 8%, rgba(234,88,12,0.30), transparent 62%), radial-gradient(520px 340px at 78% 76%, rgba(132,204,22,0.12), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BrandMark size={40} />
          <div>
            <BrandWordmark className="block text-[20px] leading-none text-white" />
            <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-400">
              <Radio className="h-3 w-3 text-[#A3E635]" /> El khedma, mrigla.
            </div>
          </div>
        </div>

        <div className="relative max-w-[520px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-200">
            <Sparkles className="h-3 w-3 text-lime-300" />
            Dispatch augmenté
          </div>
          <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-[-0.035em]">
            Le service,
            <br />
            sans détour.
          </h1>
          <p className="mt-4 max-w-[460px] text-[14px] leading-relaxed text-stone-400">
            Une demande publique arrive, l’agent la qualifie, prépare la facture et propose le bon
            technicien. Le répartiteur garde la décision finale — et la preuve.
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-blue-200">
                <Sparkles className="h-4 w-4" />
              </span>
              <span>
                <strong className="block text-[13px] font-semibold text-white">
                  Dispatch IA, avec repli déterministe
                </strong>
                <span className="text-[12px] text-slate-400">
                  Compétences, ETA, charge et historique réel. L’IA propose, le service valide.
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-emerald-200">
                <MapPinned className="h-4 w-4" />
              </span>
              <span>
                <strong className="block text-[13px] font-semibold text-white">
                  Planning et terrain connectés
                </strong>
                <span className="text-[12px] text-slate-400">
                  Positions GPS, missions mobiles et suivi d’exécution, sans double saisie.
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-amber-200">
                <ReceiptText className="h-4 w-4" />
              </span>
              <span>
                <strong className="block text-[13px] font-semibold text-white">
                  Du rapport à la facture
                </strong>
                <span className="text-[12px] text-slate-400">
                  Checklist, pièces consommées, signature et facture sur la même intervention.
                </span>
              </span>
            </li>
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-[11.5px] text-stone-500">
          <span>Auto-hébergé · Données isolées par entreprise</span>
          <span>Tunis · Élévateurs · Climatisation · Sécurité</span>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-[#FAF7F1] p-6 dark:bg-[#12100E]">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <form onSubmit={submit} className="w-full max-w-[420px] rounded-3xl border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-[#1C1917]">
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <BrandMark size={34} />
            <div>
              <BrandWordmark className="block text-[17px] leading-none text-stone-900 dark:text-white" />
              <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">El khedma, mrigla.</div>
            </div>
          </div>
          <div className="text-[20px] font-bold tracking-tight">Connexion</div>
          <div className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">Accédez à votre espace de gestion.</div>

          {basacoreEnabled && (
            <>
              <button
                type="button"
                onClick={basacoreLogin}
                disabled={ssoBusy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#171310] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2A231D] disabled:pointer-events-none disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                <ShieldCheck className="h-4 w-4" />
                {ssoBusy ? "Redirection vers Basacore…" : "Continuer avec Basacore"}
              </button>
              <div className="mt-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                ou avec un mot de passe
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
              </div>
            </>
          )}

          <div className="mt-5 space-y-3">
            <div><Label>Email pro</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></div>
            <div><Label>Mot de passe</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></div>
          </div>
          {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{err}</div>}
          <Button className="mt-4 w-full">{busy ? "Vérification…" : "Se connecter →"}</Button>
          <div className="mt-3 text-center text-[11.5px] text-stone-500 dark:text-stone-400">
            Une demande sans compte ?{" "}
            <Link href="/t/demo-casablanca/request" className="font-semibold text-[#C2410C] hover:underline">
              Ouvrir le formulaire public
            </Link>
          </div>
          {isDev ? (
            <div className="mt-5 rounded-xl border border-dashed border-stone-200 p-3 dark:border-stone-700">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500">
                Comptes de démonstration · développement
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {QUICK.map((q) => (
                  <button key={q.email} type="button" onClick={() => setEmail(q.email)}
                    className={`rounded-lg border px-2 py-1.5 text-left text-[12px] font-semibold ${email === q.email ? "border-[#C2410C] bg-orange-50 text-[#9A3412] dark:bg-orange-950/40 dark:text-orange-300" : "border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"}`}>
                    {q.label}<div className="truncate font-mono text-[10.5px] font-normal opacity-70">{q.email}</div>
                  </button>
                ))}
              </div>
              <div className="mt-2 font-mono text-[11px] text-stone-400 dark:text-stone-500">Mot de passe commun : FieldOps123!</div>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
