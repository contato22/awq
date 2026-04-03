// ─── Financial Data Bridge ────────────────────────────────────────────────────
//
// Single entry point for dashboard data consumption.
//
// Priority order:
//   1. financial-db.ts (canonical pipeline store) — used when ≥1 doc is "done"
//   2. Hardcoded snapshot — used as fallback when no extracts have been ingested
//
// DO NOT import this module in client components — it calls financial-db which
// uses Node's `fs` module.

import {
  getCashPositionByEntity,
  getAllTransactions,
  getAllDocuments,
  type ConsolidatedCashPosition,
} from "./financial-db";

export type DataSource = "pipeline" | "snapshot";

export interface DataBridgeResult {
  source: DataSource;
  cashPositions: ConsolidatedCashPosition[];
  transactionCount: number;
  documentCount: number;
  lastUpdated: string | null; // ISO timestamp of most-recently extracted transaction
}

export function getFinancialDataSource(): DataBridgeResult {
  const docs = getAllDocuments().filter((d) => d.status === "done");
  const txns = getAllTransactions();
  const cashPositions = getCashPositionByEntity();

  if (docs.length > 0) {
    // Sort transactions by extractedAt descending to find most recent
    const sorted = [...txns].sort(
      (a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime()
    );
    return {
      source: "pipeline",
      cashPositions,
      transactionCount: txns.length,
      documentCount: docs.length,
      lastUpdated: sorted[0]?.extractedAt ?? null,
    };
  }

  return {
    source: "snapshot",
    cashPositions: [],
    transactionCount: 0,
    documentCount: 0,
    lastUpdated: null,
  };
}
