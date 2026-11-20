"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function ShellChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/login" || path === "/docs") return <>{children}</>;
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-blue-800 focus:shadow-lg dark:focus:bg-slate-900 dark:focus:text-blue-300"
      >
        Aller au contenu principal
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-5 lg:px-8"
        >
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white/60 px-8 py-3 text-[12.5px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
          FieldOps · Casablanca
        </footer>
      </div>
    </div>
  );
}
