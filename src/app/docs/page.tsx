import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { SwaggerUI } from "@/components/docs/swagger-ui";

export const metadata: Metadata = {
  title: "API — FieldOps",
  description: "Documentation OpenAPI 3.1 du platform FieldOps.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-bold text-slate-900 dark:text-white">FieldOps — API</div>
              <div className="text-[11.5px] text-slate-500">OpenAPI 3.1 · v1.0.0</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/openapi"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              JSON
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <p className="mb-5 max-w-3xl text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          Spécification complète des endpoints REST : intake, dispatch IA, exécution terrain, GPS et
          facturation. Utilisez le bouton <span className="font-semibold">Authorize</span> pour vous
          authentifier (session web, token Bearer mobile ou clé d&apos;ingestion GPS).
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-white">
          <SwaggerUI url="/api/openapi" />
        </div>
      </main>
    </div>
  );
}
