// ─── Types ────────────────────────────────────────────────────────────────────

export interface KPI {
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

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CustomerSegment {
  name: string;
  value: number;
  color: string;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  revenue: number;
  units: number;
  growth: number;
  status: "trending" | "stable" | "declining";
}

export interface CustomerRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  segment: "Enterprise" | "SMB" | "Startup";
  ltv: number;
  lastOrder: string;
  status: "active" | "at-risk" | "churned";
  country: string;
}

export interface RegionData {
  region: string;
  revenue: number;
  customers: number;
  growth: number;
}

export interface ChannelData {
  channel: string;
  sessions: number;
  conversions: number;
  revenue: number;
  cac: number;
}

export interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const kpis: KPI[] = [];

// ─── Revenue Trend ────────────────────────────────────────────────────────────

export const revenueData: RevenueDataPoint[] = [];

// ─── Customer Segments ────────────────────────────────────────────────────────

export const customerSegments: CustomerSegment[] = [];

// ─── Top Products ─────────────────────────────────────────────────────────────

export const topProducts: TopProduct[] = [];

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers: CustomerRecord[] = [];

// ─── Regional Performance ─────────────────────────────────────────────────────

export const regionData: RegionData[] = [];

// ─── Acquisition Channels ─────────────────────────────────────────────────────

export const channelData: ChannelData[] = [];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts: Alert[] = [];
