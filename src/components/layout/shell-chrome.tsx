"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function ShellChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/login" || path === "/docs" || path.startsWith("/t/")) return <>{children}</>;
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
        <footer className="border-t border-stone-200/80 bg-[#FAF7F1]/70 px-8 py-3 text-[12px] text-stone-500 dark:border-stone-800 dark:bg-[#12100E]/60 dark:text-stone-400">
          <span className="font-semibold text-stone-700 dark:text-stone-300">khedma.</span> · El khedma, mrigla. · Chaque intervention, au bon technicien.
        </footer>
      </div>
    </div>
  );
}
