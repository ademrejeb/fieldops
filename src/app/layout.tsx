import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ShellChrome } from "@/components/layout/shell-chrome";
import { Toaster } from "@/components/ux/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "khedma. — Le service, sans détour",
  description:
    "Demandes publiques, dispatch augmenté, planning, techniciens et facturation : un seul espace pour les métiers du service.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
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
