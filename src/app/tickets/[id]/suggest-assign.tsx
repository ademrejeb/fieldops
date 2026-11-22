"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui/primitives";
import { Sparkles, Zap } from "lucide-react";

type Ranked = {
  id: string;
  name: string;
  score: number;
  etaMin: number;
  km: number;
  reasons: string[];
  eligible: boolean;
  status: string;
};

type AiPayload = {
  used?: boolean;
  engine?: string;
  technicianId?: string | null;
  summary?: string;
  reasons?: string[];
  confidence?: number | null;
  fallbackReason?: string | null;
  runId?: string | null;
  reused?: boolean;
};

type AiResult = {
  ok: boolean;
  title: string;
  detail?: string;
  summary?: string;
  reasons?: string[];
  confidence?: number | null;
  engine?: string;
  runId?: string | null;
  fallbackReason?: string | null;
  message?: string;
};

export function SuggestAssign({
  ticketId,
  factoryUrl,
}: {
  ticketId: string;
  factoryUrl?: string | null;
}) {
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/dispatch/suggest?ticketId=${ticketId}`)
      .then((r) => r.json())
      .then((d) => setRanked(d.ranked ?? []))
      .finally(() => setLoading(false));
  }, [ticketId]);

  async function assign(techId: string) {
    setBusy(techId);
    await fetch("/api/workorders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        jobType: "REPAIR",
        estimatedMin: 90,
        technicianIds: [techId],
      }),
    });
    setBusy(null);
    router.refresh();
  }

  async function dispatchWithAi() {
    setAiBusy(true);
    setAiResult(null);
    try {
      const response = await fetch("/api/agents/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        technician?: { name?: string };
        assignment?: { etaMin?: number };
        ai?: AiPayload;
        reused?: boolean;
      };
      if (!response.ok) {
        setAiResult({
          ok: false,
          title: "Dispatch impossible",
          message: payload.error ?? "Le dispatch IA a échoué.",
        });
        return;
      }
      const ai = payload.ai ?? {};
      const technician = payload.technician?.name ?? "technicien";
      const eta = payload.assignment?.etaMin;
      setAiResult({
        ok: true,
        title: payload.reused
          ? `${technician} était déjà assigné`
          : ai.used
            ? `Dispatch IA · ${technician} assigné`
            : `Classement déterministe · ${technician} assigné`,
        detail:
          payload.reused || eta == null ? undefined : `Arrivée estimée ~${eta} min`,
        summary: ai.summary,
        reasons: ai.reasons,
        confidence: ai.confidence ?? null,
        engine: ai.engine ?? (ai.used ? "factory" : "deterministic"),
        runId: ai.runId ?? null,
        fallbackReason: ai.fallbackReason ?? null,
      });
      router.refresh();
    } catch {
      setAiResult({
        ok: false,
        title: "Service injoignable",
        message: "Le service de dispatch est injoignable. Réessayez dans un instant.",
      });
    } finally {
      setAiBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-4 text-[13.5px] text-slate-600 dark:text-slate-400">
        Recherche du technicien le plus adapté…
      </Card>
    );
  }

  const aiTone = !aiResult
    ? ""
    : !aiResult.ok
      ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
      : aiResult.engine === "factory"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";

  return (
    <Card className="border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-bold text-violet-900 dark:text-violet-200">
          <Zap className="h-4 w-4" /> Techniciens recommandés
        </div>
        <Button size="sm" onClick={dispatchWithAi} disabled={aiBusy || busy !== null}>
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          {aiBusy ? "Analyse…" : "Dispatch IA"}
        </Button>
      </div>

      {aiResult ? (
        <div className={`mt-3 rounded-lg border px-3 py-2.5 text-[12.5px] ${aiTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">{aiResult.title}</span>
            {aiResult.confidence != null ? (
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold dark:bg-black/20">
                confiance {Math.round(aiResult.confidence * 100)}%
              </span>
            ) : null}
          </div>
          {aiResult.detail ? <div className="mt-0.5">{aiResult.detail}</div> : null}
          {aiResult.message ? <div className="mt-0.5">{aiResult.message}</div> : null}
          {aiResult.summary ? <p className="mt-1.5 leading-snug">{aiResult.summary}</p> : null}
          {aiResult.reasons && aiResult.reasons.length > 0 ? (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              {aiResult.reasons.slice(0, 5).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            {aiResult.engine ? (
              <span className="rounded bg-white/60 px-1.5 py-0.5 font-semibold dark:bg-black/20">
                {aiResult.engine === "factory"
                  ? "Agent Factory"
                  : aiResult.engine === "existing"
                    ? "Mission déjà active"
                    : "Repli déterministe"}
              </span>
            ) : null}
            {aiResult.runId ? (
              <span className="font-mono opacity-80">run {aiResult.runId.slice(0, 18)}…</span>
            ) : null}
            {aiResult.runId && factoryUrl ? (
              <a
                className="font-semibold underline"
                href={`${factoryUrl.replace(/\/+$/, "")}/runs/${aiResult.runId}`}
                target="_blank"
                rel="noreferrer"
              >
                Voir le run →
              </a>
            ) : null}
          </div>
          {aiResult.fallbackReason ? (
            <div className="mt-1.5 rounded bg-amber-100/70 px-2 py-1 text-[11.5px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Repli : {aiResult.fallbackReason}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {ranked.slice(0, 3).map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white dark:bg-slate-700">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-bold">{t.name}</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11.5px] font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
                  {t.score}/100
                </span>
                {!t.eligible && (
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                    non éligible
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">
                {t.reasons.join(" · ")}
              </div>
            </div>
            <Button
              size="sm"
              disabled={!t.eligible || busy !== null}
              onClick={() => assign(t.id)}
            >
              {busy === t.id ? "…" : `Assigner · arrivée ${t.etaMin} min`}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
