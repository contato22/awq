// ─── Mock Registry ─────────────────────────────────────────────────────────────
// Centralized identification of ALL mock data in the platform.
// Every mock is explicitly tracked here so that:
//   1. No mock is ever confused with real data
//   2. Migration to real data sources is traceable
//   3. Audit can quickly identify what is mock vs real
//
// IMPORTANT: This file does NOT contain mock data itself.
// Mock data remains in its original lib/ files.
// This file only provides identification, status, and migration plan.

import type { BuId } from "../types/common";
import { SOURCE_CATALOG } from "../meta";

export type MockStatus =
  | "active"           // Mock is currently serving the UI
  | "partial-replace"  // Some real data exists, mock fills gaps
  | "ready-to-replace" // Real data source exists, just need to switch
  | "no-replacement";  // No real data source planned yet

export interface MockEntry {
  /** Matches a sourceId from SOURCE_CATALOG */
  sourceId: string;
  /** Which BU this mock serves */
  buId: BuId | "awq" | "system";
  /** Current status of this mock */
  status: MockStatus;
  /** What should replace this mock */
  replacementTarget: string;
  /** Priority for replacement */
  replacementPriority: "high" | "medium" | "low";
  /** Notes */
  notes?: string;
}

/** All identified mocks in the platform */
export const MOCK_REGISTRY: MockEntry[] = [
  // ─── JACQES mocks ────────────────────────────────────────────────────────────
  {
    sourceId: "jacqes:kpis",
    buId: "jacqes",
    status: "active",
    replacementTarget: "Notion database or internal API",
    replacementPriority: "high",
    notes: "Core KPIs displayed on main JACQES dashboard.",
  },
  {
    sourceId: "jacqes:revenue-trend",
    buId: "jacqes",
    status: "active",
    replacementTarget: "Financial API or Notion",
    replacementPriority: "high",
  },
  {
    sourceId: "jacqes:customer-segments",
    buId: "jacqes",
    status: "active",
    replacementTarget: "CRM or Notion",
    replacementPriority: "medium",
  },
  {
    sourceId: "jacqes:top-products",
    buId: "jacqes",
    status: "active",
    replacementTarget: "Product analytics API",
    replacementPriority: "medium",
  },
  {
    sourceId: "jacqes:customers",
    buId: "jacqes",
    status: "active",
    replacementTarget: "CRM database or Notion",
    replacementPriority: "high",
  },
  {
    sourceId: "jacqes:regions",
    buId: "jacqes",
    status: "active",
    replacementTarget: "Analytics platform",
    replacementPriority: "low",
  },
  {
    sourceId: "jacqes:channels",
    buId: "jacqes",
    status: "active",
    replacementTarget: "Marketing analytics API",
    replacementPriority: "low",
  },
  {
    sourceId: "jacqes:alerts",
    buId: "jacqes",
    status: "active",
    replacementTarget: "Alert engine or Notion",
    replacementPriority: "medium",
  },

  // ─── Advisor mocks ───────────────────────────────────────────────────────────
  {
    sourceId: "advisor:clients",
    buId: "advisor",
    status: "active",
    replacementTarget: "CRM database or Notion",
    replacementPriority: "high",
  },
  {
    sourceId: "advisor:fee-income",
    buId: "advisor",
    status: "active",
    replacementTarget: "Financial API or ERP",
    replacementPriority: "high",
  },
  {
    sourceId: "advisor:dre",
    buId: "advisor",
    status: "active",
    replacementTarget: "Accounting system or ERP",
    replacementPriority: "medium",
  },
  {
    sourceId: "advisor:strategies",
    buId: "advisor",
    status: "active",
    replacementTarget: "Portfolio management system",
    replacementPriority: "medium",
  },
  // ─── Caza Vision mocks ──────────────────────────────────────────────────────
  {
    sourceId: "caza:kpis",
    buId: "caza-vision",
    status: "active",
    replacementTarget: "Notion database",
    replacementPriority: "high",
  },
  {
    sourceId: "caza:revenue-trend",
    buId: "caza-vision",
    status: "active",
    replacementTarget: "Financial Notion database",
    replacementPriority: "high",
  },
  {
    sourceId: "caza:project-type-revenue",
    buId: "caza-vision",
    status: "active",
    replacementTarget: "Derived from Notion projects",
    replacementPriority: "medium",
  },
  {
    sourceId: "caza:projetos",
    buId: "caza-vision",
    status: "active",
    replacementTarget: "Notion 'properties' database (notion-fetch.ts ready)",
    replacementPriority: "high",
    notes: "notion-fetch.ts already supports fetching from Notion. Switch IS_STATIC flag.",
  },
  {
    sourceId: "caza:clients",
    buId: "caza-vision",
    status: "active",
    replacementTarget: "Notion 'clients' database (notion-fetch.ts ready)",
    replacementPriority: "high",
    notes: "notion-fetch.ts already supports fetching from Notion. Switch IS_STATIC flag.",
  },
  {
    sourceId: "caza:alerts",
    buId: "caza-vision",
    status: "active",
    replacementTarget: "Alert engine or Notion",
    replacementPriority: "medium",
  },

  // ─── AWQ Group mocks ────────────────────────────────────────────────────────
  {
    sourceId: "awq:bu-data",
    buId: "awq",
    status: "active",
    replacementTarget: "Aggregated from real BU data sources",
    replacementPriority: "high",
    notes: "Should derive from actual BU data once BUs have real sources.",
  },
  {
    sourceId: "awq:monthly-revenue",
    buId: "awq",
    status: "active",
    replacementTarget: "Aggregated from BU monthly actuals",
    replacementPriority: "high",
  },
  {
    sourceId: "awq:risk-signals",
    buId: "awq",
    status: "active",
    replacementTarget: "Risk engine or rule-based alerts",
    replacementPriority: "medium",
  },
  {
    sourceId: "awq:forecasts",
    buId: "awq",
    status: "active",
    replacementTarget: "Forecasting model or manual entry",
    replacementPriority: "low",
  },
  {
    sourceId: "awq:cashflow",
    buId: "awq",
    status: "active",
    replacementTarget: "Financial reporting system",
    replacementPriority: "medium",
  },

  // ─── Venture mocks ──────────────────────────────────────────────────────────
  {
    sourceId: "venture:sales-mock",
    buId: "awq-venture",
    status: "active",
    replacementTarget: "Notion 'venture-sales' database (notion-fetch.ts ready)",
    replacementPriority: "medium",
    notes: "Fallback mock in notion-fetch.ts. Activates when Notion is unreachable.",
  },

  // ─── System mocks ──────────────────────────────────────────────────────────
  {
    sourceId: "system:auth-users",
    buId: "system",
    status: "active",
    replacementTarget: "Database (PostgreSQL, Supabase, etc.)",
    replacementPriority: "high",
    notes: "Hardcoded users with bcrypt hashes. Critical for production.",
  },
];

