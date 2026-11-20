import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { customerScope } from "@/lib/require-auth";
import { mailStatus } from "@/lib/mailer";
import { factoryStatus } from "@/lib/factory-status";
import { PRIORITY_LABEL, CONTRACT_TIER_LABEL } from "@/lib/format";
import { roleLabel } from "@/lib/roles";
import { Card } from "@/components/ui/primitives";
import { TestMail } from "./test-mail";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tenant = await getTenant();
  const { session } = await customerScope();
  const [types, checklists, slas, locs] = await Promise.all([
    db.assetType.findMany({ where: { tenantId: tenant.id } }),
    db.checklistTemplate.findMany({ where: { tenantId: tenant.id } }),
    db.slaPolicy.findMany({ where: { tenantId: tenant.id } }),
    db.stockLocation.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
  ]);
  const mail = mailStatus();
  const factory = await factoryStatus();
  const basacore = session?.user?.authProvider === "basacore" ? session.user.basacore : null;
  return (
    <div className="space-y-4">
      <div><h1 className="text-[22px] font-bold tracking-tight">Réglages</h1>
      <p className="text-[14px] text-slate-600 dark:text-slate-300">Adaptez FieldOps à votre entreprise : équipements, checklists, délais et emails.</p></div>
      {basacore && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-[14px]">Compte connecté</div>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {session?.user?.basacoreRefreshError ? "Connexion à renouveler" : "Connexion sécurisée"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[12.5px] sm:grid-cols-2">
            <div><span className="text-slate-500 dark:text-slate-400">Compte</span><div className="font-mono">{basacore.email ?? basacore.sub}</div></div>
            <div><span className="text-slate-500 dark:text-slate-400">Entreprise</span><div>{session?.user?.tenantSlug}</div></div>
          </div>
          <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
            Rôle dans FieldOps : <b>{roleLabel(session?.user?.role)}</b> · vos identifiants restent sur le serveur.
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="font-bold text-[14px]">Types d’équipements ({types.length})</div>
          {types.map((t) => <div key={t.id} className="mt-2 rounded bg-slate-50 p-2 text-[13px] dark:bg-slate-800/60"><b>{t.name}</b></div>)}</Card>
        <Card className="p-4"><div className="font-bold text-[14px]">Checklists ({checklists.length})</div>
          {checklists.map((c) => <div key={c.id} className="mt-2 rounded bg-slate-50 p-2 text-[13px] dark:bg-slate-800/60"><b>{c.name}</b> v{c.version}<div className="text-slate-600 dark:text-slate-400">{Array.isArray(c.steps) ? (c.steps as unknown[]).length : 0} étapes</div></div>)}</Card>
        <Card className="p-4"><div className="font-bold text-[14px]">Délais d’intervention ({slas.length})</div>
          {slas.map((s) => <div key={s.id} className="mt-2 rounded bg-slate-50 p-2 text-[13px] dark:bg-slate-800/60"><b>{PRIORITY_LABEL[s.priority] ?? s.priority} · {CONTRACT_TIER_LABEL[s.tier] ?? s.tier}</b><div className="text-slate-600 dark:text-slate-400">Réponse {s.responseH} h · Résolution {s.resolveH} h</div></div>)}</Card>
      </div>
      <Card className="p-4 text-[13px] text-slate-600 dark:text-slate-400">
        <b className="text-slate-800 dark:text-slate-200">Comptes & accès :</b> chaque personne a un rôle — administrateur, responsable, répartiteur, technicien ou client. Un client ne voit que ses propres interventions et factures.
        Mot de passe de démonstration : <b className="font-mono">FieldOps123!</b>
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-[14px]">Dispatch IA (AI Agent Factory)</div>
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              factory.configured && factory.reachable
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              {factory.configured && factory.reachable ? "Connecté" : factory.configured ? "Injoignable" : "Non configuré"}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
            {factory.configured && factory.reachable
              ? "Le bouton Dispatch IA utilise l’agent publié de la Factory. Le classement déterministe reste le repli si le modèle échoue."
              : factory.error ?? "Le dispatch utilise uniquement le classement déterministe."}
          </div>
          {factory.configured ? (
            <div className="mt-2 font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
              {factory.gatewayUrl} · agent {factory.agentId?.slice(0, 18)}…
            </div>
          ) : null}
          <a
            className="mt-2 inline-block text-[12.5px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
            href={factory.gatewayUrl ?? "http://localhost:3100"}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir AI Agent Factory →
          </a>
        </Card>
        <Card className="p-4">
          <div className="font-bold text-[14px]">Emails d’assignation</div>
          <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
            {mail.configured
              ? <>Envoi réel via <b className="font-mono">{mail.host}</b>. Chaque assignation prévient le technicien (site, accès, horaire).</>
              : <>L’envoi d’emails n’est pas encore activé. Les messages restent visibles dans les journaux et sur l’intervention. Demandez à votre administrateur de l’activer.</>}
          </div>
          <div className="mt-3"><TestMail defaultTo={session?.user?.email ?? ""} /></div>
        </Card>
        <Card className="p-4">
          <div className="font-bold text-[14px]">Emplacements de stock ({locs.length})</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {locs.map((l) => <span key={l.id} className="rounded bg-slate-100 px-2 py-1 font-mono text-[12px] dark:bg-slate-800 dark:text-slate-300">{l.name}</span>)}
          </div>
          <div className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">Ajoutez un dépôt ou une camionnette depuis la page Stock.</div>
        </Card>
      </div>
    </div>
  );
}
