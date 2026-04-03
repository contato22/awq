// ─── AWQ Financial Metric Registry ───────────────────────────────────────────
//
// THE canonical type contract for every financial number displayed in the
// platform. Every metric must carry full provenance metadata.
//
// RULE: No financial value may be displayed in a central page without being
//       wrapped in a FinancialMetric<T> with a declared source_type.
//
// SOURCE TYPES:
//   real      — computed from ingested bank statements via financial-db.ts
//   derived   — computed from real data through canonical rules (financial-query.ts)
//   snapshot  — curated planning/accrual data (awq-group-data.ts) — NOT real
//   fallback  — snapshot shown because real data is not yet available
//   legacy    — old hardcode not yet migrated; must be replaced
//   empty     — no data available; UI must show "sem dado" state
//
// CONFIDENCE:
//   confirmed      — verified against source document (bank statement)
//   probable       — rule-based classification, not manually reviewed
//   low            — ambiguous classification pending manual review
//   unavailable    — no ingested data to derive from
//
// RECONCILIATION:
//   reconciled     — balances match between multiple sources
//   partial        — some accounts reconciled, others pending
//   unreconciled   — not yet cross-checked
//   not_applicable — metric doesn't require reconciliation (e.g., planning)
//   pending        — reconciliation scheduled, not done
//
// COVERAGE:
//   full           — all entities/periods represented
//   partial        — some entities or periods missing
//   empty          — no data ingested
//   not_applicable — coverage concept doesn't apply (e.g., single-entity metric)

// ─── Core types ───────────────────────────────────────────────────────────────

export type SourceType          = "real" | "derived" | "snapshot" | "fallback" | "legacy" | "empty";
export type ConfidenceStatus    = "confirmed" | "probable" | "low" | "unavailable";
export type ReconciliationStatus= "reconciled" | "partial" | "unreconciled" | "not_applicable" | "pending";
export type CoverageStatus      = "full" | "partial" | "empty" | "not_applicable";

export interface FinancialMetric<T = number> {
  /** The numeric (or other) value to display */
  value:                  T;
  /** Origin classification — drives UI badge color and text */
  source_type:            SourceType;
  /** File or system path that produced this value */
  source_name:            string;
  /** Entity this metric belongs to (e.g., "AWQ Group", "JACQES") */
  entity:                 string;
  /** Human-readable period string (e.g., "Q1 2026 (Jan–Mar)") */
  period:                 string;
  /** How trustworthy the value is */
  confidence_status:      ConfidenceStatus;
  /** Whether this metric has been cross-checked */
  reconciliation_status:  ReconciliationStatus;
  /** Formula or rule used to compute the value */
  calculation_rule:       string;
  /** Whether all relevant data is available */
  coverage_status:        CoverageStatus;
  /** Optional explanatory note */
  note?:                  string;
}

// ─── UI display helpers ───────────────────────────────────────────────────────

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  real:     "REAL",
  derived:  "DERIVADO",
  snapshot: "SNAPSHOT",
  fallback: "FALLBACK",
  legacy:   "LEGACY",
  empty:    "SEM DADO",
};

export const SOURCE_TYPE_STYLE: Record<SourceType, { border: string; bg: string; text: string }> = {
  real:     { border: "border-emerald-200", bg: "bg-emerald-100", text: "text-emerald-700" },
  derived:  { border: "border-blue-200",    bg: "bg-blue-100",    text: "text-blue-700"    },
  snapshot: { border: "border-amber-200",   bg: "bg-amber-100",   text: "text-amber-700"   },
  fallback: { border: "border-orange-200",  bg: "bg-orange-100",  text: "text-orange-700"  },
  legacy:   { border: "border-gray-300",    bg: "bg-gray-200",    text: "text-gray-600"    },
  empty:    { border: "border-gray-200",    bg: "bg-gray-100",    text: "text-gray-400"    },
};

export const CONFIDENCE_LABELS: Record<ConfidenceStatus, string> = {
  confirmed:   "confirmada",
  probable:    "provável",
  low:         "baixa",
  unavailable: "indisponível",
};

export const RECONCILIATION_LABELS: Record<ReconciliationStatus, string> = {
  reconciled:      "reconciliado",
  partial:         "parcial",
  unreconciled:    "não reconciliado",
  not_applicable:  "n/a",
  pending:         "pendente",
};

// ─── Factory functions ────────────────────────────────────────────────────────

const REAL_SOURCE  = "lib/financial-query.ts → lib/financial-db.ts (extratos ingeridos)";
const SNAP_SOURCE  = "lib/awq-group-data.ts via lib/awq-derived-metrics.ts (snapshot Q1 2026)";
const SNAP_PERIOD  = "Q1 2026 (Jan–Mar · accrual planejamento)";

/** Wrap a value from the real bank statement pipeline */
export function realMetric<T>(
  value: T,
  opts: {
    entity:                string;
    period:                string;
    calculation_rule:      string;
    reconciliation_status?: ReconciliationStatus;
    coverage_status?:       CoverageStatus;
    confidence_status?:     ConfidenceStatus;
    note?:                  string;
  }
): FinancialMetric<T> {
  return {
    value,
    source_type:           "real",
    source_name:           REAL_SOURCE,
    confidence_status:     opts.confidence_status ?? "confirmed",
    reconciliation_status: opts.reconciliation_status ?? "partial",
    coverage_status:       opts.coverage_status ?? "partial",
    ...opts,
  };
}

/** Wrap a value from the accrual/planning snapshot layer */
export function snapshotMetric<T>(
  value: T,
  opts: {
    entity:           string;
    calculation_rule: string;
    note?:            string;
    period?:          string;
  }
): FinancialMetric<T> {
  return {
    value,
    source_type:           "snapshot",
    source_name:           SNAP_SOURCE,
    period:                opts.period ?? SNAP_PERIOD,
    confidence_status:     "probable",
    reconciliation_status: "not_applicable",
    coverage_status:       "full",
    ...opts,
  };
}

/** Snapshot metric shown as fallback because real data isn't available yet */
export function fallbackMetric<T>(
  value: T,
  opts: {
    entity:           string;
    calculation_rule: string;
    note?:            string;
  }
): FinancialMetric<T> {
  return {
    value,
    source_type:           "fallback",
    source_name:           SNAP_SOURCE,
    period:                SNAP_PERIOD,
    confidence_status:     "probable",
    reconciliation_status: "not_applicable",
    coverage_status:       "partial",
    note:                  opts.note ?? "Dado de planejamento. Será substituído quando extrato bancário for ingerido.",
    ...opts,
  };
}

/** Metric with no data available — UI must show empty/unavailable state */
export function emptyMetric(
  calculation_rule: string,
  entity = "AWQ Group"
): FinancialMetric<null> {
  return {
    value:                 null,
    source_type:           "empty",
    source_name:           "pending — nenhum extrato ingerido",
    entity,
    period:                "aguardando ingestão",
    confidence_status:     "unavailable",
    reconciliation_status: "not_applicable",
    coverage_status:       "empty",
    calculation_rule,
    note:                  "Ingira extratos em /awq/ingest para ver este dado.",
  };
}

/** Type guard: check if a metric has a non-null real value */
export function hasValue<T>(m: FinancialMetric<T | null>): m is FinancialMetric<T> {
  return m.value !== null;
}

/** Format helper: returns display string for metric value or "—" if empty */
export function metricDisplay(
  m: FinancialMetric<number | null>,
  formatter: (n: number) => string
): string {
  if (m.value === null) return "—";
  return formatter(m.value);
}
