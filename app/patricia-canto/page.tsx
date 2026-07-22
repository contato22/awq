import PatriciaCantoBoard from "@/components/patricia-canto/PatriciaCantoBoard";
import { buildInitialLeads } from "@/lib/patricia-canto/leads";

export default function PatriciaCantoPage() {
  return <PatriciaCantoBoard initialLeads={buildInitialLeads()} />;
}
