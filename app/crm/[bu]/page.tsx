"use client";
import CrmDashboardView from "@/components/CrmDashboardView";
import { useCrmBuContext } from "@/lib/crm-bu-context";

export default function BuCrmDashboard() {
  const bu = useCrmBuContext();
  return <CrmDashboardView buFilter={bu ?? undefined} />;
}
