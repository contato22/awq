// ─── AWQ Snapshot Registry ────────────────────────────────────────────────────
//
// Central catalogue of every snapshot / hardcoded / planning data source in the
// platform. Serves two purposes:
//
//   1. GOVERNANCE — surface in /awq/data to show exactly which pages still use
//      planning data vs real pipeline data.
//
//   2. FIREWALL — before adding a new hardcoded financial array anywhere in the
//      codebase, register it here first. If you cannot justify a registry entry,
//      you should not be adding the hardcode.
//
// RULE: No new financial constant arrays may be added to lib/ pages without a
//       corresponding entry here (enforced by code review).
//
// SOURCE OF TRUTH FOR REAL DATA:
//   lib/financial-query.ts → buildFinancialQuery()
//   This is the only authorised path for cash-basis financial data.
//
// MIGRATION TARGET:
//   Every "active" entry here represents a migration opportunity.
//   When the real pipeline provides the equivalent data, update status to
//   "migration-pending" then "replaced" and remove the snapshot import.

// ─── Types ────────────────────────────────────────────────────────────────────

export type SnapshotStatus =
  | "active"              // intentional — planning or accrual data, no real alternative yet
  | "migration-pending"   // real data available, page not yet migrated
  | "replaced"            // replaced by real pipeline — safe to delete when confirmed
  | "blocked";            // blocked from new usage — legacy only, read-only

