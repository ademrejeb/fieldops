"use client";

import { useEffect } from "react";

/* Last-resort boundary: renders its own <html>/<body> when the root layout itself throws. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f6fa", color: "#0f172a" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 6px" }}>FieldOps indisponible</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
              Le service a rencontré une erreur critique. Rechargez la page pour reprendre.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 18,
                padding: "9px 18px",
                borderRadius: 10,
                border: "none",
                background: "#1d4ed8",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Recharger
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
