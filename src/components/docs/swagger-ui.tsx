"use client";

import { useEffect, useRef } from "react";

type SwaggerGlobal = { SwaggerUIBundle: (opts: Record<string, unknown>) => unknown };

const CSS_URL = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
const JS_URL = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";

/** Loads Swagger UI from CDN (allowed by CSP) and mounts it into a local node. */
export function SwaggerUI({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    function ready(cb: () => void) {
      if ((window as unknown as Partial<SwaggerGlobal>).SwaggerUIBundle) return cb();
      if (!document.getElementById("swagger-ui-css")) {
        const link = document.createElement("link");
        link.id = "swagger-ui-css";
        link.rel = "stylesheet";
        link.href = CSS_URL;
        document.head.appendChild(link);
      }
      const existing = document.getElementById("swagger-ui-js") as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", cb, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "swagger-ui-js";
      script.src = JS_URL;
      script.async = true;
      script.onload = cb;
      document.body.appendChild(script);
    }

    ready(() => {
      if (cancelled || !host.current) return;
      const bundle = (window as unknown as SwaggerGlobal).SwaggerUIBundle;
      bundle({
        url,
        domNode: host.current,
        deepLinking: true,
        docExpansion: "list",
        defaultModelsExpandDepth: 0,
        tryItOutEnabled: true,
        persistAuthorization: true,
        withCredentials: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <>
      <div ref={host} />
      <noscript>Activez JavaScript pour afficher la documentation interactive.</noscript>
    </>
  );
}
