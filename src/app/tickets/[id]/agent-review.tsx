"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Check,
  FileText,
  Gauge,
  Pencil,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

type InvoiceLine = { label: string; qty: number; unitPrice: number };
type Review = {
  technicianId: string | null;
  summary: string;
  reasons: string[];
  reasoning: { step: string; detail: string }[];
  confidence: number | null;
  priority: string | null;
  etaMin: number | null;
  invoice: { lines: InvoiceLine[]; totalCents: number; currency: string } | null;
  engine: "factory" | "deterministic" | string;
  runId: string | null;
};
type Candidate = {
  id: string;
  name: string;
  status: string;
  skills: string[];
  score: number;
  etaMin: number;
  km: number;
  reasons: string[];
  eligible: boolean;
};
type ReviewData = {
  ticket: {
    id: string;
    number: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    reviewStatus: string;
    agentStatus: string;
    agentError: string;
    aiSummary: string;
    aiConfidence: number;
    agentRunId: string;
  };
  review: Review | null;
  invoice: { lines: InvoiceLine[]; totalCents: number; currency: string } | null;
  savedInvoice: {
    id: string;
    number: string;
    totalCents: number;
    currency: string;
    status: string;
  } | null;
  candidates: Candidate[];
  technicians: { id: string; name: string; status: string; skills: string[] }[];
};

const PRIORITY_LABEL: Record<string, string> = {
  P1_CRITICAL: "P1 · Critique",
  P2_HIGH: "P2 · Haute",
  P3_NORMAL: "P3 · Normale",
  P4_LOW: "P4 · Basse",
};

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

type EditLine = { label: string; qty: string; unitPrice: string };

