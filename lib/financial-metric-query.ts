// ─── AWQ Financial Metric Query Layer ────────────────────────────────────────
//
// THE single consumption interface for all central financial pages.
//
// ARCHITECTURE CONTRACT:
//   Every function here returns FinancialMetric<T> objects — never raw numbers.
//   Pages import from HERE, not from financial-query.ts or awq-derived-metrics.ts
//   directly, for canonical financial KPIs.
//
// REGIME:
//   Real metrics  → sourced from buildFinancialQuery() (bank statements)
//   Snapshot metrics → sourced from awq-derived-metrics (planning/accrual)
//   When real data absent → snapshot shown as "fallback", clearly labelled
//   When no data at all → emptyMetric returned, UI must show "sem dado"
//
// HIERARCHY:
//   lib/financial-db.ts              ← persistence
//   lib/financial-query.ts           ← real selector
//   lib/awq-group-data.ts            ← planning store (private)
//   lib/awq-derived-metrics.ts       ← planning derivation
//   lib/financial-metric-registry.ts ← type contract + factories
//   THIS FILE                        ← canonical page interface
//
// DO NOT add raw number exports here. All outputs are FinancialMetric<T>.

import {
  buildFinancialQuery,
  fmtBRL,
  type FinancialQueryResult,
  ENTITY_LABELS,
  type EntitySummary,
} from "./financial-query";

import {
  consolidated,
  consolidatedMargins,
  consolidatedRoic,
  budgetVsActual,
  operatingBus,
  buData,
  riskSignals,
} from "./awq-derived-metrics";

import {
  realMetric,
  snapshotMetric,
  fallbackMetric,
  emptyMetric,
  type FinancialMetric,
  type ReconciliationStatus,
  type CoverageStatus,
} from "./financial-metric-registry";

export type { FinancialMetric };
export { fmtBRL, ENTITY_LABELS };
export type { FinancialQueryResult, EntitySummary };

// ─── AWQ Group KPI set ────────────────────────────────────────────────────────
//
// Used by /awq/kpis, /awq/page (control tower).
// Real metrics require buildFinancialQuery(). Snapshot metrics are always available.

export interface AWQGroupKPIs {
  // ── Real (from bank statement pipeline) ─────────────────────────────────
  cashInflows:         FinancialMetric<number | null>;
  cashOutflows:        FinancialMetric<number | null>;
  operationalNetCash:  FinancialMetric<number | null>;
  totalCashBalance:    FinancialMetric<number | null>;
  // ── Snapshot / planning (from awq-group-data) ────────────────────────────
  totalRevenue:        FinancialMetric<number>;
  ebitda:              FinancialMetric<number>;
  ebitdaMargin:        FinancialMetric<number>;
  netIncome:           FinancialMetric<number>;
  grossMargin:         FinancialMetric<number>;
  netMargin:           FinancialMetric<number>;
  totalClients:        FinancialMetric<number>;
  totalFTEs:           FinancialMetric<number>;
  roic:                FinancialMetric<number>;
  budgetVariance:      FinancialMetric<number>;
  revenuePerClient:    FinancialMetric<number>;
  revenuePerFTE:       FinancialMetric<number>;
  // ── Coverage diagnostics ─────────────────────────────────────────────────
  hasRealData:         boolean;
  dataQuality:         FinancialQueryResult["dataQuality"] | null;
  periodLabel:         string | null;
}