/** Get all mocks for a specific BU */
export function getMocksByBu(buId: string): MockEntry[] {
  return MOCK_REGISTRY.filter((m) => m.buId === buId);
}

/** Get all high-priority mocks that need replacement */
export function getHighPriorityMocks(): MockEntry[] {
  return MOCK_REGISTRY.filter((m) => m.replacementPriority === "high");
}

/** Check if a specific data source is mock */
export function isMock(sourceId: string): boolean {
  const meta = SOURCE_CATALOG[sourceId];
  return meta ? meta.origin === "mock" || meta.reliability === "mock" : false;
}

/** Get mock migration summary */
export function getMockMigrationSummary() {
  return {
    total: MOCK_REGISTRY.length,
    highPriority: MOCK_REGISTRY.filter((m) => m.replacementPriority === "high").length,
    mediumPriority: MOCK_REGISTRY.filter((m) => m.replacementPriority === "medium").length,
    lowPriority: MOCK_REGISTRY.filter((m) => m.replacementPriority === "low").length,
    readyToReplace: MOCK_REGISTRY.filter((m) => m.status === "ready-to-replace").length,
    byBu: Object.fromEntries(
      [...new Set(MOCK_REGISTRY.map((m) => m.buId))].map((buId) => [
        buId,
        MOCK_REGISTRY.filter((m) => m.buId === buId).length,
      ])
    ),
  };
}
