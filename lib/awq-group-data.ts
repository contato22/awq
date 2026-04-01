// ─── AWQ Group — Consolidated holding data · YTD Jan–Mar 2026 ─────────────────

export interface BuData {
  id:               string;
  name:             string;
  sub:              string;
  color:            string;       // Tailwind bg color
  accentColor:      string;       // Tailwind text color
  status:           "Ativo" | "Em breve" | "Em construção";
  // P&L
  revenue:          number;
  grossProfit:      number;
  ebitda:           number;
  netIncome:        number;
  // Cash
  cashGenerated:    number;
  cashBalance:      number;
  // Operations
  customers:        number;
  ftes:             number;
  // Capital
  capitalAllocated: number;
  roic:             number;       // %
  // Budget
  budgetRevenue:    number;       // YTD budget
  // Links
  hrefOverview:     string;
  hrefFinancial:    string;
  hrefCustomers:    string;
  hrefUnitEcon:     string;
  hrefBudget:       string;
}

export const buData: BuData[] = [];

// ─── Operating BUs only (exclude Venture for P&L aggregation) ─────────────────
export const operatingBus = buData.filter((b) => b.id !== "venture");

// ─── Consolidated operating P&L ───────────────────────────────────────────────
export const consolidated = {
  revenue:          operatingBus.reduce((s, b) => s + b.revenue,          0),
  grossProfit:      operatingBus.reduce((s, b) => s + b.grossProfit,      0),
  ebitda:           operatingBus.reduce((s, b) => s + b.ebitda,           0),
  netIncome:        operatingBus.reduce((s, b) => s + b.netIncome,        0),
  cashGenerated:    operatingBus.reduce((s, b) => s + b.cashGenerated,    0),
  cashBalance:      buData.reduce      ((s, b) => s + b.cashBalance,      0), // all BUs
  customers:        operatingBus.reduce((s, b) => s + b.customers,        0),
  ftes:             operatingBus.reduce((s, b) => s + b.ftes,             0),
  capitalAllocated: buData.reduce      ((s, b) => s + b.capitalAllocated, 0),
  budgetRevenue:    operatingBus.reduce((s, b) => s + b.budgetRevenue,    0),
};

export const consolidatedMargins = {
  grossMargin:  consolidated.revenue > 0 ? consolidated.grossProfit / consolidated.revenue : 0,
  ebitdaMargin: consolidated.revenue > 0 ? consolidated.ebitda      / consolidated.revenue : 0,
  netMargin:    consolidated.revenue > 0 ? consolidated.netIncome   / consolidated.revenue : 0,
};

export const consolidatedRoic = consolidated.capitalAllocated > 0
  ? (consolidated.netIncome / consolidated.capitalAllocated) * 100
  : 0;

export const budgetVsActual = consolidated.budgetRevenue > 0
  ? ((consolidated.revenue - consolidated.budgetRevenue) / consolidated.budgetRevenue) * 100
  : 0;

// ─── Monthly consolidated revenue (Jan–Mar 2026 per BU) ──────────────────────
export interface MonthlyPoint {
  month:    string;
  jacqes:   number;
  caza:     number;
  advisor:  number;
  total:    number;
}

export const monthlyRevenue: MonthlyPoint[] = [];

// ─── Risk signals ─────────────────────────────────────────────────────────────
export interface RiskSignal {
  id:          string;
  title:       string;
  description: string;
  severity:    "high" | "medium" | "low";
  bu:          string;
  metric:      string;
  threshold:   string;
}

export const riskSignals: RiskSignal[] = [];

// ─── Capital allocation flags ─────────────────────────────────────────────────
export type AllocFlag = "expand" | "maintain" | "review" | "cut";

export const allocFlags: Record<string, AllocFlag> = {
  jacqes:  "maintain",
  caza:    "expand",
  advisor: "expand",
  venture: "maintain",
};

export const flagConfig: Record<AllocFlag, { label: string; color: string; bg: string }> = {
  expand:   { label: "Expandir",  color: "text-emerald-700", bg: "bg-emerald-100 border border-emerald-200" },
  maintain: { label: "Manter",    color: "text-brand-700",   bg: "bg-brand-100 border border-brand-200"     },
  review:   { label: "Revisar",   color: "text-amber-700",   bg: "bg-amber-100 border border-amber-200"     },
  cut:      { label: "Cortar",    color: "text-red-700",     bg: "bg-red-100 border border-red-200"         },
};

// ─── Forecast ─────────────────────────────────────────────────────────────────
export interface ForecastPoint {
  month:   string;
  base:    number;
  bull:    number;
  bear:    number;
  actual?: number;
}

export const revenueForecasts: ForecastPoint[] = [];

// ─── Cash Flow ────────────────────────────────────────────────────────────────
export interface CashFlowRow {
  label:    string;
  jacqes:   number;
  caza:     number;
  advisor:  number;
  venture:  number;
  indent:   number;
  bold:     boolean;
}

export const cashFlowRows: CashFlowRow[] = [];