export interface SnapshotSource {
  /** lib/ or app/ path relative to repo root */
  file: string;
  /** Human description of what data this file contains */
  scope: string;
  /** Migration status */
  status: SnapshotStatus;
  /** Period the snapshot data represents */
  period: string;
  /** Pages/modules that currently import this file */
  consumers: string[];
  /** Which canonical source would replace this */
  migratesTo?: string;
  /** Why migration is blocked (if status === "migration-pending" or "blocked") */
  migrationBlocker?: string;
  /** Additional notes */
  notes: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SNAPSHOT_REGISTRY: SnapshotSource[] = [
  {
    file:     "lib/awq-group-data.ts (accessed via lib/awq-derived-metrics.ts)",
    scope:    "AWQ Group consolidated P&L, BU metrics (revenue, EBITDA, margins, ROIC, capital), " +
              "risk signals, revenue forecasts (base/bull/bear), allocation flags, " +
              "budget targets (buBudgetTargets), expense category budgets (categoryBudget), " +
              "forecast accuracy history (forecastAccuracyHistory), BU forecast scenarios (buForecastScenarios)",
    status:   "active",
    period:   "YTD Jan–Mar 2026 (Q1 2026 — frozen snapshot)",
    consumers: [
      // NOTE: pages import from awq-derived-metrics, NOT awq-group-data directly.
      // awq-derived-metrics is the canonical derivation layer (P2 — implemented).
      "lib/awq-derived-metrics.ts (canonical derivation layer — all pages route through here)",
    ],
    migratesTo: "lib/financial-query.ts (cash-basis) for FCO/caixa; " +
                "accrual P&L pipeline (not yet built) for revenue/EBITDA/margins",
    migrationBlocker:
      "Accrual P&L (revenue, EBITDA, net income) cannot be derived from banking statements alone. " +
      "Requires invoice/NF ingestion pipeline. Cash-basis pages already migrated. " +
      "Hybrid approach (REAL cash + SNAPSHOT accrual) is intentional until invoice pipeline is built.",
    notes:
      "DERIVATION LAYER ACTIVE: pages no longer import awq-group-data directly. " +
      "All planning data flows through lib/awq-derived-metrics.ts. " +
      "BUDGET_LINES derived from buData (no drift). PAYBACK_ESTIMATES derived from buData. " +
      "Do NOT add new hardcoded revenue/expense/EBITDA values to awq-group-data. " +
      "All pages show explicit SNAPSHOT banners in UI.",
  },
  {
    file:     "lib/data.ts",
    scope:    "JACQES BU snapshot — KPIs, monthly revenue trend (FY 2025), " +
              "client segments, top services, regional breakdown, channel data, alerts",
    status:   "active",
    period:   "FY 2025 trend + Q1 2026 snapshot",
    consumers: [
      "app/jacqes/page.tsx",
    ],
    migratesTo:
      "lib/financial-query.ts filtered by entity=JACQES (cash-basis); " +
      "future: accrual pipeline for revenue/EBITDA trend",
    migrationBlocker:
      "JACQES Cora account statements not yet ingested. " +
      "Once /awq/ingest receives JACQES Cora PDFs and pipeline reaches status=done, " +
      "financial-query will return entity=JACQES data. Then migrate /jacqes/page.tsx.",
    notes:
      "The CustomerRecord interface and customers[] export were already removed (dead code). " +
      "KPI values align with awq-group-data.ts buData[jacqes] — keep in sync during snapshot phase.",
  },
  {
    file:     "lib/caza-data.ts",
    scope:    "Caza Vision projects, clients, KPI scorecard, revenue by project type",
    status:   "active",
    period:   "Q1 2026 snapshot",
    consumers: [
      "app/caza/page.tsx",
      "app/caza/customers/page.tsx",
      "app/caza/portfolio/page.tsx",
    ],
    migratesTo:
      "lib/financial-query.ts filtered by entity=Caza_Vision (cash-basis); " +
      "project management store (not built) for project-level data",
    migrationBlocker:
      "Caza Vision Itaú account statements not yet ingested. " +
      "Project-level data (milestones, project health) has no real alternative — " +
      "would require a separate project management module.",
    notes:
      "Financial KPIs in caza-data.ts align with awq-group-data.ts buData[caza]. " +
      "Keep in sync during snapshot phase.",
  },
  {
    file:     "app/awq-venture/page.tsx (PoCPage)",
    scope:    "Venture commercial pipeline overview — receitaAnual2026 monthly actuals (Jan–Mar 2026), " +
              "Vesting progress (Ano 1 actual=R$42,506.99 vs meta=R$120k), " +
              "LTV:CAC gauge (hardcoded 38.3x — estimate, origin unverified), " +
              "canais fallback array (Notion /api/notion?database=venture-sales is primary source)",
    status:   "active",
    period:   "Q1 2026 actuals for chart/vesting; LTV:CAC estimate unverified",
    consumers: [
      "app/awq-venture/page.tsx",
    ],
    migratesTo:
      "lib/notion-fetch.ts fetchVentureSales() (already primary source for byCategoria, byCanal, totalLeads). " +
      "receitaAnual2026 array to be replaced by live Notion monthly aggregation when available. " +
      "LTV:CAC to be derived from real client/revenue data once 2026 cohort matures.",
    migrationBlocker:
      "Notion venture-sales database provides byCanal/byCategoria/totalLeads live. " +
      "Monthly breakdown (receitaAnual2026) and LTV:CAC require additional Notion properties or separate calculation. " +
      "LTV:CAC 38.3x origin is unverified — needs derivation from confirmed client LTV and CAC spend.",
    notes:
      "CORRECTED 2026-04-15: removed || 433687.08 magic fallback from faturamento computation. " +
      "LTV:CAC label changed from 'Tempo real' to 'Snapshot · est.' to reflect actual status. " +
      "Canal count, leads, and valor total now computed from live canais data (not hardcoded). " +
      "canais fallback values (Não informado/Indicação/Cliente Ativo/Site ADS) mirror venture-sales.json byCanal.",
  },
  {
    file:     "app/awq-venture/yoy-2025/page.tsx (YoY2025Page)",
    scope:    "Full-year 2025 historical KPIs — CAC=R$506,33, LTV=R$5.489,71, LTV:CAC=10.8x, " +
              "Clientes=79, Receita total=R$433.687,08. " +
              "Quarterly 2025 breakdowns (Q1=R$9,440.56, Q2=R$3,152, Q3=R$14,963.23, Q4=R$16,851.74). " +
              "Monthly sub-breakdowns per quarter.",
    status:   "active",
    period:   "Full year 2025 (historical, manually reconciled Apr 2026)",
    consumers: [
      "app/awq-venture/yoy-2025/page.tsx",
    ],
    migratesTo:
      "Notion 2025-archive database (not yet created). " +
      "Bar chart data (receitaBarData/catBarData) already has live override via fetchVentureSales() for 2026.",
    migrationBlocker:
      "2025 historical data lives only in Kommo CRM + internal spreadsheets. " +
      "No Notion 2025-archive database exists. Manual re-ingestion required to replace hardcodes.",
    notes:
      "Source: Kommo CRM + internal reconciliation (manual extraction, Apr 2026). " +
      "Receita total R$433.687,08 = confirmed 2025 gross revenue across all categories. " +
      "CAC computed as R$40.000 ÷ 79 clients. LTV = R$433.687,08 ÷ 79 clients. " +
      "2026 bar chart already overridden by fetchVentureSales() live data. " +
      "All 2025 KPI cards and quarterly cards are hardcoded — no live override.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface SnapshotMigrationStatus {
  totalSources:    number;
  activeSources:   number;
  pendingSources:  number;
  replacedSources: number;
  blockedSources:  number;
  /** Total unique consumer pages across all sources */
  totalConsumers:  number;
  /** Unique consumer pages */
  allConsumers:    string[];
}

export function getSnapshotMigrationStatus(): SnapshotMigrationStatus {
  const allConsumers = Array.from(
    new Set(SNAPSHOT_REGISTRY.flatMap((s) => s.consumers))
  ).sort();

  return {
    totalSources:    SNAPSHOT_REGISTRY.length,
    activeSources:   SNAPSHOT_REGISTRY.filter((s) => s.status === "active").length,
    pendingSources:  SNAPSHOT_REGISTRY.filter((s) => s.status === "migration-pending").length,
    replacedSources: SNAPSHOT_REGISTRY.filter((s) => s.status === "replaced").length,
    blockedSources:  SNAPSHOT_REGISTRY.filter((s) => s.status === "blocked").length,
    totalConsumers:  allConsumers.length,
    allConsumers,
  };
}
