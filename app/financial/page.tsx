import { redirect } from "next/navigation";

// Migrated to /jacqes/financial — kept for backward compatibility
export default function FinancialRedirect() {
  redirect("/jacqes/financial");
}
