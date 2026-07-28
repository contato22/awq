import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";

// Instrument Serif só existe em weight 400 — mais fino e editorial que a
// Playfair Display anterior, alinhado à referência de UI/UX aprovada
// (títulos finos, alto contraste de traço). Classes font-semibold/font-bold
// continuam no JSX; o navegador sintetiza o peso quando necessário.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-canto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRM — Patrícia Canto Advogada",
  description: "Pipeline de casos previdenciários e cíveis em quadro Kanban.",
};

export default function PatriciaCantoLayout({ children }: { children: React.ReactNode }) {
  return <div className={instrumentSerif.variable}>{children}</div>;
}
