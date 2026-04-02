// ─── AWQ Holding — Consolidated Data Layer ─────────────────────────────────────
// This is the AWQ "control tower" data layer.
// It wraps lib/awq-group-data.ts with metadata and provides
// consolidated views across all BUs.
//
// Key principle: BUs never feed each other directly.
// All cross-BU consolidation happens HERE, in the AWQ layer.

import {
  buData,
  operatingBus,
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
  monthlyRevenue,
  riskSignals,
  allocFlags,
  flagConfig,
  revenueForecasts,
  cashFlowRows,
} from "@/lib/awq-group-data";

import type {
  BuData,
  MonthlyPoint,
  RiskSignal,
  ForecastPoint,
  CashFlowRow,
  AllocFlag,
} from "@/lib/awq-group-data";

import { createEnvelope } from "../types/source-meta";
import type { DataEnvelope } from "../types/source-meta";
import type { ConsolidatedFinancials, MarginRatios } from "../types/financial";
import { SOURCE_CATALOG } from "../meta";

// ─── Raw re-exports (backward compatibility) ─────────────────────────────────
export {
  buData,
  operatingBus,
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
  monthlyRevenue,
  riskSignals,
  allocFlags,
  flagConfig,
  revenueForecasts,
  cashFlowRows,
};

// ─── Type re-exports ──────────────────────────────────────────────────────────
export type {
  BuData,
  MonthlyPoint,
  RiskSignal,
  ForecastPoint,
  CashFlowRow,
  AllocFlag,
};

// ─── Governed data access ─────────────────────────────────────────────────────

export function getAwqBuData(): DataEnvelope<BuData[]> {
  return createEnvelope(buData, SOURCE_CATALOG["awq:bu-data"]);
}

export function getAwqConsolidated(): DataEnvelope<ConsolidatedFinancials> {
  return createEnvelope(consolidated as ConsolidatedFinancials, SOURCE_CATALOG["awq:consolidated"]);
}

export function getAwqMargins(): DataEnvelope<MarginRatios> {
  return createEnvelope(
    consolidatedMargins as MarginRatios,
    SOURCE_CATALOG["awq:consolidated"]
  );
}

export function getAwqMonthlyRevenue(): DataEnvelope<MonthlyPoint[]> {
  return createEnvelope(monthlyRevenue, SOURCE_CATALOG["awq:monthly-revenue"]);
}

export function getAwqRiskSignals(): DataEnvelope<RiskSignal[]> {
  return createEnvelope(riskSignals, SOURCE_CATALOG["awq:risk-signals"]);
}

export function getAwqAllocFlags(): DataEnvelope<Record<string, AllocFlag>> {
  return createEnvelope(allocFlags, SOURCE_CATALOG["awq:alloc-flags"]);
}

export function getAwqForecasts(): DataEnvelope<ForecastPoint[]> {
  return createEnvelope(revenueForecasts, SOURCE_CATALOG["awq:forecasts"]);
}

export function getAwqCashFlow(): DataEnvelope<CashFlowRow[]> {
  return createEnvelope(cashFlowRows, SOURCE_CATALOG["awq:cashflow"]);
}

// ─── Holding-level summary ────────────────────────────────────────────────────

export function getAwqHoldingSummary() {
  return {
    totalBus: buData.length,
    operatingBus: operatingBus.length,
    consolidatedRevenue: consolidated.revenue,
    consolidatedEbitda: consolidated.ebitda,
    consolidatedNetIncome: consolidated.netIncome,
    totalCash: consolidated.cashBalance,
    totalFtes: consolidated.ftes,
    totalCustomers: consolidated.customers,
    roic: consolidatedRoic,
    budgetVariance: budgetVsActual,
    grossMargin: consolidatedMargins.grossMargin,
    ebitdaMargin: consolidatedMargins.ebitdaMargin,
    netMargin: consolidatedMargins.netMargin,
    riskCount: riskSignals.length,
    highRiskCount: riskSignals.filter((r) => r.severity === "high").length,
  };
}

/** Get BU-specific data from the holding dataset by BU ID */
export function getBuDataById(buId: string): BuData | undefined {
  return buData.find((bu) => bu.id === buId);
}

/** Get risk signals filtered by BU */
export function getRiskSignalsByBu(buName: string): RiskSignal[] {
  return riskSignals.filter((r) => r.bu === buName);
}