export async function getAWQGroupKPIs(): Promise<AWQGroupKPIs> {
  const q = await buildFinancialQuery();
  const c = q.consolidated;
  const has = q.hasData;

  const realPeriod = has && c.periodStart && c.periodEnd
    ? `${c.periodStart} → ${c.periodEnd}`
    : "aguardando ingestão";

  const covStatus: CoverageStatus = has
    ? (q.dataQuality.coverageGaps.length === 0 ? "full" : "partial")
    : "empty";

  const recon: ReconciliationStatus = has
    ? (q.dataQuality.doneDocuments >= 2 ? "partial" : "unreconciled")
    : "not_applicable";

  return {
    // ── Real metrics ──────────────────────────────────────────────────────
    cashInflows: has
      ? realMetric(c.totalRevenue, {
          entity:           "AWQ Group (consolidado)",
          period:           realPeriod,
          calculation_rule: "SUM(transactions WHERE direction=credit AND NOT excludedFromConsolidated AND managerialCategory IN receita_*)",
          reconciliation_status: recon,
          coverage_status:  covStatus,
        })
      : emptyMetric("SUM(credits classificados receita_* — excl. intercompany)", "AWQ Group"),

    cashOutflows: has
      ? realMetric(c.totalExpenses, {
          entity:           "AWQ Group (consolidado)",
          period:           realPeriod,
          calculation_rule: "SUM(transactions WHERE direction=debit AND NOT excludedFromConsolidated AND managerialCategory IN operational_expense_cats)",
          reconciliation_status: recon,
          coverage_status:  covStatus,
        })
      : emptyMetric("SUM(débitos operacionais — excl. intercompany)", "AWQ Group"),

    operationalNetCash: has
      ? realMetric(c.operationalNetCash, {
          entity:           "AWQ Group (consolidado)",
          period:           realPeriod,
          calculation_rule: "cashInflows - cashOutflows (intercompany eliminado)",
          reconciliation_status: recon,
          coverage_status:  covStatus,
        })
      : emptyMetric("cashInflows - cashOutflows", "AWQ Group"),

    totalCashBalance: has
      ? realMetric(c.totalCashBalance, {
          entity:           "AWQ Group (todas contas)",
          period:           realPeriod,
          calculation_rule: "SUM(closingBalance de todos os documentos com status=done)",
          reconciliation_status: recon,
          coverage_status:  covStatus,
          note:             covStatus === "partial"
            ? `${q.dataQuality.coverageGaps.join("; ")}`
            : undefined,
        })
      : emptyMetric("SUM(closingBalance por conta ingerida)", "AWQ Group"),

    // ── Snapshot metrics ──────────────────────────────────────────────────
    totalRevenue: snapshotMetric(consolidated.revenue, {
      entity:           "AWQ Group (BUs operacionais excl. Venture)",
      calculation_rule: "SUM(buData.revenue FOR operating BUs)",
    }),

    ebitda: snapshotMetric(consolidated.ebitda, {
      entity:           "AWQ Group (BUs operacionais excl. Venture)",
      calculation_rule: "SUM(buData.ebitda FOR operating BUs)",
    }),

    ebitdaMargin: snapshotMetric(consolidatedMargins.ebitdaMargin, {
      entity:           "AWQ Group",
      calculation_rule: "consolidated.ebitda / consolidated.revenue",
    }),

    netIncome: snapshotMetric(consolidated.netIncome, {
      entity:           "AWQ Group (BUs operacionais excl. Venture)",
      calculation_rule: "SUM(buData.netIncome FOR operating BUs)",
    }),

    grossMargin: snapshotMetric(consolidatedMargins.grossMargin, {
      entity:           "AWQ Group",
      calculation_rule: "consolidated.grossProfit / consolidated.revenue",
    }),

    netMargin: snapshotMetric(consolidatedMargins.netMargin, {
      entity:           "AWQ Group",
      calculation_rule: "consolidated.netIncome / consolidated.revenue",
    }),

    totalClients: snapshotMetric(consolidated.customers, {
      entity:           "AWQ Group (BUs operacionais)",
      calculation_rule: "SUM(buData.customers FOR operating BUs)",
    }),

    totalFTEs: snapshotMetric(consolidated.ftes, {
      entity:           "AWQ Group (BUs operacionais)",
      calculation_rule: "SUM(buData.ftes FOR operating BUs)",
    }),

    roic: snapshotMetric(consolidatedRoic, {
      entity:           "AWQ Group",
      calculation_rule: "(consolidated.netIncome / consolidated.capitalAllocated) × 100",
    }),

    budgetVariance: snapshotMetric(budgetVsActual, {
      entity:           "AWQ Group (BUs operacionais)",
      calculation_rule: "((consolidated.revenue - consolidated.budgetRevenue) / consolidated.budgetRevenue) × 100",
    }),

    revenuePerClient: snapshotMetric(
      Math.round(consolidated.revenue / consolidated.customers),
      {
        entity:           "AWQ Group",
        calculation_rule: "consolidated.revenue / consolidated.customers",
      }
    ),

    revenuePerFTE: snapshotMetric(
      Math.round(consolidated.revenue / consolidated.ftes),
      {
        entity:           "AWQ Group",
        calculation_rule: "consolidated.revenue / consolidated.ftes",
      }
    ),

    // ── Diagnostics ──────────────────────────────────────────────────────
    hasRealData:  q.hasData,
    dataQuality:  q.hasData ? q.dataQuality : null,
    periodLabel:  realPeriod === "aguardando ingestão" ? null : realPeriod,
  };
}

