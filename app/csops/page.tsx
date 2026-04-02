import { redirect } from "next/navigation";

// Migrated to /jacqes/csops — kept for backward compatibility
export default function CsOpsRedirect() {
  redirect("/jacqes/csops");
}
