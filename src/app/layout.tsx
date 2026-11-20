import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ShellChrome } from "@/components/layout/shell-chrome";
import { Toaster } from "@/components/ux/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FieldOps — Gestion des interventions",
  description:
    "Interventions, planning, techniciens et facturation réunis dans un seul espace.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#060b16" },
  ],
};

/* Applies the persisted (or system) theme before paint to avoid a flash of the wrong theme. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("fieldops-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Providers>
          <ShellChrome>{children}</ShellChrome>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