// ─── Per-entity real cash summary ─────────────────────────────────────────────
//
// Used by /awq/kpis and /awq/financial for the per-entity cash breakdown.

export interface EntityCashMetrics {
  entity:             string;
  label:              string;
  cashInflows:        FinancialMetric<number>;
  cashOutflows:       FinancialMetric<number>;
  operationalNetCash: FinancialMetric<number>;
  totalCashBalance:   FinancialMetric<number>;
  documentCount:      number;
  periodStart:        string | null;
  periodEnd:          string | null;
}

export async function getEntityCashMetrics(): Promise<EntityCashMetrics[]> {
  const q = await buildFinancialQuery();
  if (!q.hasData) return [];

  return q.entities
    .filter((e) => ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity))
    .map((e): EntityCashMetrics => {
      const period = e.periodStart && e.periodEnd
        ? `${e.periodStart} → ${e.periodEnd}`
        : "período parcial";

      const base = {
        entity:   e.entity,
        period,
        reconciliation_status: "partial" as ReconciliationStatus,
        coverage_status: e.documentCount >= 1 ? "partial" as CoverageStatus : "empty" as CoverageStatus,
      };

      return {
        entity:  e.entity,
        label:   ENTITY_LABELS[e.entity] ?? e.entity,
        cashInflows:        realMetric(e.operationalRevenue, { ...base, entity: ENTITY_LABELS[e.entity], calculation_rule: "SUM(credits receita_* WHERE entity=" + e.entity + ")" }),
        cashOutflows:       realMetric(e.operationalExpenses, { ...base, entity: ENTITY_LABELS[e.entity], calculation_rule: "SUM(debits operational WHERE entity=" + e.entity + ")" }),
        operationalNetCash: realMetric(e.operationalNetCash, { ...base, entity: ENTITY_LABELS[e.entity], calculation_rule: "cashInflows - cashOutflows" }),
        totalCashBalance:   realMetric(e.totalCashBalance, { ...base, entity: ENTITY_LABELS[e.entity], calculation_rule: "SUM(closingBalance WHERE entity=" + e.entity + ")" }),
        documentCount: e.documentCount,
        periodStart:   e.periodStart,
        periodEnd:     e.periodEnd,
      };
    });
}

// ─── Portfolio metrics ────────────────────────────────────────────────────────
//
// Used by /awq/portfolio. Hybrid: capital is snapshot, cash is real.

export interface PortfolioMetrics {
  totalCapitalAllocated: FinancialMetric<number>;
  totalNetIncome:        FinancialMetric<number>;
  realCashBalance:       FinancialMetric<number | null>;
  roic:                  FinancialMetric<number>;
  buCount:               FinancialMetric<number>;
}

export async function getPortfolioMetrics(): Promise<PortfolioMetrics> {
  const q = await buildFinancialQuery();
  const totalCap      = buData.reduce((s, b) => s + b.capitalAllocated, 0);
  const totalNetIncome= buData.reduce((s, b) => s + b.netIncome, 0);

  return {
    totalCapitalAllocated: snapshotMetric(totalCap, {
      entity:           "AWQ Group (todos os BUs)",
      calculation_rule: "SUM(buData.capitalAllocated FOR all BUs)",
    }),
    totalNetIncome: snapshotMetric(totalNetIncome, {
      entity:           "AWQ Group (todos os BUs)",
      calculation_rule: "SUM(buData.netIncome FOR all BUs)",
    }),
    realCashBalance: q.hasData
      ? realMetric(q.consolidated.totalCashBalance, {
          entity:           "AWQ Group",
          period:           q.consolidated.periodStart
            ? `${q.consolidated.periodStart} → ${q.consolidated.periodEnd}`
            : "parcial",
          calculation_rule: "SUM(closingBalance ingested accounts)",
        })
      : emptyMetric("SUM(closingBalance)", "AWQ Group"),
    roic: snapshotMetric(consolidatedRoic, {
      entity:           "AWQ Group",
      calculation_rule: "(netIncome / capitalAllocated) × 100",
    }),
    buCount: snapshotMetric(buData.length, {
      entity:           "AWQ Group",
      calculation_rule: "COUNT(buData)",
    }),
  };
}

