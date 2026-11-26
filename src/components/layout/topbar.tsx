"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { GlobalSearch } from "./global-search";
import { NotifBell } from "./notif-bell";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { useOverview } from "./use-overview";

export function Topbar() {
  const { data } = useSession();
  const role = data?.user?.role as string | undefined;
  const ov = useOverview();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FAF7F1]/90 backdrop-blur-xl dark:border-stone-800 dark:bg-[#12100E]/85">
      <div className="mx-auto flex h-[60px] w-full max-w-[1400px] items-center gap-3 px-4 sm:px-5 lg:px-8">
        <MobileNav />
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-2">
          {role !== "CLIENT" && ov && ov.techsTotal > 0 && (
            <span
              className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 md:inline-flex dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
              title={`${ov.techsOnline} technicien(s) disponible(s) sur ${ov.techsTotal}`}
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {ov.techsOnline} disponible{ov.techsOnline > 1 ? "s" : ""}
            </span>
          )}
          <NotifBell />
          <ThemeToggle />
          {role !== "CLIENT" && (
            <Link href="/tickets/new" className="hidden sm:block">
              <Button>
                <Plus /> Nouvelle intervention
              </Button>
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
