"use client";

import dynamic from "next/dynamic";
import type { BankTransaction } from "@/lib/financial-db";

// Dynamic import inside a Client Component — correct Next.js App Router pattern.
// This ensures recharts (ResizeObserver, DOM APIs) never runs during SSR.
const EnrdFlowChart = dynamic(() => import("./EnrdFlowChart"), { ssr: false });

export default function EnrdFlowChartClient({
  transactions,
  coraConfigured,
}: {
  transactions: BankTransaction[];
  coraConfigured: boolean;
}) {
  return <EnrdFlowChart transactions={transactions} coraConfigured={coraConfigured} />;
}
