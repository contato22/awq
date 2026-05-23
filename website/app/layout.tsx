import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWQ Group — Construindo o futuro",
  description:
    "O Grupo AWQ é um ecossistema de empresas focadas em crescimento, criatividade e impacto. Agência, produtora, consultoria, energia e investimentos.",
  keywords: ["AWQ Group", "AWQ", "agência", "investimentos", "consultoria", "Brasil"],
  openGraph: {
    title: "AWQ Group",
    description: "Ecossistema de empresas focadas em crescimento e impacto.",
    url: "https://awq.com.br",
    siteName: "AWQ Group",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="grain">
      <body>{children}</body>
    </html>
  );
}
