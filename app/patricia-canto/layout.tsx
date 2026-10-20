import type { Metadata } from "next";
import localFont from "next/font/local";

// Instrument Serif só existe em weight 400 — mais fino e editorial que a
// Playfair Display anterior, alinhado à referência de UI/UX aprovada
// (títulos finos, alto contraste de traço). Classes font-semibold/font-bold
// continuam no JSX; o navegador sintetiza o peso quando necessário.
// Arquivos locais (SIL OFL): o build não consulta o Google Fonts.
const instrumentSerif = localFont({
  src: [
    {
      path: "../fonts/instrument-serif-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/instrument-serif-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-canto-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: "CRM — Patrícia Canto Advogada",
  description: "Pipeline de casos previdenciários e cíveis em quadro Kanban.",
};

export default function PatriciaCantoLayout({ children }: { children: React.ReactNode }) {
  return <div className={instrumentSerif.variable}>{children}</div>;
}
