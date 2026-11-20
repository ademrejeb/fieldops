"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured hook point: wire to Sentry/OTel in production.
    console.error("[app-error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-[18px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Une erreur est survenue
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
          L’opération n’a pas pu aboutir. Réessayez — si le problème persiste, l’incident est journalisé
          {error.digest ? ` (réf. ${error.digest})` : ""}.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw /> Réessayer
          </Button>
          <Link href="/">
            <Button variant="secondary">
              <Home /> Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
