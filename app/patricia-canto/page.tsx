import type { Metadata } from "next";
import PatriciaCantoBoard from "@/components/patricia-canto/PatriciaCantoBoard";
import { buildInitialLeads } from "@/lib/patricia-canto/leads";

export const metadata: Metadata = {
  title: "CRM — Patricia Canto Advocacia",
  description: "Pipeline de casos previdenciários e cíveis em quadro Kanban.",
};

export default function PatriciaCantoPage() {
  return <PatriciaCantoBoard initialLeads={buildInitialLeads()} />;
}
