// ─── AWQ Store — Main Entry Point ──────────────────────────────────────────────
//
// This is the organized data layer for the AWQ platform.
// It provides governed, typed, metadata-enriched access to all data
// without altering any existing lib/ files, components, or pages.
//
// Architecture:
//   store/types/      — Shared type definitions and source metadata types
//   store/meta/       — Source catalog and data quality assessments
//   store/registry/   — BU and module registry
//   store/bus/        — Per-BU data modules (wrapping lib/ files)
//   store/awq/        — AWQ holding consolidated layer
//   store/mocks/      — Mock identification and migration tracking
//   store/selectors/  — Cross-BU data access selectors
//   store/adapters/   — Backward compatibility adapters
//
// Usage:
//   // Governed access (new code)
//   import { getJacqesKpis } from "@/store/bus/jacqes";
//   const envelope = getJacqesKpis();
//   // envelope.data = KPI[]
//   // envelope.meta = { origin: "mock", reliability: "mock", ... }
//
//   // Raw access (backward compatible, same as lib/ imports)
//   import { kpis } from "@/store/bus/jacqes";
//
//   // Selectors (cross-BU queries)
//   import { selectKpisByBu, selectHighRisks } from "@/store/selectors";
//
//   // Check if data is mock
//   import { isMock } from "@/store/mocks";
//   isMock("jacqes:kpis"); // true
//
// Migration path:
//   Phase 1 (CURRENT): lib/ is source of truth, store wraps with metadata
//   Phase 2 (FUTURE):  store becomes primary, lib/ becomes thin re-exports
//   Phase 3 (FINAL):   lib/ data removed, store connects to APIs/DBs
//

// ─── Re-exports ───────────────────────────────────────────────────────────────

// Types
export type {
  BuId,
  GenericKPI,
  GenericAlert,
  AlertSeverity,
} from "./types/common";

export type {
  DataOrigin,
  DataReliability,
  DataLifecycle,
  SourceMeta,
  DataEnvelope,
} from "./types/source-meta";

export type {
  ConsolidatedFinancials,
  MarginRatios,
  BudgetComparison,
  MonthlyDataPoint,
  PLRow,
} from "./types/financial";

// Metadata
export { SOURCE_CATALOG, getSourceMeta, getSourcesByBu, getMockSources } from "./meta";
export { assessAllSources, getQualitySummary } from "./meta/data-quality";

// Registry
export { BU_REGISTRY, getActiveBus, getOperatingBus, getBuByRoute, getBuById } from "./registry";

// Mocks
export { MOCK_REGISTRY, isMock, getMocksByBu, getHighPriorityMocks, getMockMigrationSummary } from "./mocks";

// Selectors
export {
  selectKpisByBu,
  selectAlertsByBu,
  selectAllAlerts,
  selectBuData,
  selectOperatingBus,
  selectConsolidatedRevenue,
  selectRisksBySeverity,
  selectRisksByBu,
  selectHighRisks,
  selectIsBuDataMock,
  selectDataCompleteness,
} from "./selectors";

// Adapters
export { unwrap, unwrapWithMockFlag, normalizeBuId, IMPORT_MIGRATION_MAP } from "./adapters";

// Envelope factory
export { createEnvelope } from "./types/source-meta";
