// ─── JACQES — BU Data Module ───────────────────────────────────────────────────
// Wraps lib/data.ts with source metadata.
// Does NOT duplicate data — imports and re-exports from the original file.

import {
  kpis,
  revenueData,
  customerSegments,
  topProducts,
  customers,
  regionData,
  channelData,
  alerts,
} from "@/lib/data";

import type {
  KPI,
  RevenueDataPoint,
  CustomerSegment,
  TopProduct,
  CustomerRecord,
  RegionData,
  ChannelData,
  Alert,
} from "@/lib/data";

import { createEnvelope } from "../types/source-meta";
import { SOURCE_CATALOG } from "../meta";

// ─── Raw re-exports (for backward-compatible access) ──────────────────────────
export {
  kpis,
  revenueData,
  customerSegments,
  topProducts,
  customers,
  regionData,
  channelData,
  alerts,
};

// ─── Type re-exports ──────────────────────────────────────────────────────────
export type {
  KPI,
  RevenueDataPoint,
  CustomerSegment,
  TopProduct,
  CustomerRecord,
  RegionData,
  ChannelData,
  Alert,
};

// ─── Governed data access (with metadata envelopes) ───────────────────────────

export function getJacqesKpis() {
  return createEnvelope<KPI[]>(kpis, SOURCE_CATALOG["jacqes:kpis"]);
}

export function getJacqesRevenueTrend() {
  return createEnvelope<RevenueDataPoint[]>(revenueData, SOURCE_CATALOG["jacqes:revenue-trend"]);
}

export function getJacqesCustomerSegments() {
  return createEnvelope<CustomerSegment[]>(customerSegments, SOURCE_CATALOG["jacqes:customer-segments"]);
}

export function getJacqesTopProducts() {
  return createEnvelope<TopProduct[]>(topProducts, SOURCE_CATALOG["jacqes:top-products"]);
}

export function getJacqesCustomers() {
  return createEnvelope<CustomerRecord[]>(customers, SOURCE_CATALOG["jacqes:customers"]);
}

export function getJacqesRegions() {
  return createEnvelope<RegionData[]>(regionData, SOURCE_CATALOG["jacqes:regions"]);
}

export function getJacqesChannels() {
  return createEnvelope<ChannelData[]>(channelData, SOURCE_CATALOG["jacqes:channels"]);
}

export function getJacqesAlerts() {
  return createEnvelope<Alert[]>(alerts, SOURCE_CATALOG["jacqes:alerts"]);
}

// ─── BU-level summary ─────────────────────────────────────────────────────────

export const JACQES_BU_ID = "jacqes" as const;

export function getJacqesSummary() {
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfit = revenueData.reduce((sum, d) => sum + d.profit, 0);
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const atRiskCustomers = customers.filter((c) => c.status === "at-risk").length;

  return {
    buId: JACQES_BU_ID,
    totalRevenue,
    totalProfit,
    margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    activeCustomers,
    atRiskCustomers,
    totalProducts: topProducts.length,
    activeAlerts: alerts.length,
  };
}
