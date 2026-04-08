import { redirect } from "next/navigation";

// Migrated to /jacqes/desempenho — kept for backward compatibility
export default function DesempenhoRedirect() {
  redirect("/jacqes/desempenho");
}
