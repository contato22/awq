import { redirect } from "next/navigation";

// Migrated to /jacqes/carreira — kept for backward compatibility
export default function CarreiraRedirect() {
  redirect("/jacqes/carreira");
}
