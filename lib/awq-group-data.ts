// ─── AWQ Group — Consolidated holding data · YTD Jan–Mar 2026 ─────────────────
//
// ⚠  SNAPSHOT / PLANNING DATA — registered in lib/snapshot-registry.ts
//
// CLASSIFICATION: accrual P&L snapshot (NOT cash-basis, NOT from bank statements).
// SOURCE: manually curated Q1 2026 planning data.
// STATUS: intentional — hybrid architecture until invoice/NF ingestion is built.
//
// FOR CASH-BASIS REAL DATA: use lib/financial-query.ts → buildFinancialQuery()
// Pages that already use the real pipeline: /awq/financial, /awq/cashflow
//
// DO NOT add new hardcoded revenue/EBITDA/expense values here.
// DO NOT import this file in new pages without a snapshot-registry.ts entry.
// DO NOT use these values as source of truth for cash-position or bank reconciliation.

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
    revenue:          4_820_000,
    grossProfit:      2_892_000,
    ebitda:           867_000,
    netIncome:        518_000,
    cashGenerated:    720_000,
    cashBalance:      1_840_000,
    customers:        10,
    ftes:             28,
    capitalAllocated: 2_400_000,
    roic:             21.6,
    budgetRevenue:    4_440_000,
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
    revenue:          2_418_000,
    grossProfit:      1_730_000,
    ebitda:           653_000,
    netIncome:        420_000,
    cashGenerated:    580_000,
    cashBalance:      920_000,
    customers:        8,
    ftes:             15,
    capitalAllocated: 1_200_000,
    roic:             35.0,
    budgetRevenue:    2_148_000,
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
    revenue:          1_572_000,
    grossProfit:      865_000,
    ebitda:           723_000,
    netIncome:        479_000,
    cashGenerated:    510_000,
    cashBalance:      680_000,
    customers:        30,
    ftes:             8,
    capitalAllocated: 800_000,
    roic:             59.9,
    budgetRevenue:    1_400_000,
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
    revenue:          0,            // investment vehicle — no operating revenue
    grossProfit:      0,
    ebitda:           0,
    netIncome:        18_500_000,   // exit proceeds (Saúde Digital)
    cashGenerated:    18_500_000,
    cashBalance:      6_200_000,    // dry powder
    customers:        6,            // portfolio companies
    ftes:             3,
    capitalAllocated: 40_500_000,
    roic:             137.3,        // portfolio total return %
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
  cashBalance:      buData.reduce      ((s, b) => s + b.cashBalance,      0), // all BUs
  customers:        operatingBus.reduce((s, b) => s + b.customers,        0),
  ftes:             operatingBus.reduce((s, b) => s + b.ftes,             0),
  capitalAllocated: buData.reduce      ((s, b) => s + b.capitalAllocated, 0),
  budgetRevenue:    operatingBus.reduce((s, b) => s + b.budgetRevenue,    0),
};

export const consolidatedMargins = {
  grossMargin:  consolidated.grossProfit / consolidated.revenue,
  ebitdaMargin: consolidated.ebitda      / consolidated.revenue,
  netMargin:    consolidated.netIncome   / consolidated.revenue,
};

export const consolidatedRoic =
  (consolidated.netIncome / consolidated.capitalAllocated) * 100;

export const budgetVsActual =
  ((consolidated.revenue - consolidated.budgetRevenue) / consolidated.budgetRevenue) * 100;

// ─── Monthly consolidated revenue (Jan–Mar 2026 per BU) ──────────────────────
export interface MonthlyPoint {
  month:    string;
  jacqes:   number;
  caza:     number;
  advisor:  number;
  total:    number;
}

export const monthlyRevenue: MonthlyPoint[] = [
  { month: "Jan/26", jacqes: 1_420_000, caza:   712_000, advisor:   508_000, total: 2_640_000 },
  { month: "Fev/26", jacqes: 1_512_000, caza:   798_000, advisor:   528_000, total: 2_838_000 },
  { month: "Mar/26", jacqes: 1_888_000, caza:   908_000, advisor:   536_000, total: 3_332_000 },
];

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

