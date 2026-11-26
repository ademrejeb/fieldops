import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-[#C2410C] text-white shadow-sm shadow-orange-900/10 hover:bg-[#9A3412] dark:bg-[#EA580C] dark:hover:bg-[#C2410C]",
        dark: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
        secondary:
          "bg-white text-stone-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 dark:bg-[#1C1917] dark:text-stone-200 dark:ring-stone-700 dark:hover:bg-[#251F1A]",
        ghost: "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#251F1A]",
        danger: "bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export function Button({
  className,
  variant,
  size,
  loading,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-[#1C1917] dark:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between px-5 pb-2 pt-4", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-[13.5px] text-stone-900 placeholder:text-stone-400 focus:border-[#C2410C] focus:outline-none focus:ring-2 focus:ring-orange-100 dark:border-stone-700 dark:bg-[#1C1917] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-orange-950",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-[#C2410C] focus:outline-none focus:ring-2 focus:ring-orange-100 dark:border-stone-700 dark:bg-[#1C1917] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-orange-950",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-lg border border-stone-200 bg-white px-2.5 text-[13.5px] font-medium text-stone-700 focus:border-[#C2410C] focus:outline-none dark:border-stone-700 dark:bg-[#1C1917] dark:text-stone-200",
        className
      )}
      {...props}
    />
  );
}

export { Label } from "./label";

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-[13px] font-semibold text-stone-700 dark:text-stone-200">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-[12.5px] text-stone-500 dark:text-stone-400">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-label="Chargement" />;
}
