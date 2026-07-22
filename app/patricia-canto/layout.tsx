import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-canto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRM — Patrícia Canto Advogada",
  description: "Pipeline de casos previdenciários e cíveis em quadro Kanban.",
};

export default function PatriciaCantoLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable}>{children}</div>;
}
