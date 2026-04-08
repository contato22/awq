// ─── JACQES BU — Snapshot Data · Q1 2026 ─────────────────────────────────────
//
// CLASSIFICAÇÃO: snapshot — valores alinhados com awq-group-data.ts (Q1 2026).
// Não é feed ao vivo do Notion. Quando o Notion for conectado, substituir.
//
// REGRA: Nenhum dado granular inventado aqui. Apenas valores deriváveis
// diretamente de buData["jacqes"] ou monthlyRevenue.
//
// KPIs.revenue   → buData[jacqes].revenue         = 4_820_000
// KPIs.customers → buData[jacqes].customers        = 10
// KPIs.margin    → grossProfit/revenue             = 2_892_000/4_820_000 = 60.0%
// revenueData    → monthlyRevenue[jacqes] Q1/26    = empirical (awq-group-data)
//
// Arrays ESVAZIADOS (dados eram invenções sem respaldo):
//   topProducts      → sem breakdown real de serviços por categoria
//   regionData       → sem breakdown real por região
//   channelData      → sem breakdown real por canal de aquisição
//   customerSegments → sem segmentação validada
//   alerts           → sem alertas de clientes reais (clientes eram fictícios)

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

// ─── KPIs — aligned with awq-group-data Q1 2026 ──────────────────────────────

export const kpis: KPI[] = [
  {
    id: "revenue",
    label: "Receita Bruta",
    value:         4_820_000,   // YTD Q1 2026 — source: buData[jacqes].revenue
    previousValue: 4_440_000,   // YTD budget — source: buData[jacqes].budgetRevenue
    unit: "currency",
    icon: "DollarSign",
    color: "brand",
  },
  {
    id: "customers",
    label: "Contas Ativas",
    value:         10,           // source: buData[jacqes].customers
    previousValue:  9,
    unit: "number",
    icon: "Users",
    color: "emerald",
  },
  {
    id: "nps",
    label: "NPS Médio",
    value:         0,            // sem dados reais de NPS — aguardando ingestion
    previousValue: 0,
    unit: "percent",
    suffix: "",
    icon: "TrendingUp",
    color: "blue",
  },
  {
    id: "margin",
    label: "Margem Bruta",
    value:         60.0,         // grossProfit/revenue = 2_892_000/4_820_000 — buData
    previousValue: 57.2,
    unit: "percent",
    suffix: "%",
    icon: "TrendingUp",
    color: "purple",
  },
];

// ─── Revenue Data — Q1 2026 real (monthlyRevenue[jacqes]) ────────────────────
// SOURCE: awq-group-data.ts monthlyRevenue
// Expense ratio ~40% consistent with gross margin 60% (buData)

export const revenueData: RevenueDataPoint[] = [
  { month: "Jan/26", revenue: 1_420_000, expenses:   568_000, profit:   852_000 },
  { month: "Fev/26", revenue: 1_512_000, expenses:   604_800, profit:   907_200 },
  { month: "Mar/26", revenue: 1_888_000, expenses:   755_200, profit: 1_132_800 },
];

// ─── Arrays esvaziados — dados granulares sem fonte empírica ─────────────────

export const customerSegments: CustomerSegment[] = [];

export const topProducts: TopProduct[] = [];

export const regionData: RegionData[] = [];

export const channelData: ChannelData[] = [];

export const alerts: Alert[] = [];
