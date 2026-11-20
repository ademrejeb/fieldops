"use client";

import dynamic from "next/dynamic";

export const GeoPicker = dynamic(() => import("./geo-picker-inner"), {
  ssr: false,
  loading: () => <div className="flex h-44 items-center justify-center rounded-lg bg-slate-100 text-[12.5px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">Chargement de la carte…</div>,
});
