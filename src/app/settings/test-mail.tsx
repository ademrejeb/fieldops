"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui/primitives";
import { toast } from "@/components/ux/toast";

export function TestMail({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/test-mail", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast(data.sent ? `Email de test envoyé à ${to}.` : `SMTP non configuré — email visible dans les logs serveur.`);
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1"><Label>Destinataire test</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="vous@…" /></div>
      <Button onClick={send} disabled={busy}>{busy ? "…" : "Envoyer un test"}</Button>
    </div>
  );
}
