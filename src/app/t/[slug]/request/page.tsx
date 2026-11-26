import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark, BrandWordmark } from "@/components/ui/brand-mark";
import { getTenantBySlug } from "@/lib/tenant";
import { PublicRequestForm } from "./public-request-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  return {
    title: tenant ? `Demande d’intervention · ${tenant.name}` : "Demande d’intervention",
    description:
      "Décrivez la panne. L’agent prépare le diagnostic, la facture et le technicien ; l’équipe valide.",
  };
}

export default async function PublicRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  // Tenant-scoped branding: settings may carry a short public note.
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const publicNote =
    typeof settings.publicNote === "string" ? settings.publicNote.slice(0, 240) : "";

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-stone-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <BrandMark size={38} />
          <div>
            <BrandWordmark className="block text-[19px] leading-none text-stone-900" />
            <div className="mt-1 text-[11px] font-medium text-stone-500">
              {tenant.name} · Demande d’intervention
            </div>
          </div>
        </div>
        <Link
          href={`/t/${tenant.slug}/request`}
          className="hidden text-[12.5px] font-semibold text-stone-500 hover:text-[#C2410C] sm:block"
        >
          Une autre demande ?
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:pt-6">
        <section className="relative overflow-hidden rounded-[28px] bg-[#171310] p-8 text-white lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(560px 340px at 12% 6%, rgba(234,88,12,0.35), transparent 60%), radial-gradient(420px 280px at 90% 88%, rgba(132,204,22,0.16), transparent 62%)",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-orange-200">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635]" />
              Sans compte · Réponse suivie
            </span>
            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[40px]">
              Une panne ?
              <br />
              <span className="text-[#FDBA74]">On s’en occupe.</span>
            </h1>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-stone-300">
              {publicNote ||
                "Décrivez ce qui ne va pas. L’agent prépare un diagnostic, une facture brouillon et propose le technicien le plus adapté. Votre équipe Khedma valide avant l’intervention."}
            </p>
            <ol className="mt-8 space-y-4">
              {[
                ["1", "Vous décrivez", "Adresse, symptôme, urgence — deux minutes."],
                ["2", "L’agent prépare", "Diagnostic, technicien, facture brouillon, raisons."],
                ["3", "L’équipe valide", "Le répartiteur accepte ou ajuste, puis le technicien est notifié."],
              ].map(([step, title, detail]) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-[12px] font-extrabold text-orange-200">
                    {step}
                  </span>
                  <span>
                    <strong className="block text-[13px] font-semibold text-white">{title}</strong>
                    <span className="text-[12px] text-stone-400">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex items-center gap-2 text-[11.5px] text-stone-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635]" />
              Votre numéro de suivi s’affiche après l’envoi.
            </div>
          </div>
        </section>

        <section>
          <PublicRequestForm slug={tenant.slug} tenantName={tenant.name} />
        </section>
      </main>
    </div>
  );
}
