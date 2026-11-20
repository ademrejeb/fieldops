"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, Radio, X } from "lucide-react";
import { NavLinks } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

/** Hamburger + slide-over drawer for small screens (the rail is lg-only). */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data } = useSession();
  const role = (data?.user?.role ?? "DISPATCHER") as string;
  const tenantName = data?.user?.tenantName ?? "FieldOps";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-[#0b1220] text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white">
                  F
                </div>
                <div>
                  <div className="text-[14px] font-bold text-white">FieldOps</div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Radio className="h-3 w-3 text-emerald-400" /> Gestion des interventions
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-4 mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Entreprise
              </div>
              <div className="truncate text-[13.5px] font-semibold text-white">{tenantName}</div>
            </div>

            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks role={role} onNavigate={() => setOpen(false)} />
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4">
              <ThemeToggle className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-300" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-[13px] font-semibold text-slate-200 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
