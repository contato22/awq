import { redirect } from "next/navigation";

// Migrated to /jacqes/analise — kept for backward compatibility
export default function AnaliseRedirect() {
  redirect("/jacqes/analise");
}
