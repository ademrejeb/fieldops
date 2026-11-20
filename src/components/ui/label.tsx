"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Form label that links itself to the first input/select/textarea in its
 * container. Keeps every form accessible without repeating ids everywhere.
 */
export function Label({
  children,
  htmlFor,
  className = "",
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  const autoId = useId();
  const ref = useRef<HTMLLabelElement>(null);
  const id = htmlFor ?? autoId;

  useEffect(() => {
    const label = ref.current;
    if (!label || htmlFor) return;
    const container = label.parentElement;
    if (!container) return;
    const control = container.querySelector<HTMLElement>(
      "input:not([type='hidden']), select, textarea"
    );
    if (!control) return;
    if (control.id) label.htmlFor = control.id;
    else control.id = id;
    if (!control.getAttribute("aria-label")) {
      const text = label.textContent?.replace(/\s*\*$/, "").trim();
      if (text) control.setAttribute("aria-label", text);
    }
  }, [htmlFor, id]);

  return (
    <label
      ref={ref}
      htmlFor={id}
      className={`mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${className}`}
    >
      {children}
    </label>
  );
}
