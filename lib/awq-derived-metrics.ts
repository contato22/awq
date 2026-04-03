// ─── AWQ Canonical Derivation Layer ──────────────────────────────────────────
//
// THE ONLY import point for planning/accrual data in page files.
//
// RULE:
//   lib/awq-group-data.ts is now a PRIVATE data store.
//   Only this file imports from it directly.
//   All pages import planning data from HERE, never from awq-group-data directly.
//
//   Real cash data: lib/financial-query.ts → buildFinancialQuery() (unchanged)
//
// DERIVATION MAP:
//   buData + buBudgetTargets → BUDGET_LINES      (zero drift: actuals derived from buData)
//   buData.capitalAllocated / buData.netIncome   → PAYBACK_ESTIMATES (derived, not hardcoded)
//   forecastAccuracyHistory (canonical store)    → re-exported as-is
//   buForecastScenarios     (canonical store)    → re-exported as-is
//   categoryBudget          (canonical store)    → re-exported as-is
//
// ARCHITECTURE:
//   Before: pages imported awq-group-data directly AND defined inline arrays
//           that duplicated buData values (creating drift risk).
//   After:  pages import this file only. Derivations are computed once here.
//           awq-group-data.ts changes propagate automatically to all pages.

// ─── Re-export entire public API of awq-group-data ───────────────────────────
//
// This makes awq-derived-metrics a drop-in replacement for awq-group-data in
// all import statements. Pages that only read buData / consolidated / etc.
// need zero changes beyond the import path.

export {
  // BU data
  buData,
  operatingBus,
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
  // Monthly
  monthlyRevenue,
  // Risk
  riskSignals,
  // Allocation
  allocFlags,
  flagConfig,
  // Forecast
  revenueForecasts,
  // Cash flow
  cashFlowRows,
  // Budget/planning data (canonical stores — moved from page inline arrays)
  categoryBudget,
  buBudgetTargets,
  forecastAccuracyHistory,
  buForecastScenarios,
  // Types
  type BuData,
  type MonthlyPoint,
  type RiskSignal,
  type AllocFlag,
  type ForecastPoint,
  type CashFlowRow,
  type CategoryBudgetItem,
  type BuBudgetTargets,
  type ForecastAccuracyPoint,
  type BuForecastScenario,
} from "./awq-group-data";

import {
  buData,
  buBudgetTargets,
} from "./awq-group-data";

import type { BuData } from "./awq-group-data";

// ─── Internal helper ──────────────────────────────────────────────────────────

function findBU(id: string): BuData {
  const b = buData.find((x) => x.id === id);
  if (!b) throw new Error(`awq-derived-metrics: BU "${id}" not found in buData`);
  return b;
}

// ─── BUDGET_LINES — derived, not hardcoded ────────────────────────────────────
//
// BEFORE (budget/page.tsx had inline array):
//   const budgetLines = [
//     { line: "Receita", jacquesBudg: 4_440_000, jacquesActual: 4_820_000, ... },
//   ];
//   — actual values were DUPLICATED from buData. Drift risk if buData changes.
//
// AFTER:
//   Actual values derived from buData (single source).
//   Budget targets from buBudgetTargets (single source).
//   No duplication possible.

export interface BudgetLine {
  line:          string;
  jacquesBudg:   number;
  jacquesActual: number;
  cazaBudg:      number;
  cazaActual:    number;
  advisorBudg:   number;
  advisorActual: number;
  isExpense:     boolean;
}

