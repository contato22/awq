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
  // JACQES MRR constants (re-exported so pages never import awq-group-data directly)
  JACQES_MRR,
  JACQES_MRR_Q1,
  // Monthly
  monthlyRevenue,
  // Risk
  riskSignals,
  riskCategories,
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
  // Empirical holding investment snapshot
  holdingTreasurySnapshot,
  // Venture contract data
  ventureContracts,
  ventureFeeMRR,
  ventureFeeARR,
  ventureContractValueRemaining,
  // Types
  type BuData,
  type BuEconomicType,
  type MonthlyPoint,
  type RiskSignal,
  type RiskCategory,
  type RiskCategoryDetail,
  type AllocFlag,
  type ForecastPoint,
  type CashFlowRow,
  type CategoryBudgetItem,
  type BuBudgetTargets,
  type ForecastAccuracyPoint,
  type BuForecastScenario,
  type HoldingTreasurySnapshot,
  type VentureContract,
} from "./awq-group-data";

import {
  buData,
  buBudgetTargets,
} from "./awq-group-data";

import type { BuData, BuBudgetTargets } from "./awq-group-data";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function findBU(id: string): BuData {
  const b = buData.find((x) => x.id === id);
  if (!b) throw new Error(`awq-derived-metrics: BU "${id}" not found in buData`);
  return b;
}

const ZERO_BUDGET: BuBudgetTargets = { budgGrossProfit: 0, budgEbitda: 0, budgNetIncome: 0, budgCash: 0 };

function budgetFor(id: string): BuBudgetTargets {
  return buBudgetTargets[id] ?? ZERO_BUDGET;
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
    jacquesBudg:   budgetFor("jacqes").budgGrossProfit,
    jacquesActual: findBU("jacqes").grossProfit,
    cazaBudg:      budgetFor("caza").budgGrossProfit,
    cazaActual:    findBU("caza").grossProfit,
    advisorBudg:   budgetFor("advisor").budgGrossProfit,
    advisorActual: findBU("advisor").grossProfit,
    isExpense:     false,
  },
  {
    line:          "EBITDA",
    jacquesBudg:   budgetFor("jacqes").budgEbitda,
    jacquesActual: findBU("jacqes").ebitda,
    cazaBudg:      budgetFor("caza").budgEbitda,
    cazaActual:    findBU("caza").ebitda,
    advisorBudg:   budgetFor("advisor").budgEbitda,
    advisorActual: findBU("advisor").ebitda,
    isExpense:     false,
  },
  {
    line:          "Lucro Líquido",
    jacquesBudg:   budgetFor("jacqes").budgNetIncome,
    jacquesActual: findBU("jacqes").netIncome,
    cazaBudg:      budgetFor("caza").budgNetIncome,
    cazaActual:    findBU("caza").netIncome,
    advisorBudg:   budgetFor("advisor").budgNetIncome,
    advisorActual: findBU("advisor").netIncome,
    isExpense:     false,
  },
  {
    line:          "Cash Gerado",
    jacquesBudg:   budgetFor("jacqes").budgCash,
    jacquesActual: findBU("jacqes").cashGenerated,
    cazaBudg:      budgetFor("caza").budgCash,
    cazaActual:    findBU("caza").cashGenerated,
    advisorBudg:   budgetFor("advisor").budgCash,
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

/** Metadata for metrics read directly from the planning snapshot layer.
 *  NOTE: período heterogêneo — JACQES inclui Abr/2026 (confirmado); Caza encerrado em Mar/2026.
 */
export const SNAPSHOT_META: MetricMeta = {
  sourceType:  "snapshot",
  sourcePath:  "lib/awq-group-data.ts",
  period:      "YTD Jan–Abr 2026 (JACQES) / Jan–Mar 2026 (Caza) · accrual P&L",
  derivedFrom: undefined,
};

/** Metadata for metrics computed by the derivation layer from snapshot inputs */
export const DERIVED_META: MetricMeta = {
  sourceType:  "derived",
  sourcePath:  "lib/awq-derived-metrics.ts",
  period:      "YTD Jan–Abr 2026 (JACQES) / Jan–Mar 2026 (Caza) · accrual P&L",
  derivedFrom: "lib/awq-group-data.ts",
};
