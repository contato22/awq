// ─── Financial Types ───────────────────────────────────────────────────────────
// Shared financial structures for cross-BU consolidation and reporting.

/** Standardized P&L row for any BU */
export interface PLRow {
  label: string;
  value: number;
  previousValue?: number;
  unit: "currency" | "percent";
}

/** Standardized monthly data point for consolidation */
export interface MonthlyDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

/** Budget vs Actual comparison */
export interface BudgetComparison {
  buId: string;
  budgetRevenue: number;
  actualRevenue: number;
  variancePct: number;
  varianceAbs: number;
}

/** Consolidated financial summary across operating BUs */
export interface ConsolidatedFinancials {
  revenue: number;
  grossProfit: number;
  ebitda: number;
  netIncome: number;
  cashGenerated: number;
  cashBalance: number;
  customers: number;
  ftes: number;
  capitalAllocated: number;
  budgetRevenue: number;
}

/** Margin ratios */
export interface MarginRatios {
  grossMargin: number;
  ebitdaMargin: number;
  netMargin: number;
}
