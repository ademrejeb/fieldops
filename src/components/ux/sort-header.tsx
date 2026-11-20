"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

/** Clickable table header: toggles ?sort=&dir= based on the input type order. */
export function SortHeader({ label, sortKey, current, dir, className }: {
  label: string;
  sortKey: string; // param value when this column is active
  current: string; // active param value ("" if another column)
  dir: SortDir;
  className?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const active = current === sortKey;

  function toggle() {
    const sp = new URLSearchParams(params.toString());
    sp.set("sort", sortKey);
    sp.set("dir", active && dir === "asc" ? "desc" : "asc");
    router.replace(`${path}?${sp.toString()}`);
  }

  return (
    <th
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button onClick={toggle} className={`inline-flex items-center gap-1 uppercase ${active ? "text-blue-700 dark:text-blue-400" : ""}`}>
        {label}
        {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}
