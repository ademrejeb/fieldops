"use client";

import dynamic from "next/dynamic";

export const TechMap = dynamic(() => import("./tech-map-inner"), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg bg-slate-100 text-[12.5px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">Chargement de la carte…</div>,
});
export type { MapTech, MapSite } from "./tech-map-inner";
