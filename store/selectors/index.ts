// ─── Data Selectors ────────────────────────────────────────────────────────────
// Provides clean, composable data access functions.
// Selectors abstract the data source and provide cross-BU queries
// that respect the AWQ holding architecture:
//   - BUs are queried independently
//   - Consolidation happens only at the AWQ level
//   - No BU feeds another BU directly

import type { BuId, GenericKPI, GenericAlert } from "../types/common";
import type { BuData, RiskSignal } from "@/lib/awq-group-data";
import { buData, riskSignals } from "@/lib/awq-group-data";
import { kpis as jacqesKpis, alerts as jacqesAlerts } from "@/lib/data";
import { cazaKpis, cazaAlerts } from "@/lib/caza-data";
import { isMock } from "../mocks";

// ─── KPI Selectors ────────────────────────────────────────────────────────────

/** Get KPIs for a specific BU, normalized to GenericKPI shape */
export function selectKpisByBu(buId: BuId): GenericKPI[] {
  switch (buId) {
    case "jacqes":
      return jacqesKpis;
    case "caza-vision":
      return cazaKpis;
    default:
      return [];
  }
}

// ─── Alert Selectors ──────────────────────────────────────────────────────────

/** Get alerts for a specific BU, normalized to GenericAlert shape */
export function selectAlertsByBu(buId: BuId): GenericAlert[] {
  switch (buId) {
    case "jacqes":
      return jacqesAlerts;
    case "caza-vision":
      return cazaAlerts;
    default:
      return [];
  }
}

/** Get all alerts across all BUs (AWQ holding view) */
export function selectAllAlerts(): GenericAlert[] {
  return [...jacqesAlerts, ...cazaAlerts];
}

// ─── BU Data Selectors ────────────────────────────────────────────────────────

/** Get BU portfolio data by ID */
export function selectBuData(buId: string): BuData | undefined {
  return buData.find((bu) => bu.id === buId);
}

/** Get all operating BUs */
export function selectOperatingBus(): BuData[] {
  return buData.filter((bu) => bu.id !== "venture");
}

/** Get total consolidated revenue */
export function selectConsolidatedRevenue(): number {
  return selectOperatingBus().reduce((sum, bu) => sum + bu.revenue, 0);
}

// ─── Risk Selectors ───────────────────────────────────────────────────────────

/** Get risk signals by severity */
export function selectRisksBySeverity(severity: RiskSignal["severity"]): RiskSignal[] {
  return riskSignals.filter((r) => r.severity === severity);
}

/** Get risk signals by BU name */
export function selectRisksByBu(buName: string): RiskSignal[] {
  return riskSignals.filter((r) => r.bu === buName);
}

/** Get high-severity risks across all BUs */
export function selectHighRisks(): RiskSignal[] {
  return selectRisksBySeverity("high");
}

// ─── Data Source Selectors ────────────────────────────────────────────────────

/** Check if a BU's data is fully mock */
export function selectIsBuDataMock(buId: BuId): boolean {
  const sourcePrefix = buId === "caza-vision" ? "caza" : buId;
  const relevantSources = [
    `${sourcePrefix}:kpis`,
    `${sourcePrefix}:clients`,
    `${sourcePrefix}:alerts`,
  ];
  return relevantSources.every((s) => isMock(s));
}

/** Get a map of BU data completeness (percentage of non-mock sources) */
export function selectDataCompleteness(): Record<string, number> {
  const buIds: BuId[] = ["jacqes", "caza-vision", "advisor", "awq-venture", "enerdy"];
  const result: Record<string, number> = {};

  for (const buId of buIds) {
    // All BUs currently use mock data
    result[buId] = 0;
  }

  return result;
}
