// ─── BU & Module Registry ──────────────────────────────────────────────────────
// Central registry of all Business Units and their modules.
// This is the single source of truth for BU identity, status,
// and available data modules.

import type { BuId } from "../types/common";

/** BU status in the AWQ holding structure */
export type BuStatus =
  | "active"        // Fully operational
  | "structuring"   // Being set up (e.g., AWQ Venture)
  | "planned"       // Exists in roadmap only
  | "inactive";     // Paused or deactivated

/** Describes a Business Unit in the AWQ holding */
export interface BuRegistryEntry {
  id: BuId;
  name: string;
  legalName: string;
  segment: string;
  status: BuStatus;
  /** Route prefix in the app */
  routePrefix: string;
  /** Color theme (Tailwind classes) */
  color: string;
  accentColor: string;
  /** Data modules available for this BU */
  dataModules: string[];
  /** Whether this BU has its own dedicated data file */
  hasOwnDataFile: boolean;
  /** Whether this BU is an operating BU (generates revenue) */
  isOperating: boolean;
  /** Notes for maintainers */
  notes?: string;
}

/** Complete BU registry */
export const BU_REGISTRY: Record<BuId, BuRegistryEntry> = {
  awq: {
    id: "awq",
    name: "AWQ Group",
    legalName: "AWQ Group Holdings",
    segment: "Holding / Control Tower",
    status: "active",
    routePrefix: "/awq",
    color: "bg-brand-600",
    accentColor: "text-brand-400",
    dataModules: [
      "bu-data", "consolidated", "monthly-revenue", "risk-signals",
      "alloc-flags", "forecasts", "cashflow",
    ],
    hasOwnDataFile: true,
    isOperating: false,
    notes: "Parent holding. Consolidates all BU data. Does not generate revenue directly.",
  },
  jacqes: {
    id: "jacqes",
    name: "JACQES",
    legalName: "JACQES Agência",
    segment: "SaaS & Agency",
    status: "active",
    routePrefix: "/jacqes",
    color: "bg-brand-600",
    accentColor: "text-brand-400",
    dataModules: [
      "kpis", "revenue-trend", "customer-segments", "top-products",
      "customers", "regions", "channels", "alerts",
    ],
    hasOwnDataFile: true,
    isOperating: true,
  },
  "caza-vision": {
    id: "caza-vision",
    name: "Caza Vision",
    legalName: "Caza Vision Produtora",
    segment: "Content Production",
    status: "active",
    routePrefix: "/caza-vision",
    color: "bg-emerald-600",
    accentColor: "text-emerald-400",
    dataModules: [
      "kpis", "revenue-trend", "project-type-revenue", "projetos",
      "clients", "alerts",
    ],
    hasOwnDataFile: true,
    isOperating: true,
  },
  advisor: {
    id: "advisor",
    name: "Advisor",
    legalName: "AWQ Advisor Consultoria",
    segment: "Financial Consulting",
    status: "active",
    routePrefix: "/advisor",
    color: "bg-violet-600",
    accentColor: "text-violet-400",
    dataModules: ["bu-summary"],
    hasOwnDataFile: false,
    isOperating: true,
    notes: "Data currently embedded in awq-group-data.ts BuData entry. Needs own data file.",
  },
  "awq-venture": {
    id: "awq-venture",
    name: "AWQ Venture",
    legalName: "AWQ Venture Capital",
    segment: "Venture Capital / Investments",
    status: "structuring",
    routePrefix: "/awq-venture",
    color: "bg-amber-600",
    accentColor: "text-amber-400",
    dataModules: ["bu-summary", "sales"],
    hasOwnDataFile: false,
    isOperating: false,
    notes: "Investment vehicle. Sales data via venture-sales.json. Fund structuring in progress.",
  },
  enerdy: {
    id: "enerdy",
    name: "Grupo Enerdy",
    legalName: "Grupo Enerdy",
    segment: "Energy (O&M, Insurance, Integration)",
    status: "planned",
    routePrefix: "/awq-venture/grupo-energdy",
    color: "bg-yellow-600",
    accentColor: "text-yellow-400",
    dataModules: ["sales"],
    hasOwnDataFile: false,
    isOperating: false,
    notes: "Currently under AWQ Venture umbrella. Sales data in venture-sales.json. Page shows 'Coming Soon'.",
  },
};

/** Get all active BUs */
export function getActiveBus(): BuRegistryEntry[] {
  return Object.values(BU_REGISTRY).filter((bu) => bu.status === "active");
}

/** Get all operating BUs (revenue-generating) */
export function getOperatingBus(): BuRegistryEntry[] {
  return Object.values(BU_REGISTRY).filter((bu) => bu.isOperating);
}

/** Get BU by route prefix */
export function getBuByRoute(pathname: string): BuRegistryEntry | undefined {
  return Object.values(BU_REGISTRY).find((bu) =>
    pathname === bu.routePrefix || pathname.startsWith(bu.routePrefix + "/")
  );
}

/** Get BU by ID */
export function getBuById(id: BuId): BuRegistryEntry | undefined {
  return BU_REGISTRY[id];
}

/** List all BU IDs */
export function getAllBuIds(): BuId[] {
  return Object.keys(BU_REGISTRY) as BuId[];
}
