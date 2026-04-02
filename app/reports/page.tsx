import { redirect } from "next/navigation";

// Migrated to /jacqes/reports — kept for backward compatibility
export default function ReportsRedirect() {
  redirect("/jacqes/reports");
}
