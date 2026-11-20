"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { Modal } from "./modal";
import { toast } from "./toast";

/**
 * Mass import: CSV or Excel → parsed client-side → POST {rows} to uploadUrl.
 * Server returns {created, updated, failed, errors[]}. Template download included.
 */
export function ImportButton({ uploadUrl, templateHeaders, label }: {
  uploadUrl: string;
  templateHeaders: string[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function template() {
    const csv = "\uFEFF" + templateHeaders.join(";") + "\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `modele-${label.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
  }

  async function onFile(f: File) {
    setBusy(true);
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      if (rows.length === 0) { toast("Fichier vide.", "error"); return; }
      if (rows.length > 2000) { toast("Maximum 2000 lignes par import.", "error"); return; }
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Import refusé.", "error"); return; }
      setResult(data);
      if (data.failed === 0) toast(`Import OK: ${data.created} créé(s), ${data.updated} mis à jour.`);
      else toast(`Import partiel: ${data.created} créés, ${data.updated} MAJ, ${data.failed} en erreur.`, "error");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setResult(null); }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white">
        <Upload className="h-3.5 w-3.5" /> Importer
      </button>
      {open && (
        <Modal title={`Import en masse — ${label}`} sub="CSV (;) ou Excel (.xlsx). Les lignes existantes (même clé) sont mises à jour." onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] dark:bg-slate-800/60">
              <span className="text-slate-600 dark:text-slate-300">Colonnes attendues: <b className="font-mono">{templateHeaders.join(" · ")}</b></span>
              <button onClick={template} className="shrink-0 font-semibold text-blue-700 hover:underline dark:text-blue-400">Modèle CSV</button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            <Button className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? "Import en cours…" : "Choisir un fichier…"}
            </Button>
            {result && (
              <div className={`rounded-lg p-3 text-[13px] ${result.failed ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                <b>{result.created} créé(s) · {result.updated} mis à jour · {result.failed} erreur(s)</b>
                {result.errors.slice(0, 8).map((e) => <div key={e} className="mt-1 font-mono text-[11.5px]">• {e}</div>)}
                {result.errors.length > 8 && <div>… +{result.errors.length - 8} autres</div>}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
