import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import LayoutShell from "@/components/LayoutShell";
import BuildSHAGuard from "@/components/BuildSHAGuard";

// next/font/google baixa o CSS do Google no build. No Next 14.2.35 o loader
// exige que a URL do arquivo termine em .woff2; quando o Google devolve
// query string o regex falha (Cannot read properties of null (reading '1'))
// e o harness fica vermelho de forma intermitente. O woff2 latino variável
// (pesos 100–900, SIL OFL) fica no repositório.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: "AWQ Group — Plataforma Central",
  description:
    "Plataforma de governança, controle e inteligência executiva do AWQ Group.",
  icons: {
    icon: "/favicon.ico",
  },
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // pt-BR + translate="no": com lang="en" o Chrome oferecia traduzir o app
    // (conteúdo em PT) e o tradutor quebrava o React ("removeChild ... Node").
    <html lang="pt-BR" translate="no" className={inter.className}>
      <body>
        <BuildSHAGuard />
        <AuthProvider>
          <LayoutShell>{children}</LayoutShell>
        </AuthProvider>
      </body>
    </html>
  );
}
