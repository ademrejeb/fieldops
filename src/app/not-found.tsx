import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <Compass className="h-6 w-6" />
        </div>
        <div className="mt-4 text-[30px] font-black tracking-tight text-slate-900 dark:text-slate-100">404</div>
        <h1 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">Page introuvable</h1>
        <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
          Cette page a été déplacée ou n’existe pas.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/">
            <Button>Retour à l’accueil</Button>
          </Link>
          <Link href="/tickets">
            <Button variant="secondary">Interventions</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
