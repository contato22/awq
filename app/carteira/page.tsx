import { redirect } from "next/navigation";

// Migrated to /jacqes/carteira — kept for backward compatibility
export default function CarteiraRedirect() {
  redirect("/jacqes/carteira");
}
