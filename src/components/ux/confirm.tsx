"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { Modal } from "./modal";
import { toast } from "./toast";

/** Delete button with confirm dialog + 409 handling. */
export function ConfirmDelete({ url, label, redirectTo, small }: {
  url: string;
  label: string;
  redirectTo?: string;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setOpen(false);
    if (!res.ok) {
      toast(data.error ?? "Suppression impossible.", "error");
      return;
    }
    toast("Supprimé avec succès.");
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={`Supprimer ${label}`}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 ${small ? "" : "border border-red-200 dark:border-red-900"}`}
      >
        <Trash2 className="h-3.5 w-3.5" /> {!small && "Supprimer"}
      </button>
      {open && (
        <Modal title={`Supprimer ${label} ?`} sub="Cette action est définitive." onClose={() => setOpen(false)}>
          <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
            Confirmez la suppression. Si l’élément est utilisé ailleurs (tickets, actifs, pièces…), la suppression sera refusée pour protéger vos données.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="danger" disabled={busy} onClick={run}>{busy ? "Suppression…" : "Oui, supprimer"}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
