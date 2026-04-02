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

export const kpis: KPI[] = [
  {
    id: "revenue",
    label: "Receita Bruta",
    value: 9_780,
    previousValue: 8_420,
    unit: "currency",
    icon: "DollarSign",
    color: "brand",
  },
  {
    id: "customers",
    label: "Contas Ativas",
    value: 5,
    previousValue: 4,
    unit: "number",
    icon: "Users",
    color: "emerald",
  },
  {
    id: "orders",
    label: "Monthly Orders",
    value: 12_394,
    previousValue: 11_280,
    unit: "number",
    icon: "ShoppingCart",
    color: "blue",
  },
  {
    id: "margin",
    label: "Margem Bruta",
    value: 72.4,
    previousValue: 68.1,
    unit: "percent",
    suffix: "%",
    icon: "TrendingUp",
    color: "purple",
  },
];

// ─── Revenue Trend ────────────────────────────────────────────────────────────

export const revenueData: RevenueDataPoint[] = [
  { month: "Jan", revenue: 3_210_000, expenses: 1_120_000, profit: 2_090_000 },
  { month: "Feb", revenue: 3_480_000, expenses: 1_195_000, profit: 2_285_000 },
  { month: "Mar", revenue: 3_650_000, expenses: 1_240_000, profit: 2_410_000 },
  { month: "Apr", revenue: 3_520_000, expenses: 1_180_000, profit: 2_340_000 },
  { month: "May", revenue: 3_900_000, expenses: 1_310_000, profit: 2_590_000 },
  { month: "Jun", revenue: 4_120_000, expenses: 1_390_000, profit: 2_730_000 },
  { month: "Jul", revenue: 4_250_000, expenses: 1_420_000, profit: 2_830_000 },
  { month: "Aug", revenue: 4_380_000, expenses: 1_450_000, profit: 2_930_000 },
  { month: "Sep", revenue: 4_510_000, expenses: 1_500_000, profit: 3_010_000 },
  { month: "Oct", revenue: 4_620_000, expenses: 1_530_000, profit: 3_090_000 },
  { month: "Nov", revenue: 4_730_000, expenses: 1_560_000, profit: 3_170_000 },
  { month: "Dec", revenue: 4_821_500, expenses: 1_580_000, profit: 3_241_500 },
];

// ─── Customer Segments ────────────────────────────────────────────────────────

export const customerSegments: CustomerSegment[] = [
  { name: "Enterprise", value: 42, color: "#6366f1" },
  { name: "SMB", value: 31, color: "#22d3ee" },
  { name: "Startup", value: 18, color: "#f59e0b" },
  { name: "Individual", value: 9, color: "#ec4899" },
];

// ─── Top Products ─────────────────────────────────────────────────────────────

