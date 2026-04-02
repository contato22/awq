import { redirect } from "next/navigation";

// Migrated to /jacqes/revenue — kept for backward compatibility
export default function RevenueRedirect() {
  redirect("/jacqes/revenue");
}
