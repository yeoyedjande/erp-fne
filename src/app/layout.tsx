import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Polices chargées par next/font, avec pile de repli déclarée — voir la fiche de design. */
const sans = Inter({
  subsets: ["latin"], variable: "--font-sans", display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial"],
});

const display = Fraunces({
  subsets: ["latin"], variable: "--font-display", display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"], variable: "--font-mono", display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Markel Technology — CRM & facturation normalisée FNE",
    template: "%s · Markel CRM",
  },
  description:
    "Plateforme de gestion commerciale et de facturation normalisée électronique (FNE) de Markel Technology, Abidjan.",
};

export const viewport: Viewport = {
  themeColor: "#fbfaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