export const BUDGET_LINES: BudgetLine[] = [
  {
    line:          "Receita",
    jacquesBudg:   findBU("jacqes").budgetRevenue,
    jacquesActual: findBU("jacqes").revenue,
    cazaBudg:      findBU("caza").budgetRevenue,
    cazaActual:    findBU("caza").revenue,
    advisorBudg:   findBU("advisor").budgetRevenue,
    advisorActual: findBU("advisor").revenue,
    isExpense:     false,
  },
  {
    line:          "Gross Profit",
    jacquesBudg:   buBudgetTargets["jacqes"].budgGrossProfit,
    jacquesActual: findBU("jacqes").grossProfit,
    cazaBudg:      buBudgetTargets["caza"].budgGrossProfit,
    cazaActual:    findBU("caza").grossProfit,
    advisorBudg:   buBudgetTargets["advisor"].budgGrossProfit,
    advisorActual: findBU("advisor").grossProfit,
    isExpense:     false,
  },
  {
    line:          "EBITDA",
    jacquesBudg:   buBudgetTargets["jacqes"].budgEbitda,
    jacquesActual: findBU("jacqes").ebitda,
    cazaBudg:      buBudgetTargets["caza"].budgEbitda,
    cazaActual:    findBU("caza").ebitda,
    advisorBudg:   buBudgetTargets["advisor"].budgEbitda,
    advisorActual: findBU("advisor").ebitda,
    isExpense:     false,
  },
  {
    line:          "Lucro Líquido",
    jacquesBudg:   buBudgetTargets["jacqes"].budgNetIncome,
    jacquesActual: findBU("jacqes").netIncome,
    cazaBudg:      buBudgetTargets["caza"].budgNetIncome,
    cazaActual:    findBU("caza").netIncome,
    advisorBudg:   buBudgetTargets["advisor"].budgNetIncome,
    advisorActual: findBU("advisor").netIncome,
    isExpense:     false,
  },
  {
    line:          "Cash Gerado",
    jacquesBudg:   buBudgetTargets["jacqes"].budgCash,
    jacquesActual: findBU("jacqes").cashGenerated,
    cazaBudg:      buBudgetTargets["caza"].budgCash,
    cazaActual:    findBU("caza").cashGenerated,
    advisorBudg:   buBudgetTargets["advisor"].budgCash,
    advisorActual: findBU("advisor").cashGenerated,
    isExpense:     false,
  },
];

// ─── PAYBACK_ESTIMATES — derived, not hardcoded ───────────────────────────────
//
// BEFORE (allocations/page.tsx had inline object):
//   const paybackMonths = {
//     jacqes:  Math.round((2_400_000 / 518_000) * 3),   // duplicated buData values!
//     caza:    Math.round((1_200_000 / 420_000) * 3),
//     advisor: Math.round((800_000  / 479_000) * 3),
//   };
//   — if buData.capitalAllocated or netIncome changes, this won't update.
//
// AFTER:
//   Derived from buData. Change buData → payback updates automatically.
//   null for BUs with netIncome = 0 (Venture investment vehicle).

export const PAYBACK_ESTIMATES: Record<string, number | null> = Object.fromEntries(
  buData.map((b) => [
    b.id,
    b.netIncome > 0
      ? Math.round((b.capitalAllocated / b.netIncome) * 3)   // quarterly periods × 3 = months
      : null,
  ])
);

// ─── Source metadata ──────────────────────────────────────────────────────────
//
// Every metric sourced from the planning layer should declare its origin.
// Import SNAPSHOT_META or DERIVED_META and attach to UI tooltips / data-source attrs.

export type MetricSourceType = "real" | "snapshot" | "derived" | "unavailable";

export interface MetricMeta {
  sourceType:   MetricSourceType;
  sourcePath:   string;
  period:       string;
  derivedFrom?: string;
}

/** Metadata for metrics read directly from the planning snapshot layer */
export const SNAPSHOT_META: MetricMeta = {
  sourceType:  "snapshot",
  sourcePath:  "lib/awq-group-data.ts",
  period:      "Q1 2026 (Jan–Mar · accrual P&L)",
  derivedFrom: undefined,
};

/** Metadata for metrics computed by the derivation layer from snapshot inputs */
export const DERIVED_META: MetricMeta = {
  sourceType:  "derived",
  sourcePath:  "lib/awq-derived-metrics.ts",
  period:      "Q1 2026 (Jan–Mar · accrual P&L)",
  derivedFrom: "lib/awq-group-data.ts",
};
