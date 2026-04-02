// ─── Compatibility Adapters ─────────────────────────────────────────────────────
// Adapters provide backward-compatible access to data through the store layer.
// They allow existing code to continue working while new code can use
// the governed store interface.
//
// Migration strategy:
//   Phase 1 (current): lib/ files are the source of truth, store wraps them
//   Phase 2 (future):  store becomes the source of truth, lib/ files become thin re-exports
//   Phase 3 (final):   lib/ data files removed, store connects directly to APIs/DBs

import type { DataEnvelope } from "../types/source-meta";

// ─── Adapter: unwrap envelope for legacy consumers ────────────────────────────

/**
 * Extracts raw data from a DataEnvelope.
 * Use this when integrating with existing code that expects plain data,
 * not wrapped in metadata. Allows gradual migration.
 *
 * @example
 * // Legacy code expects: KPI[]
 * // Store returns: DataEnvelope<KPI[]>
 * const kpis = unwrap(getJacqesKpis());
 */
export function unwrap<T>(envelope: DataEnvelope<T>): T {
  return envelope.data;
}

/**
 * Extracts raw data and also returns whether it's mock data.
 * Useful for components that want to show a "mock data" badge
 * without fully adopting the envelope pattern.
 */
export function unwrapWithMockFlag<T>(
  envelope: DataEnvelope<T>
): { data: T; isMock: boolean } {
  return {
    data: envelope.data,
    isMock:
      envelope.meta.origin === "mock" || envelope.meta.reliability === "mock",
  };
}

// ─── Adapter: lib/ path re-mapping ────────────────────────────────────────────

/**
 * Maps old import paths to new store paths.
 * This is for documentation/tooling only — it does not affect runtime.
 * Use this map to guide gradual migration of import statements.
 */
export const IMPORT_MIGRATION_MAP: Record<string, string> = {
  // JACQES
  "@/lib/data → kpis":             "@/store/bus/jacqes → kpis",
  "@/lib/data → revenueData":      "@/store/bus/jacqes → revenueData",
  "@/lib/data → customerSegments": "@/store/bus/jacqes → customerSegments",
  "@/lib/data → topProducts":      "@/store/bus/jacqes → topProducts",
  "@/lib/data → customers":        "@/store/bus/jacqes → customers",
  "@/lib/data → regionData":       "@/store/bus/jacqes → regionData",
  "@/lib/data → channelData":      "@/store/bus/jacqes → channelData",
  "@/lib/data → alerts":           "@/store/bus/jacqes → alerts",

  // Caza Vision
  "@/lib/caza-data → cazaKpis":           "@/store/bus/caza-vision → cazaKpis",
  "@/lib/caza-data → cazaRevenueData":    "@/store/bus/caza-vision → cazaRevenueData",
  "@/lib/caza-data → projectTypeRevenue": "@/store/bus/caza-vision → projectTypeRevenue",
  "@/lib/caza-data → projetos":           "@/store/bus/caza-vision → projetos",
  "@/lib/caza-data → cazaClients":        "@/store/bus/caza-vision → cazaClients",
  "@/lib/caza-data → cazaAlerts":         "@/store/bus/caza-vision → cazaAlerts",

  // AWQ Group
  "@/lib/awq-group-data → buData":           "@/store/awq → buData",
  "@/lib/awq-group-data → consolidated":     "@/store/awq → consolidated",
  "@/lib/awq-group-data → monthlyRevenue":   "@/store/awq → monthlyRevenue",
  "@/lib/awq-group-data → riskSignals":      "@/store/awq → riskSignals",
  "@/lib/awq-group-data → allocFlags":       "@/store/awq → allocFlags",
  "@/lib/awq-group-data → revenueForecasts": "@/store/awq → revenueForecasts",
  "@/lib/awq-group-data → cashFlowRows":     "@/store/awq → cashFlowRows",

  // Notion fetch
  "@/lib/notion-fetch → fetchVentureSales": "@/store/bus/awq-venture → getVentureSales",
  "@/lib/notion-fetch → fetchNotionData":   "@/lib/notion-fetch (no change — generic fetcher)",
};

// ─── Adapter: BU ID normalization ─────────────────────────────────────────────

/**
 * Normalizes various BU identifier formats used across the codebase
 * to the canonical BuId format used in the store.
 */
export function normalizeBuId(input: string): string {
  const map: Record<string, string> = {
    jacqes: "jacqes",
    JACQES: "jacqes",
    caza: "caza-vision",
    "caza-vision": "caza-vision",
    "Caza Vision": "caza-vision",
    advisor: "advisor",
    Advisor: "advisor",
    venture: "awq-venture",
    "awq-venture": "awq-venture",
    "AWQ Venture": "awq-venture",
    enerdy: "enerdy",
    "Grupo Enerdy": "enerdy",
    awq: "awq",
    "AWQ Group": "awq",
  };
  return map[input] ?? input;
}