export const riskSignals: RiskSignal[] = [
  {
    id: "R1",
    title:       "Concentração de Cliente — JACQES",
    description: "Top 3 clientes representam 58% do MRR. Ambev sozinho = 20%.",
    severity:    "high",
    bu:          "JACQES",
    metric:      "Top-3 share: 58%",
    threshold:   "Limite: 40%",
  },
  {
    id: "R2",
    title:       "Concentração de BU — Receita",
    description: "JACQES representa 55% da receita operacional do grupo.",
    severity:    "medium",
    bu:          "AWQ Group",
    metric:      "JACQES share: 55%",
    threshold:   "Limite: 50%",
  },
  {
    id: "R3",
    title:       "Receivables em Aberto — Caza Vision",
    description: "CV002 Banco XP (R$320K) sem recebimento há 8 dias. CV008 Nubank (R$145K) em aberto.",
    severity:    "high",
    bu:          "Caza Vision",
    metric:      "Em aberto: R$465K",
    threshold:   "Limite: R$200K",
  },
  {
    id: "R4",
    title:       "Margem EBITDA JACQES abaixo de meta",
    description: "Meta anual de 22% vs realizado 18%. Gap de 4pp pressionando EBITDA consolidado.",
    severity:    "medium",
    bu:          "JACQES",
    metric:      "EBITDA: 18.0%",
    threshold:   "Meta: 22.0%",
  },
  {
    id: "R5",
    title:       "Cash Runway — AWQ Venture",
    description: "Dry powder de R$6.2M. Próximo investimento previsto R$8M: necessidade de captação.",
    severity:    "medium",
    bu:          "AWQ Venture",
    metric:      "Dry powder: R$6.2M",
    threshold:   "Próximo deploy: R$8M",
  },
  {
    id: "R6",
    title:       "Cliente em Risco — Advisor",
    description: "André Teixeira (R$6.2M AUM, NPS 68) em revisão contratual — risco de saída.",
    severity:    "low",
    bu:          "Advisor",
    metric:      "AUM em risco: R$6.2M",
    threshold:   "NPS: 68 (alerta <70)",
  },
];

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

export const revenueForecasts: ForecastPoint[] = [
  { month: "Jan/26", base: 2_640_000, bull: 2_640_000, bear: 2_640_000, actual: 2_640_000 },
  { month: "Fev/26", base: 2_838_000, bull: 2_838_000, bear: 2_838_000, actual: 2_838_000 },
  { month: "Mar/26", base: 3_332_000, bull: 3_332_000, bear: 3_332_000, actual: 3_332_000 },
  { month: "Abr/26", base: 3_600_000, bull: 3_960_000, bear: 3_060_000  },
  { month: "Mai/26", base: 3_850_000, bull: 4_235_000, bear: 3_080_000  },
  { month: "Jun/26", base: 4_100_000, bull: 4_510_000, bear: 3_280_000  },
  { month: "Jul/26", base: 4_300_000, bull: 4_730_000, bear: 3_440_000  },
  { month: "Ago/26", base: 4_450_000, bull: 4_895_000, bear: 3_560_000  },
  { month: "Set/26", base: 4_600_000, bull: 5_060_000, bear: 3_680_000  },
  { month: "Out/26", base: 4_750_000, bull: 5_225_000, bear: 3_800_000  },
  { month: "Nov/26", base: 4_900_000, bull: 5_390_000, bear: 3_920_000  },
  { month: "Dez/26", base: 5_100_000, bull: 5_610_000, bear: 4_080_000  },
];

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

export const cashFlowRows: CashFlowRow[] = [
  { label: "Lucro Líquido",              jacqes:   518_000, caza:  420_000, advisor:  479_000, venture:  18_500_000, indent: 1, bold: false },
  { label: "(+) D&A",                    jacqes:    43_000, caza:   18_000, advisor:    8_000, venture:           0, indent: 1, bold: false },
  { label: "(+/-) Cap. de Giro",         jacqes:   159_000, caza:  142_000, advisor:   23_000, venture:           0, indent: 1, bold: false },
  { label: "= FCO (Caixa Operacional)",  jacqes:   720_000, caza:  580_000, advisor:  510_000, venture:  18_500_000, indent: 0, bold: true  },
  { label: "(-) Capex",                  jacqes:   -48_000, caza:  -32_000, advisor:  -12_000, venture:  -7_000_000, indent: 1, bold: false },
  { label: "(-) Novos Investimentos",    jacqes:         0, caza:        0, advisor:        0, venture:           0, indent: 1, bold: false },
  { label: "= FCO Livre (FCF)",          jacqes:   672_000, caza:  548_000, advisor:  498_000, venture:  11_500_000, indent: 0, bold: true  },
  { label: "(-) Distribuições/Divid.",   jacqes:  -200_000, caza:  -80_000, advisor: -100_000, venture:           0, indent: 1, bold: false },
  { label: "= Var. de Caixa",            jacqes:   472_000, caza:  468_000, advisor:  398_000, venture:  11_500_000, indent: 0, bold: true  },
];

