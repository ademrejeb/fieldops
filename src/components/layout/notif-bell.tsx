"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type Notif = {
  id: string; kind: string; severity: "critical" | "high" | "medium" | "info";
  title: string; detail: string; href: string; source?: "alert" | "db";
};

const DOT: Record<Notif["severity"], string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  info: "bg-slate-300",
};

/** Live ops bell: SLA risk, bare P1s, low stock, overdue bills. Read-state in localStorage. */
export function NotifBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("notifSeen") ?? "[]"); } catch { return []; }
  });
  const box = useRef<HTMLDivElement>(null);

  function refresh() {
    fetch("/api/notifications").then((r) => r.json()).then((d) => {
      setItems(d.items ?? []);
    }).catch(() => {});
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => { clearInterval(t); window.removeEventListener("mousedown", close); };
  }, []);

  const unread = items.filter((n) => !seen.includes(n.id)).length;

  function markAll() {
    const ids = items.map((n) => n.id);
    localStorage.setItem("notifSeen", JSON.stringify(ids));
    setSeen(ids);
    const storedIds = items.filter((n) => n.source === "db").map((n) => n.id);
    if (storedIds.length > 0) {
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: storedIds }),
      }).then(() => refresh());
    }
  }

  function openItem(item: Notif) {
    setOpen(false);
    if (item.source === "db") {
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) refresh(); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        title="Alertes"
        aria-label={unread > 0 ? `Alertes, ${unread} non lue(s)` : "Alertes"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[340px] max-w-[85vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-[360px] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Alertes ({unread} non lue{unread > 1 ? "s" : ""})</span>
            <button onClick={markAll} className="text-[12px] font-semibold text-blue-700 hover:underline dark:text-blue-400">Tout marquer lu</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto p-1.5">
            {items.length === 0 && <div className="p-6 text-center text-[13px] text-slate-500 dark:text-slate-400">Rien à signaler. Belle journée. ☀️</div>}
            {items.map((n) => (
              <Link key={n.id} href={n.href} onClick={() => openItem(n)}
                className={`flex gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${seen.includes(n.id) ? "opacity-60" : ""}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[n.severity]}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">{n.title}</span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">{n.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
