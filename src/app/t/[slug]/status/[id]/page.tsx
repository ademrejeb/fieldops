import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark, BrandWordmark } from "@/components/ui/brand-mark";
import { db } from "@/lib/db";
import { STATUS_LABEL, fmtDate, mad } from "@/lib/format";
import { getTenantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const ticket = await db.ticket.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      workOrders: { include: { assignments: { include: { technician: true } } } },
      invoice: true,
    },
  });
  if (!ticket) notFound();

  const assignment = ticket.workOrders.flatMap((workOrder) => workOrder.assignments)[0] ?? null;
  const technicianName = assignment?.technician.name?.split(" ")[0] ?? null;
  const invoice = ticket.invoice;
  const accepted = ticket.reviewStatus === "ACCEPTED";
  const analysed = ["READY", "ACCEPTED", "REFUSED"].includes(ticket.reviewStatus);
  const steps = [
    {
      title: "Demande reçue",
      detail: `Enregistrée le ${fmtDate(ticket.createdAt)}`,
      done: true,
    },
    {
      title: "Analyse de l’agent",
      detail: analysed
        ? ticket.aiSummary || "Diagnostic et facture brouillon préparés."
        : "L’agent prépare le diagnostic, le technicien et la facture.",
      done: analysed,
    },
    {
      title: accepted ? "Validée par l’équipe" : "Validation de l’équipe",
      detail: accepted
        ? "Le répartiteur a validé la proposition."
        : "Le répartiteur vérifie la proposition avant l’intervention.",
      done: accepted,
    },
    {
      title: "Technicien notifié",
      detail: technicianName
        ? `${technicianName} · ${assignment?.etaMin ?? 30} min estimées`
        : "Le technicien sera notifié après validation.",
      done: Boolean(assignment),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F1] px-4 py-8 text-stone-900 sm:py-12">
      <main className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2.5">
          <BrandMark size={38} />
          <div>
            <BrandWordmark className="block text-[19px] leading-none" />
            <div className="mt-1 text-[11px] text-stone-500">{tenant.name} · Suivi de demande</div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.35)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12.5px] font-bold text-stone-500">{ticket.number}</span>
            <span className="rounded-full bg-[#F4ECDF] px-2.5 py-0.5 text-[11px] font-bold text-[#9A3412]">
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </span>
            <span className="text-[11.5px] text-stone-400">
              Mis à jour {fmtDate(ticket.updatedAt)}
            </span>
          </div>
          <h1 className="mt-2 text-[23px] font-extrabold tracking-tight">{ticket.title}</h1>
          {ticket.description && (
            <p className="mt-1 line-clamp-3 text-[13px] text-stone-500">{ticket.description}</p>
          )}

          {ticket.reviewStatus === "REFUSED" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
              Cette demande n’a pas été retenue. Contactez l’équipe {tenant.name} pour la suite.
            </div>
          )}

          <ol className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      "grid h-7 w-7 place-items-center rounded-full text-[11px] font-extrabold " +
                      (step.done
                        ? "bg-[#C2410C] text-white"
                        : "border border-stone-200 bg-[#FBFAF7] text-stone-400")
                    }
                  >
                    {step.done ? "✓" : index + 1}
                  </span>
                  {index < steps.length - 1 && <span className="mt-1 h-6 w-px bg-stone-200" />}
                </div>
                <div className="pt-0.5">
                  <div className="text-[13px] font-bold text-stone-900">{step.title}</div>
                  <div className="text-[12px] text-stone-500">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>

          {invoice && (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-[#FBFAF7] p-4">
              <div className="flex items-center justify-between text-[12px] text-stone-500">
                <span>Facture brouillon · {invoice.number}</span>
                <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-stone-600 ring-1 ring-stone-200">
                  {invoice.status === "DRAFT" ? "En attente de validation" : invoice.status}
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-[12.5px] text-stone-500">Total estimé</span>
                <span className="text-[20px] font-extrabold tabular-nums">
                  {mad(invoice.totalCents)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <Link
              href={`/t/${tenant.slug}/status/${ticket.id}`}
              className="text-[12px] font-semibold text-[#C2410C] hover:underline"
            >
              Rafraîchir le statut
            </Link>
            <Link
              href={`/t/${tenant.slug}/request`}
              className="text-[12px] font-semibold text-stone-500 hover:text-stone-800"
            >
              Nouvelle demande
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-stone-400">
          Suivi public · seules les informations de l’intervention sont affichées.
        </p>
      </main>
    </div>
  );
}