// ─── Budget targets by P&L line (complement to buData.budgetRevenue) ──────────
//
// These are the accrual budget targets for lines NOT already in buData.
// buData already has budgetRevenue. This covers grossProfit, EBITDA, netIncome, cash.
// Used by lib/awq-derived-metrics.ts to derive BUDGET_LINES without duplication.

export interface BuBudgetTargets {
  budgGrossProfit: number;
  budgEbitda:      number;
  budgNetIncome:   number;
  budgCash:        number;
}

export const buBudgetTargets: Record<string, BuBudgetTargets> = {
  jacqes:  { budgGrossProfit: 2_664_000, budgEbitda:  976_800, budgNetIncome: 489_000, budgCash: 630_000 },
  caza:    { budgGrossProfit: 1_546_000, budgEbitda:  515_520, budgNetIncome: 386_640, budgCash: 450_000 },
  advisor: { budgGrossProfit:   770_000, budgEbitda:  644_000, budgNetIncome: 427_000, budgCash: 460_000 },
};

// ─── Expense category budgets (consolidated AWQ Group) ────────────────────────

export interface CategoryBudgetItem {
  category: string;
  budget:   number;
  actual:   number;
  bu:       string;
}

export const categoryBudget: CategoryBudgetItem[] = [
  { category: "Marketing & Growth",    budget: 1_440_000, actual: 1_238_000, bu: "Grupo" },
  { category: "Salários & Benefícios", budget: 3_720_000, actual: 3_540_000, bu: "Grupo" },
  { category: "Tecnologia & Infra",    budget:   540_000, actual:   462_000, bu: "Grupo" },
  { category: "Vendas & Comissões",    budget:   960_000, actual: 1_044_000, bu: "Grupo" },
  { category: "G&A Consolidado",       budget:   720_000, actual:   684_000, bu: "Grupo" },
  { category: "Desp. Operacionais",    budget:   360_000, actual:   396_000, bu: "Grupo" },
];

// ─── Forecast accuracy history ────────────────────────────────────────────────
//
// Stores the original forecast vs actual comparison.
// Note: revenueForecasts[] tracks forward-looking scenarios; this tracks past accuracy.

export interface ForecastAccuracyPoint {
  month:    string;
  forecast: number;   // original forecast issued for that month
  actual:   number;   // confirmed actual revenue
  error:    number;   // % error: positive = underestimated, negative = overestimated
}

export const forecastAccuracyHistory: ForecastAccuracyPoint[] = [
  { month: "Jan/26", forecast: 2_580_000, actual: 2_640_000, error:  2.3 },
  { month: "Fev/26", forecast: 2_900_000, actual: 2_838_000, error: -2.1 },
  { month: "Mar/26", forecast: 3_280_000, actual: 3_332_000, error:  1.6 },
];

// ─── Per-BU full-year forecast scenarios ─────────────────────────────────────

export interface BuForecastScenario {
  bu:           string;
  color:        string; // Tailwind class
  accent:       string; // Tailwind class
  ytd:          number;
  fullYearBase: number;
  fullYearBull: number;
  fullYearBear: number;
  growth:       number; // % YoY growth in base scenario
}

export const buForecastScenarios: BuForecastScenario[] = [
  {
    bu: "JACQES",      color: "bg-brand-500",   accent: "text-brand-600",
    ytd: 4_820_000, fullYearBase: 19_800_000, fullYearBull: 21_780_000, fullYearBear: 16_830_000, growth: 12.4,
  },
  {
    bu: "Caza Vision", color: "bg-emerald-500", accent: "text-emerald-600",
    ytd: 2_418_000, fullYearBase: 12_100_000, fullYearBull: 13_310_000, fullYearBear:  9_680_000, growth: 28.3,
  },
  {
    bu: "Advisor",     color: "bg-violet-500",  accent: "text-violet-700",
    ytd: 1_572_000, fullYearBase:  7_200_000, fullYearBull:  7_920_000, fullYearBear:  5_760_000, growth: 18.6,
  },
];
