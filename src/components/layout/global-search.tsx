"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/primitives";

type Group = { title: string; hits: { label: string; sub: string; href: string }[] };

/** Global search with grouped live results + keyboard navigation. */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => {
        setGroups(d.groups ?? []);
        setOpen(true);
        setIdx(0);
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const flat = groups.flatMap((g) => g.hits.map((h) => ({ ...h, group: g.title })));

  function go(i: number) {
    const hit = flat[i];
    if (!hit) return;
    setOpen(false);
    router.push(hit.href);
  }

  return (
    <div ref={box} className="relative hidden w-[380px] md:block">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => groups.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(flat.length - 1, i + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
          if (e.key === "Enter") go(idx);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Rechercher une intervention, un client…"
        aria-label="Recherche globale"
        type="search"
        className="h-10 pl-9"
      />
      {open && q.trim().length >= 2 && groups.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{g.title}</div>
              {g.hits.map((h) => {
                const gi = flat.findIndex((f) => f.href === h.href);
                return (
                  <Link key={h.href} href={h.href} onClick={() => setOpen(false)}
                    onMouseEnter={() => setIdx(gi)}
                    className={`block rounded-lg px-2.5 py-1.5 ${gi === idx ? "bg-blue-50 dark:bg-slate-800" : ""}`}>
                    <div className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">{h.label}</div>
                    <div className="truncate text-[12px] text-slate-500 dark:text-slate-400">{h.sub}</div>
                  </Link>
                );
              })}
            </div>
          ))}
          <button onClick={() => { setOpen(false); router.push(`/tickets?q=${encodeURIComponent(q)}`); }}
            className="mt-1 w-full rounded-lg bg-slate-50 px-2.5 py-2 text-center text-[12.5px] font-semibold text-blue-700 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-blue-400 dark:hover:bg-slate-800">
            Voir tous les tickets pour « {q} » →
          </button>
        </div>
      )}
      {open && q.trim().length >= 2 && groups.length === 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-xl border border-slate-200 bg-white p-4 text-center text-[13px] text-slate-500 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Rien trouvé pour « {q} ».
        </div>
      )}
    </div>
  );
}
