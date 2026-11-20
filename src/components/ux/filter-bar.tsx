"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/primitives";

/** One compact filter row: search + dropdowns. Never grows vertically. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <Card className="flex flex-wrap items-center gap-2.5 p-3">{children}</Card>;
}

/** Dropdown filter bound to a URL param (keeps search/sort intact). */
export function FilterSelect({ param, value, placeholder, options }: {
  param: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  function change(v: string) {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(param, v);
    else sp.delete(param);
    router.replace(`${path}?${sp.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      aria-label={placeholder}
      className="h-10 max-w-[240px] truncate rounded-lg border border-slate-200 bg-white px-2.5 text-[13.5px] font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
