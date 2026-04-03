// ─── JACQES BU — Snapshot Data · Q1 2026 ─────────────────────────────────────
//
// CLASSIFICATION: snapshot — hardcoded data aligned with awq-group-data.ts (Q1 2026).
// Not a live Notion feed. When Notion is wired, replace these values.
// KPIs, revenue trend, client segments, services and regional breakdown
// reflect JACQES as a Brazilian B2B creative/marketing agency.
//
// SOURCE ALIGNMENT:
//   KPIs.revenue → lib/awq-group-data.ts buData[jacqes].revenue = 4_820_000
//   KPIs.customers → lib/awq-group-data.ts buData[jacqes].customers = 10
//   KPIs.margin → grossProfit/revenue = 2_892_000/4_820_000 = 60.0%

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
    value:         4_820_000,   // YTD Q1 2026 — source: awq-group-data
    previousValue: 4_440_000,   // YTD budget — source: awq-group-data budgetRevenue
    unit: "currency",
    icon: "DollarSign",
    color: "brand",
  },
  {
    id: "customers",
    label: "Contas Ativas",
    value:         10,           // source: awq-group-data customers
    previousValue:  9,
    unit: "number",
    icon: "Users",
    color: "emerald",
  },
  {
    id: "nps",
    label: "NPS Médio",
    value:         69,           // calculated from /jacqes/customers inline data (10 clients)
    previousValue: 72,
    unit: "percent",
    suffix: "",
    icon: "TrendingUp",
    color: "blue",
  },
  {
    id: "margin",
    label: "Margem Bruta",
    value:         60.0,         // grossProfit/revenue = 2_892_000/4_820_000 — awq-group-data
    previousValue: 57.2,
    unit: "percent",
    suffix: "%",
    icon: "TrendingUp",
    color: "purple",
  },
];

// ─── Revenue Trend — FY 2025 monthly · snapshot ───────────────────────────────
// Values calibrated to match Q1 2026 scale (Jan/26 = R$1.42M)
// Expense ratio ~40% consistent with awq-group-data gross margin 60%

export const revenueData: RevenueDataPoint[] = [
  { month: "Jan", revenue: 850_000,   expenses: 340_000, profit: 510_000  },
  { month: "Feb", revenue: 910_000,   expenses: 364_000, profit: 546_000  },
  { month: "Mar", revenue: 940_000,   expenses: 376_000, profit: 564_000  },
  { month: "Apr", revenue: 980_000,   expenses: 392_000, profit: 588_000  },
  { month: "May", revenue: 1_020_000, expenses: 408_000, profit: 612_000  },
  { month: "Jun", revenue: 1_060_000, expenses: 424_000, profit: 636_000  },
  { month: "Jul", revenue: 1_100_000, expenses: 440_000, profit: 660_000  },
  { month: "Aug", revenue: 1_150_000, expenses: 460_000, profit: 690_000  },
  { month: "Sep", revenue: 1_110_000, expenses: 444_000, profit: 666_000  },
  { month: "Oct", revenue: 1_200_000, expenses: 480_000, profit: 720_000  },
  { month: "Nov", revenue: 1_310_000, expenses: 524_000, profit: 786_000  },
  { month: "Dec", revenue: 1_420_000, expenses: 568_000, profit: 852_000  },
];

// ─── Client Segments ──────────────────────────────────────────────────────────

export const customerSegments: CustomerSegment[] = [
  { name: "Enterprise", value: 50, color: "#6366f1" },
  { name: "Mid Market", value: 30, color: "#22d3ee" },
  { name: "SMB",        value: 20, color: "#f59e0b" },
];

// ─── Top Services — JACQES agência · snapshot ─────────────────────────────────
// Revenue aligned to total YTD R$4.82M

export const topProducts: TopProduct[] = [
  {
    id: "S001",
    name: "Branding & Identidade",
    category: "Estratégia",
    revenue: 1_842_000,
    units: 8,
    growth: 18.4,
    status: "trending",
  },
  {
    id: "S002",
    name: "Estratégia & Planejamento",
    category: "Consultoria",
    revenue: 1_120_000,
    units: 10,
    growth: 12.7,
    status: "trending",
  },
  {
    id: "S003",
    name: "Mídia Paga",
    category: "Performance",
    revenue: 756_000,
    units: 7,
    growth: 9.2,
    status: "stable",
  },
  {
    id: "S004",
    name: "Conteúdo & Social",
    category: "Produção",
    revenue: 580_000,
    units: 6,
    growth: -2.1,
    status: "declining",
  },
  {
    id: "S005",
    name: "Projetos Especiais",
    category: "Ativação",
    revenue: 522_000,
    units: 4,
    growth: 6.8,
    status: "stable",
  },
];

// ─── Regional Performance — distribuição geográfica Brasil ────────────────────

export const regionData: RegionData[] = [
  { region: "SP Capital",    revenue: 3_615_000, customers: 7, growth: 14.2 },
  { region: "Interior SP",   revenue:   482_000, customers: 1, growth: 11.8 },
  { region: "Rio de Janeiro",revenue:   482_000, customers: 1, growth: 22.5 },
  { region: "Sul do Brasil", revenue:   241_000, customers: 1, growth: 8.4  },
];

// ─── Acquisition Channels ─────────────────────────────────────────────────────

export const channelData: ChannelData[] = [
  { channel: "Indicação / Referral",  sessions: 480,  conversions: 8,  revenue: 1_420_000, cac:   0 },
  { channel: "Prospecção Ativa",      sessions: 220,  conversions: 6,  revenue:   890_000, cac: 180 },
  { channel: "Inbound / Site",        sessions: 180,  conversions: 5,  revenue:   760_000, cac:   0 },
  { channel: "Parceiros / Canais",    sessions: 120,  conversions: 4,  revenue:   640_000, cac:  45 },
  { channel: "Eventos / Networking",  sessions: 310,  conversions: 5,  revenue:   580_000, cac:  95 },
  { channel: "Email / Outbound",      sessions: 145,  conversions: 6,  revenue:   530_000, cac:  12 },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts: Alert[] = [
  {
    id: "A1",
    type: "warning",
    title: "Cliente em Risco",
    message: "Banco XP (JC006): NPS 42, churn risco Alto. R$230K MRR em risco — ação necessária.",
    timestamp: "2026-03-18T09:15:00Z",
  },
  {
    id: "A2",
    type: "success",
    title: "Meta Q1 Batida",
    message: "Q1 2026 receita superou o budget em 8.6% — R$4.82M vs R$4.44M meta.",
    timestamp: "2026-03-18T08:00:00Z",
  },
  {
    id: "A3",
    type: "info",
    title: "Novo Contrato",
    message: "Magazine Luiza (JC010) onboardado em Mar/26. MRR: R$260K — potencial de expansão.",
    timestamp: "2026-03-17T16:30:00Z",
  },
  {
    id: "A4",
    type: "error",
    title: "Queda de NPS — Conteúdo",
    message: "NPS do serviço Conteúdo & Social caiu de 68 para 51. Revisão de equipe necessária.",
    timestamp: "2026-03-17T11:00:00Z",
  },
];
