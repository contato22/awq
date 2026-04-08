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

// SOURCE: Notion CRM — receita confirmada por mês
export const kpis: KPI[] = [
  {
    id: "revenue",
    label: "MRR Atual",
    value:         8_280,   // Abr/2026: 4 clientes (com Tati)
    previousValue: 0,
    unit: "currency",
    icon: "DollarSign",
    color: "brand",
  },
  {
    id: "customers",
    label: "Contas Ativas",
    value:         4,       // Notion CRM Abr/2026
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
    value:         0,       // aguardando confirmação contábil
    previousValue: 0,
    unit: "percent",
    suffix: "%",
    icon: "TrendingUp",
    color: "purple",
  },
];

// ─── Revenue Data — Q1 2026 real (monthlyRevenue[jacqes]) ────────────────────
// SOURCE: awq-group-data.ts monthlyRevenue
// Expense ratio ~40% consistent with gross margin 60% (buData)

// Jan/Fev/Mar: 3 clientes × R$6.490 · Abr: 4 clientes × R$8.280 (Tati entrou)
// Expenses/profit = 0 — dados de custo ainda não confirmados
export const revenueData: RevenueDataPoint[] = [
  { month: "Jan/26", revenue: 6_490, expenses: 0, profit: 0 },
  { month: "Fev/26", revenue: 6_490, expenses: 0, profit: 0 },
  { month: "Mar/26", revenue: 6_490, expenses: 0, profit: 0 },
  { month: "Abr/26", revenue: 8_280, expenses: 0, profit: 0 },
];

// ─── Arrays esvaziados — dados granulares sem fonte empírica ─────────────────

export const customerSegments: CustomerSegment[] = [];

export const topProducts: TopProduct[] = [];

export const regionData: RegionData[] = [];

export const channelData: ChannelData[] = [];

export const alerts: Alert[] = [];
