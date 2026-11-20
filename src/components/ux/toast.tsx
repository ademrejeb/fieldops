"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; msg: string };

let nextId = 1;

export function toast(msg: string, kind: ToastKind = "success") {
  window.dispatchEvent(new CustomEvent("fieldops-toast", { detail: { id: nextId++, kind, msg } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent).detail as Toast;
      setItems((prev) => [...prev.slice(-3), t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4200);
    };
    window.addEventListener("fieldops-toast", onToast);
    return () => window.removeEventListener("fieldops-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white p-3.5 shadow-xl dark:bg-slate-900 ${
            t.kind === "success" ? "border-emerald-200 dark:border-emerald-900" : t.kind === "error" ? "border-red-200 dark:border-red-900" : "border-blue-200 dark:border-blue-900"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />
          ) : t.kind === "error" ? (
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-600" />
          ) : (
            <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-600" />
          )}
          <div className="min-w-0 flex-1 whitespace-pre-line text-[13px] font-medium text-slate-800 dark:text-slate-200">{t.msg}</div>
          <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
