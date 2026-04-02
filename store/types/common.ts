// ─── Common Types ──────────────────────────────────────────────────────────────
// Re-exports and extends types used across multiple BUs.
// Original types remain in lib/ files; this module provides
// unified access and shared abstractions.

// Re-export original types from lib/ so consumers can import from store/types
export type {
  KPI,
  RevenueDataPoint,
  CustomerSegment,
  TopProduct,
  CustomerRecord,
  RegionData,
  ChannelData,
  Alert,
} from "@/lib/data";

export type {
  CazaKPI,
  CazaRevenuePoint,
  Projeto,
  CazaClient,
  ProjectTypeRevenue,
  CazaAlert,
} from "@/lib/caza-data";

export type {
  BuData,
  MonthlyPoint,
  RiskSignal,
  ForecastPoint,
  CashFlowRow,
  AllocFlag,
} from "@/lib/awq-group-data";

export type {
  VentureSalesData,
  VentureSaleRow,
} from "@/lib/notion-fetch";

export type {
  Role,
  AuthUser,
} from "@/lib/auth-users";

export type {
  AgentConfig,
} from "@/lib/agents-config";

// ─── Shared abstractions ──────────────────────────────────────────────────────

/** Identifies which BU a piece of data belongs to */
export type BuId = "awq" | "jacqes" | "caza-vision" | "advisor" | "awq-venture" | "enerdy";

/** Standard alert type used across all BUs */
export type AlertSeverity = "warning" | "info" | "success" | "error";

/** Generic KPI shape that works across BUs */
export interface GenericKPI {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: "currency" | "number" | "percent";
  prefix?: string;
  suffix?: string;
  icon: string;
  color: string;
}

/** Generic alert shape that works across BUs */
export interface GenericAlert {
  id: string;
  type: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
}