// ─── Risk cash metrics ────────────────────────────────────────────────────────
//
// Used by /awq/risk. Real cash position + snapshot risk signals.

export interface RiskCashPosition {
  groupCashBalance: FinancialMetric<number | null>;
  operationalNetCash: FinancialMetric<number | null>;
  ambiguousAmount: FinancialMetric<number | null>;
  hasRealData: boolean;
}

export async function getRiskCashPosition(): Promise<RiskCashPosition> {
  const q = await buildFinancialQuery();

  if (!q.hasData) {
    return {
      groupCashBalance:    emptyMetric("Saldo consolidado (real)"),
      operationalNetCash:  emptyMetric("FCO líquido (real)"),
      ambiguousAmount:     emptyMetric("Montante ambíguo pendente de revisão"),
      hasRealData:         false,
    };
  }

  const period = q.consolidated.periodStart
    ? `${q.consolidated.periodStart} → ${q.consolidated.periodEnd}`
    : "parcial";

  return {
    groupCashBalance: realMetric(q.consolidated.totalCashBalance, {
      entity:           "AWQ Group",
      period,
      calculation_rule: "SUM(closingBalance ingested accounts)",
    }),
    operationalNetCash: realMetric(q.consolidated.operationalNetCash, {
      entity:           "AWQ Group",
      period,
      calculation_rule: "totalRevenue - totalExpenses (operational, intercompany eliminated)",
    }),
    ambiguousAmount: realMetric(q.consolidated.ambiguousAmount, {
      entity:           "AWQ Group",
      period,
      calculation_rule: "SUM(amount WHERE classificationConfidence IN [ambiguous, unclassifiable])",
      confidence_status: "low",
      note:             `${q.dataQuality.ambiguousCount} transações pendentes de revisão manual`,
    }),
    hasRealData: true,
  };
}

// ─── Management page metrics ──────────────────────────────────────────────────
//
// Diagnostic metrics for /awq/management.

export interface ManagementDiagnostics {
  totalDocumentsIngested: number;
  doneDocuments:          number;
  errorDocuments:         number;
  totalTransactions:      number;
  confirmedTransactions:  number;
  ambiguousTransactions:  number;
  coverageGaps:           string[];
  pipelineHealthy:        boolean;
  lastUpdated:            string | null;
  hasRealData:            boolean;
}

export async function getManagementDiagnostics(): Promise<ManagementDiagnostics> {
  const q = await buildFinancialQuery();

  if (!q.hasData && q.dataQuality.totalDocuments === 0) {
    return {
      totalDocumentsIngested: 0,
      doneDocuments: 0,
      errorDocuments: 0,
      totalTransactions: 0,
      confirmedTransactions: 0,
      ambiguousTransactions: 0,
      coverageGaps: ["Nenhum extrato ingerido. Acesse /awq/ingest."],
      pipelineHealthy: false,
      lastUpdated: null,
      hasRealData: false,
    };
  }

  const dq = q.dataQuality;
  return {
    totalDocumentsIngested: dq.totalDocuments,
    doneDocuments:          dq.doneDocuments,
    errorDocuments:         dq.totalDocuments - dq.doneDocuments,
    totalTransactions:      dq.totalTransactions,
    confirmedTransactions:  dq.confirmedCount,
    ambiguousTransactions:  dq.ambiguousCount,
    coverageGaps:           dq.coverageGaps,
    pipelineHealthy:        dq.doneDocuments > 0 && dq.coverageGaps.length === 0,
    lastUpdated:            q.consolidated.lastUpdated,
    hasRealData:            q.hasData,
  };
}

// ─── Formatting helpers (re-exported for pages) ───────────────────────────────

export function fmtR(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

export function fmtPct(n: number, decimals = 1): string {
  return (n * 100).toFixed(decimals) + "%";
}
