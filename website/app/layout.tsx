import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWQ Group",
  description: "Grupo de empresas focado em crescimento, criatividade e impacto. Agência, produtora, consultoria e investimentos.",
  keywords: ["AWQ", "AWQ Group", "agência", "marketing", "produtora", "consultoria", "investimentos"],
  openGraph: {
    title: "AWQ Group",
    description: "Grupo de empresas focado em crescimento, criatividade e impacto.",
    url: "https://awq.com.br",
    siteName: "AWQ Group",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
