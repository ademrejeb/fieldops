"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

export type ExportColumn = { key: string; label: string; kind?: "date" | "mad" | "list" };

function pick(row: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), row);
}

/** Serializable cell formatting (no functions cross server→client boundary). */
function fmtCell(raw: unknown, kind?: string): string | number {
  if (kind === "list") return Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");
  if (kind === "mad") {
    const n = (Number(raw) || 0) / 100;
    return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
  }
  if (kind === "date") {
    if (!raw) return "";
    return new Date(raw as string).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (typeof raw === "number") return raw;
  return String(raw ?? "");
}

function toCSV(rows: Record<string, unknown>[], cols: ExportColumn[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => esc(c.label)).join(";");
  const lines = rows.map((r) => cols.map((c) => esc(fmtCell(pick(r, c.key), c.kind))).join(";"));
  return "\uFEFF" + [head, ...lines].join("\n"); // BOM for Excel FR
}

function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** CSV (;) + Excel (.xlsx) export of the current table. fetchUrl returns {items} or bare array. */
export function ExportButtons({ filename, fetchUrl, columns }: {
  filename: string;
  fetchUrl: string;
  columns: ExportColumn[];
}) {
  const [busy, setBusy] = useState(false);

  async function load(): Promise<Record<string, unknown>[]> {
    const res = await fetch(fetchUrl);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return data.items ?? data.tickets ?? data.invoices ?? data.workOrders ?? [];
  }

  async function csv() {
    setBusy(true);
    try {
      const rows = await load();
      download(new Blob([toCSV(rows, columns)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
    } finally { setBusy(false); }
  }

  async function xlsx() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const rows = await load();
      const sheet = XLSX.utils.json_to_sheet(
        rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, fmtCell(pick(r, c.key), c.kind)])))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Export");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex gap-1.5">
      <button onClick={csv} disabled={busy} title="Exporter CSV (Excel FR)"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
        <Download className="h-3.5 w-3.5" /> CSV
      </button>
      <button onClick={xlsx} disabled={busy} title="Exporter Excel (.xlsx)"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
      </button>
    </div>
  );
}