export function AgentReview({
  ticketId,
  factoryUrl,
}: {
  ticketId: string;
  factoryUrl?: string | null;
}) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [techId, setTechId] = useState("");
  const [priority, setPriority] = useState("");
  const [lines, setLines] = useState<EditLine[]>([]);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [refuseOpen, setRefuseOpen] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/review`, { cache: "no-store" });
      const payload = (await response.json()) as ReviewData & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Revue indisponible.");
        return;
      }
      setData(payload);
      setTechId((current) => current || payload.review?.technicianId || payload.candidates[0]?.id || "");
      setPriority((current) => current || payload.review?.priority || payload.ticket.priority);
      const invoice = payload.invoice ?? payload.review?.invoice ?? null;
      setLines(
        (current) =>
          current.length > 0
            ? current
            : (invoice?.lines ?? []).map((line) => ({
                label: line.label,
                qty: String(line.qty),
                unitPrice: (line.unitPrice / 100).toFixed(2),
              })),
      );
      setError("");
    } catch {
      setError("Connexion impossible.");
    }
  }, [ticketId]);

  useEffect(() => {
    // The fetch resolves after the effect; state is set from the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const running = data?.ticket.agentStatus === "RUNNING" || data?.ticket.agentStatus === "PENDING";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [running, load]);

  const totalCents = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number.parseInt(line.qty, 10);
        const price = Number.parseFloat(line.unitPrice.replace(",", "."));
        if (!Number.isFinite(qty) || !Number.isFinite(price) || qty < 1 || price < 0) return sum;
        return sum + qty * Math.round(price * 100);
      }, 0),
    [lines],
  );
  const currency = data?.invoice?.currency ?? data?.review?.invoice?.currency ?? "MAD";
  const accepted = data?.ticket.reviewStatus === "ACCEPTED";
  const refused = data?.ticket.reviewStatus === "REFUSED";
  const review = data?.review ?? null;
  const confidence = review?.confidence != null ? Math.round(review.confidence * 100) : null;

  function updateLine(index: number, patch: Partial<EditLine>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  }

  async function decide(action: "accept" | "refuse") {
    setBusy(action);
    setError("");
    try {
      const body: Record<string, unknown> = { action, priority };
      if (action === "refuse") body.reason = reason;
      if (action === "accept") {
        body.technicianId = techId;
        body.invoiceLines = lines
          .map((line) => ({
            label: line.label.trim(),
            qty: Number.parseInt(line.qty, 10),
            unitPrice: Math.round(Number.parseFloat(line.unitPrice.replace(",", ".")) * 100),
          }))
          .filter((line) => line.label && Number.isFinite(line.qty) && Number.isFinite(line.unitPrice));
      }
      const response = await fetch(`/api/tickets/${ticketId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Décision impossible.");
        return;
      }
      setRefuseOpen(false);
      router.refresh();
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function rerun() {
    setBusy("rerun");
    setError("");
    try {
      const response = await fetch(`/api/tickets/${ticketId}/review`, { method: "PUT" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) setError(payload.error ?? "Relance impossible.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-200/70 bg-white shadow-[0_10px_36px_-24px_rgba(194,65,12,0.45)] dark:border-orange-900/40 dark:bg-[#1C1917]">
      <header className="flex flex-wrap items-center gap-2 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-[#FFFBF5] to-white px-4 py-3 dark:border-orange-900/30 dark:from-orange-950/30 dark:via-[#1C1917] dark:to-[#1C1917]">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#171310] text-white">
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-extrabold text-stone-900 dark:text-stone-100">
              Revue de l’agent
            </span>
            {review && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#9A3412] ring-1 ring-orange-200 dark:bg-[#2A231D] dark:text-orange-300 dark:ring-orange-900">
                {review.engine === "factory" ? "Factory · OpenRouter" : "Repli déterministe"}
              </span>
            )}
            {confidence != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10.5px] font-bold text-[#9A3412] dark:bg-orange-950/50 dark:text-orange-300">
                <Gauge className="h-3 w-3" /> {confidence}%
              </span>
            )}
            {accepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-3 w-3" /> Validée
              </span>
            )}
            {refused && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <X className="h-3 w-3" /> Refusée
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-stone-500 dark:text-stone-400">
            Diagnostic, technicien, facture brouillon et raisons — avant toute assignation.
          </p>
        </div>
        {review?.runId && factoryUrl && (
          <a
            href={`${factoryUrl.replace(/\/$/, "")}/runs/${review.runId}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11.5px] font-semibold text-[#C2410C] hover:underline"
          >
            Voir le run ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => void rerun()}
          disabled={busy !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-[11.5px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-[#1C1917] dark:text-stone-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy === "rerun" ? "animate-spin" : ""}`} />
          Relancer
        </button>
      </header>

      <div className="space-y-4 p-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        {running && (
          <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[12.5px] font-medium text-[#9A3412] dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">
            <Sparkles className="h-4 w-4 animate-pulse" /> L’agent analyse la demande…
          </div>
        )}
        {!data && !error && (
          <div className="h-24 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
        )}

        {review && (
          <>
            <div className="rounded-xl border border-stone-200 bg-[#FBFAF7] p-3.5 dark:border-stone-800 dark:bg-[#171310]">
              <div className="text-[12.5px] font-bold text-stone-900 dark:text-stone-100">
                {review.summary || data?.ticket.aiSummary || "Analyse de la demande"}
              </div>
              {review.reasons.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {review.reasons.map((reasonText) => (
                    <span
                      key={reasonText}
                      className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-stone-600 dark:border-stone-700 dark:bg-[#1C1917] dark:text-stone-300"
                    >
                      {reasonText}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {review.reasoning.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">
                  Raisonnement
                </div>
                <ol className="space-y-2">
                  {review.reasoning.map((step, index) => (
                    <li key={`${step.step}-${index}`} className="flex gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F4ECDF] text-[10px] font-extrabold text-[#9A3412] dark:bg-orange-950/40 dark:text-orange-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-stone-800 dark:text-stone-200">
                          {step.step}
                        </div>
                        <div className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
                          {step.detail}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">
                  Technicien proposé
                </span>
                <span className="text-[11px] text-stone-400">
                  {review.etaMin != null ? `ETA ${review.etaMin} min` : ""}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(data?.candidates ?? []).map((candidate) => (
                  <label
                    key={candidate.id}
                    className={
                      "flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 transition-colors " +
                      (techId === candidate.id
                        ? "border-[#C2410C] bg-orange-50/70 ring-1 ring-[#C2410C] dark:bg-orange-950/20"
                        : "border-stone-200 bg-white hover:border-orange-200 dark:border-stone-800 dark:bg-[#171310]")
                    }
                  >
                    <input
                      type="radio"
                      name="technician"
                      checked={techId === candidate.id}
                      onChange={() => setTechId(candidate.id)}
                      disabled={accepted || refused}
                      className="mt-1 h-3.5 w-3.5 accent-[#C2410C]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-bold text-stone-900 dark:text-stone-100">
                          {candidate.name}
                        </span>
                        <span className="text-[11px] font-bold text-[#C2410C]">{candidate.score}</span>
                      </span>
                      <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                        {candidate.status} · {candidate.km} km · ~{candidate.etaMin} min
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-stone-400">
                        {candidate.reasons.slice(0, 2).join(" · ")}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">
                  Facture brouillon
                </span>
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#C2410C] hover:underline"
                >
                  <Pencil className="h-3 w-3" /> {editing ? "Terminer" : "Ajuster"}
                </button>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-stone-800">
                <table className="w-full text-[12px]">
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                        <td className="p-2">
                          {editing ? (
                            <input
                              value={line.label}
                              onChange={(event) => updateLine(index, { label: event.target.value })}
                              className="h-8 w-full rounded-lg border border-stone-200 px-2 text-[12px] dark:border-stone-700 dark:bg-[#12100E]"
                            />
                          ) : (
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {line.label}
                            </span>
                          )}
                        </td>
                        <td className="w-14 p-2 text-center">
                          {editing ? (
                            <input
                              value={line.qty}
                              onChange={(event) => updateLine(index, { qty: event.target.value })}
                              inputMode="numeric"
                              className="h-8 w-12 rounded-lg border border-stone-200 px-1 text-center text-[12px] dark:border-stone-700 dark:bg-[#12100E]"
                            />
                          ) : (
                            `×${line.qty}`
                          )}
                        </td>
                        <td className="w-24 p-2 text-right font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                          {editing ? (
                            <input
                              value={line.unitPrice}
                              onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                              inputMode="decimal"
                              className="h-8 w-20 rounded-lg border border-stone-200 px-1 text-right text-[12px] dark:border-stone-700 dark:bg-[#12100E]"
                            />
                          ) : (
                            money(Math.round(Number.parseFloat(line.unitPrice) * 100), currency)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="p-2 text-[12px] font-bold text-stone-500" colSpan={2}>
                        Total
                      </td>
                      <td className="p-2 text-right text-[14px] font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
                        {money(totalCents, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-stone-400">
                <FileText className="h-3 w-3" /> La facture est créée en brouillon à la validation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={accepted || refused}
                className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-[12px] font-semibold text-stone-700 dark:border-stone-700 dark:bg-[#171310] dark:text-stone-200"
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="flex-1" />
              {!accepted && !refused && (
                <>
                  <button
                    type="button"
                    onClick={() => setRefuseOpen((open) => !open)}
                    className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-[12px] font-semibold text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-[#171310] dark:text-stone-300"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide("accept")}
                    disabled={busy !== null || !techId || lines.length === 0}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#C2410C] px-4 text-[12.5px] font-bold text-white hover:bg-[#9A3412] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {busy === "accept" ? "Validation…" : "Accepter et assigner"}
                  </button>
                </>
              )}
            </div>

            {refuseOpen && !accepted && !refused && (
              <div className="rounded-xl border border-stone-200 bg-[#FBFAF7] p-3 dark:border-stone-800 dark:bg-[#171310]">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-stone-500">
                  Motif du refus
                </label>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-2.5 py-2 text-[12.5px] dark:border-stone-700 dark:bg-[#12100E]"
                  placeholder="Hors périmètre, doublon, informations insuffisantes…"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void decide("refuse")}
                    disabled={busy !== null}
                    className="h-8 rounded-lg bg-red-600 px-3 text-[12px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {busy === "refuse" ? "Refus…" : "Confirmer le refus"}
                  </button>
                </div>
              </div>
            )}

            {accepted && data?.savedInvoice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-[12px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                Intervention assignée. Facture <strong>{data.savedInvoice.number}</strong> en
                brouillon · {money(data.savedInvoice.totalCents, data.savedInvoice.currency)}.
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
