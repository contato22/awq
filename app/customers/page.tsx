import { redirect } from "next/navigation";

// Migrated to /jacqes/customers — kept for backward compatibility
export default function CustomersRedirect() {
  redirect("/jacqes/customers");
}
