import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import LayoutShell from "@/components/LayoutShell";
import BuildSHAGuard from "@/components/BuildSHAGuard";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
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
