// ─── Source Metadata Registry ──────────────────────────────────────────────────
// Central catalog of every data source in the AWQ platform.
// Each entry describes where data lives, how reliable it is,
// and which BU owns it. This is the single source of truth
// for data governance and audit.

import type { SourceMeta } from "../types/source-meta";

/** All registered data sources in the platform */
export const SOURCE_CATALOG: Record<string, SourceMeta> = {
  // ─── JACQES ──────────────────────────────────────────────────────────────────
  "jacqes:kpis": {
    sourceId: "jacqes:kpis",
    description: "JACQES KPIs — Receita, Contas, Orders, Margem",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
    notes: "Hardcoded mock data. Replace with Notion or API when available.",
  },
  "jacqes:revenue-trend": {
    sourceId: "jacqes:revenue-trend",
    description: "JACQES monthly revenue, expenses, profit (Jan-Dec)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:customer-segments": {
    sourceId: "jacqes:customer-segments",
    description: "JACQES customer segment distribution",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:top-products": {
    sourceId: "jacqes:top-products",
    description: "JACQES top products with revenue and growth",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:customers": {
    sourceId: "jacqes:customers",
    description: "JACQES customer records (8 entries)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:regions": {
    sourceId: "jacqes:regions",
    description: "JACQES regional performance data",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:channels": {
    sourceId: "jacqes:channels",
    description: "JACQES acquisition channel data",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:alerts": {
    sourceId: "jacqes:alerts",
    description: "JACQES alert/notification records",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "lib/data.ts",
    lastUpdated: "2026-03-18",
  },
  "jacqes:kpis-json": {
    sourceId: "jacqes:kpis-json",
    description: "JACQES KPI snapshot (static JSON for GitHub Pages)",
    origin: "static-json",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "jacqes",
    filePath: "public/data/jacqes-kpis.json",
    lastUpdated: "2026-03-18",
    notes: "Static export of KPI data for GitHub Pages deployment.",
  },

  // ─── CAZA VISION ─────────────────────────────────────────────────────────────
  "caza:kpis": {
    sourceId: "caza:kpis",
    description: "Caza Vision KPIs — Projetos, Receita, Entregues, Ticket",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "caza-vision",
    filePath: "lib/caza-data.ts",
    lastUpdated: "2026-03-26",
  },
  "caza:revenue-trend": {
    sourceId: "caza:revenue-trend",
    description: "Caza Vision monthly revenue trend (Jan/25 - Mar/26)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "caza-vision",
    filePath: "lib/caza-data.ts",
    lastUpdated: "2026-03-26",
  },
  "caza:project-type-revenue": {
    sourceId: "caza:project-type-revenue",
    description: "Revenue breakdown by project type",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "caza-vision",
    filePath: "lib/caza-data.ts",
    lastUpdated: "2026-03-26",
  },
  "caza:projetos": {
    sourceId: "caza:projetos",
    description: "Caza Vision project pipeline (8 projects)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "caza-vision",
    filePath: "lib/caza-data.ts",
    lastUpdated: "2026-03-26",
    notes: "Can be replaced by Notion 'properties' database via notion-fetch.ts",
  },
  "caza:clients": {
    sourceId: "caza:clients",
    description: "Caza Vision client records (9 entries)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "caza-vision",
    filePath: "lib/caza-data.ts",
    lastUpdated: "2026-03-26",
    notes: "Can be replaced by Notion 'clients' database via notion-fetch.ts",
  },
  "caza:alerts": {
    sourceId: "caza:alerts",
    description: "Caza Vision alert/notification records",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "caza-vision",
    filePath: "lib/caza-data.ts",
    lastUpdated: "2026-03-26",
  },

  // ─── AWQ GROUP (HOLDING) ─────────────────────────────────────────────────────
  "awq:bu-data": {
    sourceId: "awq:bu-data",
    description: "AWQ Group BU portfolio data (4 BUs with P&L, cash, operations)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
    notes: "Consolidated holding view. Each BU entry is a mock snapshot.",
  },
  "awq:consolidated": {
    sourceId: "awq:consolidated",
    description: "Consolidated operating P&L (derived from BU data)",
    origin: "derived",
    reliability: "mock",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
    notes: "Computed from buData array. Reliability inherits from source BU data.",
  },
  "awq:monthly-revenue": {
    sourceId: "awq:monthly-revenue",
    description: "Monthly consolidated revenue per BU (Jan-Mar 2026)",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
  },
  "awq:risk-signals": {
    sourceId: "awq:risk-signals",
    description: "Cross-BU risk signals and thresholds",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
  },
  "awq:alloc-flags": {
    sourceId: "awq:alloc-flags",
    description: "Capital allocation flags per BU",
    origin: "mock",
    reliability: "estimated",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
  },
  "awq:forecasts": {
    sourceId: "awq:forecasts",
    description: "Revenue forecasts (base/bull/bear scenarios)",
    origin: "mock",
    reliability: "estimated",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
  },
  "awq:cashflow": {
    sourceId: "awq:cashflow",
    description: "Cash flow statement rows per BU",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/awq-group-data.ts",
    lastUpdated: "2026-03-18",
  },

  // ─── AWQ VENTURE ─────────────────────────────────────────────────────────────
  "venture:sales": {
    sourceId: "venture:sales",
    description: "AWQ Venture / Grupo Enerdy sales data",
    origin: "static-json",
    reliability: "provisional",
    lifecycle: "active",
    buOwner: "awq-venture",
    filePath: "public/data/venture-sales.json",
    lastUpdated: "2026-03-18",
    notes: "Fetched via notion-fetch.ts. Falls back to mock if unavailable.",
  },
  "venture:sales-mock": {
    sourceId: "venture:sales-mock",
    description: "Fallback mock for Venture sales when Notion/static unavailable",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: "awq-venture",
    filePath: "lib/notion-fetch.ts",
    lastUpdated: "2026-03-18",
  },

  // ─── AUTH & SYSTEM ───────────────────────────────────────────────────────────
  "system:auth-users": {
    sourceId: "system:auth-users",
    description: "Platform user accounts and roles",
    origin: "mock",
    reliability: "mock",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/auth-users.ts",
    lastUpdated: "2026-03-18",
    notes: "Hardcoded users with bcrypt hashes. Replace with DB when scaling.",
  },
  "system:agents-config": {
    sourceId: "system:agents-config",
    description: "AI agent configurations for each BU",
    origin: "mock",
    reliability: "verified",
    lifecycle: "active",
    buOwner: null,
    filePath: "lib/agents-config.ts",
    lastUpdated: "2026-03-18",
    notes: "Agent prompts and tool configs. Verified as intentional configuration.",
  },
};

/** Get metadata for a specific source */
export function getSourceMeta(sourceId: string): SourceMeta | undefined {
  return SOURCE_CATALOG[sourceId];
}

/** Get all sources owned by a specific BU */
export function getSourcesByBu(buOwner: string | null): SourceMeta[] {
  return Object.values(SOURCE_CATALOG).filter((s) => s.buOwner === buOwner);
}

/** Get all sources with a specific origin type */
export function getSourcesByOrigin(origin: SourceMeta["origin"]): SourceMeta[] {
  return Object.values(SOURCE_CATALOG).filter((s) => s.origin === origin);
}

/** Get all mock sources (for audit/migration planning) */
export function getMockSources(): SourceMeta[] {
  return Object.values(SOURCE_CATALOG).filter(
    (s) => s.origin === "mock" || s.reliability === "mock"
  );
}
