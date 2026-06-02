"use client";

import type { BankTransaction } from "@/lib/financial-db";

// STRIP TEST — sem hooks, sem recharts, sem cálculos
export default function EnrdFlowChart({
  transactions,
}: {
  transactions: BankTransaction[];
  coraConfigured: boolean;
}) {
  return (
    <div
      style={{
        background: "#7c3aed",
        padding: "20px",
        borderRadius: "12px",
        color: "white",
        fontWeight: "bold",
        fontSize: "14px",
        margin: "8px 0",
      }}
    >
      STRIP TEST — EnrdFlowChart monta ✓ · {transactions.length} transações ENERDY
    </div>
  );
}
