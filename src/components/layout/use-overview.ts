"use client";

import { useEffect, useState } from "react";

export type Overview = {
  tenant: { id: string; name: string; slug: string; industry: string };
  open: number;
  p1: number;
  slaRisk: number;
  techsOnline: number;
  techsTotal: number;
  resolved: number;
  slaCompliance: number;
  generatedAt: string;
};

/** Polls /api/overview for shell KPIs. */
export function useOverview(intervalMs = 60_000) {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/overview")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d) setData(d);
        })
        .catch(() => {});
    pull();
    const t = setInterval(pull, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return data;
}