export const topProducts: TopProduct[] = [
  {
    id: "P001",
    name: "JACQES Platform Pro",
    category: "SaaS",
    revenue: 1_842_000,
    units: 412,
    growth: 18.4,
    status: "trending",
  },
  {
    id: "P002",
    name: "Analytics Suite",
    category: "SaaS",
    revenue: 1_120_500,
    units: 289,
    growth: 12.7,
    status: "trending",
  },
  {
    id: "P003",
    name: "Data Connector API",
    category: "API",
    revenue: 756_000,
    units: 1_840,
    growth: 9.2,
    status: "stable",
  },
  {
    id: "P004",
    name: "Enterprise Reporting",
    category: "Add-on",
    revenue: 580_000,
    units: 124,
    growth: -2.1,
    status: "declining",
  },
  {
    id: "P005",
    name: "Custom Dashboards",
    category: "Service",
    revenue: 523_000,
    units: 98,
    growth: 6.8,
    status: "stable",
  },
];

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers: CustomerRecord[] = [
  {
    id: "C001",
    name: "Sarah Mitchell",
    company: "Nexus Corp",
    email: "s.mitchell@nexuscorp.com",
    segment: "Enterprise",
    ltv: 284_500,
    lastOrder: "2026-03-12",
    status: "active",
    country: "US",
  },
  {
    id: "C002",
    name: "James Okafor",
    company: "Zenith Digital",
    email: "james@zenithdigital.io",
    segment: "SMB",
    ltv: 94_200,
    lastOrder: "2026-03-10",
    status: "active",
    country: "UK",
  },
  {
    id: "C003",
    name: "Amara Patel",
    company: "Stellar Labs",
    email: "apatel@stellarlabs.co",
    segment: "Startup",
    ltv: 38_700,
    lastOrder: "2026-02-28",
    status: "at-risk",
    country: "CA",
  },
  {
    id: "C004",
    name: "Lena Hoffmann",
    company: "EuroVenture GmbH",
    email: "lhoffmann@euroventure.de",
    segment: "Enterprise",
    ltv: 312_000,
    lastOrder: "2026-03-15",
    status: "active",
    country: "DE",
  },
  {
    id: "C005",
    name: "Kwame Asante",
    company: "AfricaTech Hub",
    email: "kasante@africatechhub.com",
    segment: "SMB",
    ltv: 67_400,
    lastOrder: "2026-01-20",
    status: "at-risk",
    country: "GH",
  },
  {
    id: "C006",
    name: "Yuki Tanaka",
    company: "Shibuya Solutions",
    email: "y.tanaka@shibuya.jp",
    segment: "Enterprise",
    ltv: 198_000,
    lastOrder: "2026-03-14",
    status: "active",
    country: "JP",
  },
  {
    id: "C007",
    name: "Diego Ramirez",
    company: "LatamScale",
    email: "diego@latamscale.mx",
    segment: "Startup",
    ltv: 22_100,
    lastOrder: "2025-11-30",
    status: "churned",
    country: "MX",
  },
  {
    id: "C008",
    name: "Nina Volkov",
    company: "Baltic Systems",
    email: "nvolkov@balticsys.ee",
    segment: "SMB",
    ltv: 81_500,
    lastOrder: "2026-03-08",
    status: "active",
    country: "EE",
  },
];

// ─── Regional Performance ─────────────────────────────────────────────────────

export const regionData: RegionData[] = [
  { region: "North America", revenue: 1_928_600, customers: 1_542, growth: 14.2 },
  { region: "Europe", revenue: 1_445_000, customers: 1_089, growth: 11.8 },
  { region: "Asia Pacific", revenue: 896_500, customers: 712, growth: 22.5 },
  { region: "Middle East & Africa", revenue: 337_200, customers: 284, growth: 31.0 },
  { region: "Latin America", revenue: 214_200, customers: 220, growth: 8.4 },
];

// ─── Acquisition Channels ─────────────────────────────────────────────────────

export const channelData: ChannelData[] = [
  { channel: "Organic Search", sessions: 48_200, conversions: 1_204, revenue: 1_420_000, cac: 0 },
  { channel: "Paid Search", sessions: 22_400, conversions: 672, revenue: 890_000, cac: 180 },
  { channel: "Direct", sessions: 18_900, conversions: 511, revenue: 760_000, cac: 0 },
  { channel: "Referral", sessions: 12_500, conversions: 375, revenue: 640_000, cac: 45 },
  { channel: "Social Media", sessions: 31_000, conversions: 496, revenue: 580_000, cac: 95 },
  { channel: "Email", sessions: 14_700, conversions: 588, revenue: 531_500, cac: 12 },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts: Alert[] = [
  {
    id: "A1",
    type: "warning",
    title: "At-Risk Customers",
    message: "12 enterprise customers have not placed an order in 45+ days.",
    timestamp: "2026-03-18T09:15:00Z",
  },
  {
    id: "A2",
    type: "success",
    title: "Revenue Milestone",
    message: "Q1 2026 revenue exceeded target by 8.3% — R$4.82M vs R$4.45M goal.",
    timestamp: "2026-03-18T08:00:00Z",
  },
  {
    id: "A3",
    type: "info",
    title: "APAC Growth Surge",
    message: "Asia Pacific region showing 22.5% YoY growth — consider capacity planning.",
    timestamp: "2026-03-17T16:30:00Z",
  },
  {
    id: "A4",
    type: "error",
    title: "Analytics Suite Churn Signal",
    message: "NPS for Analytics Suite dropped to 32 this month from 48 last month.",
    timestamp: "2026-03-17T11:00:00Z",
  },
];
