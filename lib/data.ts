// ─── JACQES BU — Snapshot Data · derivado de awq-group-data.ts ────────────────
//
// CLASSIFICAÇÃO: snapshot — valores IMPORTADOS de awq-group-data.ts.
// Não é feed ao vivo do Notion. Quando o Notion for conectado, substituir.
//
// REGRA: nenhum número hardcoded aqui. Todos os valores derivam de:
//   JACQES_MRR     → MRR atual (Abr+, com Tati)
//   buData[jacqes] → customers, revenue YTD
//   monthlyRevenue → revenueData por mês
//
// Arrays ESVAZIADOS (dados eram invenções sem respaldo):
//   topProducts      → sem breakdown real de serviços por categoria
//   regionData       → sem breakdown real por região
//   channelData      → sem breakdown real por canal de aquisição
//   customerSegments → sem segmentação validada
//   alerts           → sem alertas de clientes reais (clientes eram fictícios)

import { JACQES_MRR, buData, monthlyRevenue } from "@/lib/awq-derived-metrics";

const _jacqes = buData.find((b) => b.id === "jacqes")!;

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

// ─── KPIs — derivados de buData["jacqes"] e JACQES_MRR ──────────────────────
// SOURCE: awq-group-data.ts
export const kpis: KPI[] = [
  {
    id: "revenue",
    label: "MRR Atual",
    value:         JACQES_MRR,          // Abr+: 4 clientes (com Tati)
    previousValue: 0,
    unit: "currency",
    icon: "DollarSign",
    color: "brand",
  },
  {
    id: "customers",
    label: "Contas Ativas",
    value:         _jacqes.customers,   // buData["jacqes"].customers
    previousValue: 0,
    unit: "number",
    icon: "Users",
    color: "emerald",
  },
  {
    id: "nps",
    label: "NPS Médio",
    value:         0,
    previousValue: 0,
    unit: "percent",
    suffix: "",
    icon: "TrendingUp",
    color: "blue",
  },
  {
    id: "margin",
    label: "Margem Bruta",
    value:         0,                   // aguardando confirmação contábil
    previousValue: 0,
    unit: "percent",
    suffix: "%",
    icon: "TrendingUp",
    color: "purple",
  },
];

// ─── Revenue Data — derivado de monthlyRevenue[jacqes] ───────────────────────
// SOURCE: awq-group-data.ts monthlyRevenue
// Expenses/profit = 0 — dados de custo ainda não confirmados
export const revenueData: RevenueDataPoint[] = monthlyRevenue.map((m) => ({
  month:    m.month,
  revenue:  m.jacqes,
  expenses: 0,
  profit:   0,
}));

// ─── Arrays esvaziados — dados granulares sem fonte empírica ─────────────────

export const customerSegments: CustomerSegment[] = [];

export const topProducts: TopProduct[] = [];

export const regionData: RegionData[] = [];

export const channelData: ChannelData[] = [];

export const alerts: Alert[] = [];
