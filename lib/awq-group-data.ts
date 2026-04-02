// ─── AWQ Group — Consolidated holding data ──────────────────────────────────
//
// AUDITORIA 2026-04-02: Todos os valores financeiros anteriores eram
// hardcoded/fictícios sem fonte verificável. Os dados foram zerados para
// refletir o estado real: a base AWQ ainda não possui dados financeiros
// internalizados de fonte confiável.
//
// Quando os dados reais estiverem disponíveis (via integração com ERP,
// contabilidade ou base interna verificada), os valores devem ser preenchidos
// aqui ou substituídos por fetch dinâmico de API interna.
// ─────────────────────────────────────────────────────────────────────────────

/** Flag global: indica se os dados desta camada foram verificados por fonte confiável */
export const DATA_VERIFIED = false;
export const DATA_STATUS_LABEL = "Dados ainda não internalizados — aguardando integração com fonte confiável";

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

export const buData: BuData[] = [
  {
    id:               "jacqes",
    name:             "JACQES",
    sub:              "Agência · AWQ Group",
    color:            "bg-brand-600",
    accentColor:      "text-brand-400",
    status:           "Ativo",
    revenue:          0,
    grossProfit:      0,
    ebitda:           0,
    netIncome:        0,
    cashGenerated:    0,
    cashBalance:      0,
    customers:        0,
    ftes:             0,
    capitalAllocated: 0,
    roic:             0,
    budgetRevenue:    0,
    hrefOverview:     "/jacqes",
    hrefFinancial:    "/jacqes/financial",
    hrefCustomers:    "/jacqes/customers",
    hrefUnitEcon:     "/jacqes/unit-economics",
    hrefBudget:       "/jacqes/budget",
  },
  {
    id:               "caza",
    name:             "Caza Vision",
    sub:              "Produtora · AWQ Group",
    color:            "bg-emerald-600",
    accentColor:      "text-emerald-400",
    status:           "Ativo",
    revenue:          0,
    grossProfit:      0,
    ebitda:           0,
    netIncome:        0,
    cashGenerated:    0,
    cashBalance:      0,
    customers:        0,
    ftes:             0,
    capitalAllocated: 0,
    roic:             0,
    budgetRevenue:    0,
    hrefOverview:     "/caza-vision",
    hrefFinancial:    "/caza-vision/financial",
    hrefCustomers:    "/caza-vision/clientes",
    hrefUnitEcon:     "/caza-vision/unit-economics",
    hrefBudget:       "/caza-vision",
  },
  {
    id:               "advisor",
    name:             "Advisor",
    sub:              "Consultoria · AWQ Group",
    color:            "bg-violet-600",
    accentColor:      "text-violet-400",
    status:           "Ativo",
    revenue:          0,
    grossProfit:      0,
    ebitda:           0,
    netIncome:        0,
    cashGenerated:    0,
    cashBalance:      0,
    customers:        0,
    ftes:             0,
    capitalAllocated: 0,
    roic:             0,
    budgetRevenue:    0,
    hrefOverview:     "/advisor",
    hrefFinancial:    "/advisor/financial",
    hrefCustomers:    "/advisor/customers",
    hrefUnitEcon:     "/advisor",
    hrefBudget:       "/advisor",
  },
  {
    id:               "venture",
    name:             "AWQ Venture",
    sub:              "Investimentos · AWQ Group",
    color:            "bg-amber-600",
    accentColor:      "text-amber-400",
    status:           "Ativo",
    revenue:          0,
    grossProfit:      0,
    ebitda:           0,
    netIncome:        0,
    cashGenerated:    0,
    cashBalance:      0,
    customers:        0,
    ftes:             0,
    capitalAllocated: 0,
    roic:             0,
    budgetRevenue:    0,
    hrefOverview:     "/awq-venture",
    hrefFinancial:    "/awq-venture/financial",
    hrefCustomers:    "/awq-venture",
    hrefUnitEcon:     "/awq-venture",
    hrefBudget:       "/awq-venture",
  },
];

// ─── Operating BUs only (exclude Venture for P&L aggregation) ─────────────────
export const operatingBus = buData.filter((b) => b.id !== "venture");

// ─── Consolidated operating P&L ───────────────────────────────────────────────
export const consolidated = {
  revenue:          operatingBus.reduce((s, b) => s + b.revenue,          0),
  grossProfit:      operatingBus.reduce((s, b) => s + b.grossProfit,      0),
  ebitda:           operatingBus.reduce((s, b) => s + b.ebitda,           0),
  netIncome:        operatingBus.reduce((s, b) => s + b.netIncome,        0),
  cashGenerated:    operatingBus.reduce((s, b) => s + b.cashGenerated,    0),
  cashBalance:      buData.reduce      ((s, b) => s + b.cashBalance,      0),
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

export const consolidatedRoic =
  consolidated.capitalAllocated > 0
    ? (consolidated.netIncome / consolidated.capitalAllocated) * 100
    : 0;

export const budgetVsActual =
  consolidated.budgetRevenue > 0
    ? ((consolidated.revenue - consolidated.budgetRevenue) / consolidated.budgetRevenue) * 100
    : 0;

// ─── Monthly consolidated revenue ──────────────────────────────────────────────
// Dados ainda não disponíveis — sem registros mensais verificados.
export interface MonthlyPoint {
  month:    string;
  jacqes:   number;
  caza:     number;
  advisor:  number;
  total:    number;
}

export const monthlyRevenue: MonthlyPoint[] = [];

// ─── Risk signals ─────────────────────────────────────────────────────────────
// Sem dados de risco verificados no momento.
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
  jacqes:  "review",
  caza:    "review",
  advisor: "review",
  venture: "review",
};

export const flagConfig: Record<AllocFlag, { label: string; color: string; bg: string }> = {
  expand:   { label: "Expandir",  color: "text-emerald-700", bg: "bg-emerald-100 border border-emerald-200" },
  maintain: { label: "Manter",    color: "text-brand-700",   bg: "bg-brand-100 border border-brand-200"     },
  review:   { label: "Revisar",   color: "text-amber-700",   bg: "bg-amber-100 border border-amber-200"     },
  cut:      { label: "Cortar",    color: "text-red-700",     bg: "bg-red-100 border border-red-200"         },
};

// ─── Forecast ─────────────────────────────────────────────────────────────────
// Sem dados de forecast verificados.
export interface ForecastPoint {
  month:   string;
  base:    number;
  bull:    number;
  bear:    number;
  actual?: number;
}

export const revenueForecasts: ForecastPoint[] = [];

// ─── Cash Flow ────────────────────────────────────────────────────────────────
// Sem dados de fluxo de caixa verificados.
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
