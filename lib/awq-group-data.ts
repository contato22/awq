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
    // ⚠  CORRECTED 2026-04-04 — previous values (R$40.5M capital, R$18.5M exit) were
    //    unverified planning data with no empirical backing. Replaced with confirmed values.
    //
    // EMPIRICAL SOURCE: bank print Itaú Empresas (print confirmado 02/04/2026)
    //   totalInvestedReal:          R$ 15.762,62  (CDB DI renda fixa)
    //   investmentAccountBalance:   R$ 1.193,58   (saldo em conta — NÃO investido)
    //   lastApplication:            R$ 5.000,00   (APLICACAO CDB DI em 02/04/2026)
    //
    // PROIBIÇÕES (evidenciadas pelos prints):
    //   • saldo em conta R$1.193,58 ≠ saldo investido
    //   • tarifas (R$87 + R$21,60) ≠ investimento
    //   • intercompany AWQ Producoes ≠ investimento novo
    //   • retirada sócio Miguel Costa ≠ investimento
    id:               "venture",
    name:             "AWQ Venture",
    sub:              "Investimentos · AWQ Group",
    color:            "bg-amber-600",
    accentColor:      "text-amber-400",
    status:           "Ativo",
    revenue:          0,               // investment vehicle — no operating revenue
    grossProfit:      0,
    ebitda:           0,
    netIncome:        0,               // sem saída confirmada empiricamente
    cashGenerated:    0,               // sem retorno de investimento confirmado
    cashBalance:      15_762.62,       // EMPIRICAL: CDB DI saldo investido (Itaú Empresas)
    customers:        0,               // sem portfólio confirmado
    ftes:             3,
    capitalAllocated: 15_762.62,       // EMPIRICAL: valor confirmado em CDB DI
    roic:             0,               // sem retorno realizável comprovado
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

// ─── Risk Categories (qualitative risk signals with quantified exposure) ──────
//
// ⚠ SNAPSHOT — dados de planejamento / análise qualitativa.
// NÃO derivados da base bancária.
// DISCIPLINA: editar aqui; nunca hardcodar na page. A page importa via awq-derived-metrics.

export interface RiskCategoryDetail {
  label:    string;
  share:    number;    // % or pp, 0 if not applicable
  mrr:      number;    // BRL amount, 0 if not applicable
  risk:     string;    // qualitative level label
  days?:    number;    // days overdue (receivables)
  isTotal?: boolean;   // marks aggregate row
}

export interface RiskCategory {
  id:        string;
  title:     string;
  iconKey:   "users" | "dollar" | "building" | "trending-down" | "zap" | "shield-alert";
  colorKey:  "red" | "amber" | "brand";
  severity:  "high" | "medium" | "low";
  details:   RiskCategoryDetail[];
  threshold: string;
  current:   string;
  action:    string;
}

export const riskCategories: RiskCategory[] = [
  {
    id: "concentration",
    title:     "Concentração de Cliente",
    iconKey:   "users",
    colorKey:  "red",
    severity:  "high",
    details: [
      { label: "Ambev (JACQES)",           share: 20, mrr: 420_000,   risk: "Alto"    },
      { label: "Samsung (JACQES)",         share: 16, mrr: 350_000,   risk: "Alto"    },
      { label: "Natura (JACQES)",          share: 14, mrr: 310_000,   risk: "Médio"   },
      { label: "Ambev + Samsung + Natura", share: 50, mrr: 1_080_000, risk: "Crítico", isTotal: true },
    ],
    threshold: "Limite: top-3 ≤ 40%",
    current:   "Top-3 = 50% do MRR JACQES",
    action:    "Diversificar carteira — 3+ novos clientes em Q2",
  },
  {
    id: "receivables",
    title:    "Recebíveis em Aberto",
    iconKey:  "dollar",
    colorKey: "red",
    severity: "high",
    details: [
      { label: "CV002 — Banco XP (Caza)", share: 0, mrr: 320_000, risk: "Alto",  days: 8 },
      { label: "CV008 — Nubank (Caza)",   share: 0, mrr: 145_000, risk: "Médio", days: 5 },
      { label: "Banco XP Advisory",       share: 0, mrr:  42_000, risk: "Baixo", days: 3 },
    ],
    threshold: "Limite: total ≤ R$200K",
    current:   "Total em aberto: R$507K",
    action:    "Cobrança ativa Banco XP (CV002) — prazo expirado",
  },
  {
    id: "buDependency",
    title:    "Dependência de BU Única",
    iconKey:  "building",
    colorKey: "amber",
    severity: "medium",
    details: [
      { label: "JACQES",      share: 55, mrr: 4_820_000, risk: "Atenção" },
      { label: "Caza Vision", share: 28, mrr: 2_418_000, risk: "OK"      },
      { label: "Advisor",     share: 18, mrr: 1_572_000, risk: "OK"      },
    ],
    threshold: "Limite: nenhuma BU > 50%",
    current:   "JACQES = 55% da receita",
    action:    "Acelerar Caza Vision e Advisor para reequilibrar",
  },
  {
    id: "marginCompression",
    title:    "Compressão de Margem — JACQES",
    iconKey:  "trending-down",
    colorKey: "amber",
    severity: "medium",
    details: [
      { label: "Meta EBITDA 2026", share: 22, mrr: 0, risk: "Meta"    },
      { label: "EBITDA Realizado", share: 18, mrr: 0, risk: "Atual"   },
      { label: "Gap",              share: -4, mrr: 0, risk: "4pp gap" },
    ],
    threshold: "Meta: EBITDA ≥ 22%",
    current:   "Realizado: 18% EBITDA",
    action:    "Revisar mix de clientes e custos operacionais",
  },
  {
    id: "cashPressure",
    title:    "Posição de Investimento — AWQ Holding",
    iconKey:  "zap",
    colorKey: "amber",
    severity: "medium",
    details: [
      { label: "CDB DI (Itaú Empresas)",   share: 0, mrr: 15_762, risk: "Investido"  },
      { label: "Saldo em conta Itaú",      share: 0, mrr:  1_193, risk: "Operacional"},
      { label: "Caixa Cora (operacional)", share: 0, mrr:  8_460, risk: "Operacional"},
    ],
    threshold: "Posição empírica — print 02-04/04/2026",
    current:   "CDB DI: R$15.762,62 (única posição investida confirmada)",
    action:    "Ingira extrato Itaú Empresas em /awq/ingest para atualização automática",
  },
  {
    id: "forecastDet",
    title:    "Deterioração de Forecast",
    iconKey:  "shield-alert",
    colorKey: "brand",
    severity: "low",
    details: [
      { label: "Cenário base Q2", share: 0, mrr: 11_550_000, risk: "Base"  },
      { label: "Cenário bear Q2", share: 0, mrr: 10_020_000, risk: "Bear"  },
      { label: "Downside máximo", share: 0, mrr: -1_530_000, risk: "-13.2%"},
    ],
    threshold: "Bear < -20% do base",
    current:   "Bear = -13.2%: dentro do tolerável",
    action:    "Monitorar — sem ação imediata necessária",
  },
];

// ─── Holding Treasury Snapshot — empirical position (prints bancários) ────────
//
// ⚠  EMPIRICAL DATA — NOT planning/accrual.
// Source: prints bancários Cora AWQ + Itaú Empresas (02–04 Abr 2026).
// Use this as source of truth for investment display UNTIL real PDF extrato
// is ingested via /awq/ingest and processado pela pipeline financeira.
//
// RECONCILIATION RULES (invioláveis — evidenciadas pelos prints):
//   ✓ CDB DI R$15.762,62   → totalInvestedReal   (ÚNICA posição de investimento confirmada)
//   ✗ R$1.193,58 Itaú      → investmentAccountCash (saldo em conta — NÃO investido)
//   ✗ R$8.460,00 Cora       → operationalCash       (caixa operacional — NÃO investido)
//   ✗ R$5.000 CDB aplicação → fluxo de investimento (classificar como aplicacao_financeira)
//   ✗ R$87 + R$21,60 tarifas → tarifa_bancaria      (NÃO investimento)
//   ✗ R$1.000 Reserva Limite → transferencia_interna (NÃO investimento)
//   ✗ R$14.000 AWQ Producoes → intercompany         (NÃO investimento novo)
//   ✗ R$2.000 Miguel Costa   → prolabore_retirada   (NÃO investimento)

export interface HoldingTreasurySnapshot {
  asOf:                    string;    // YYYY-MM-DD — data da observação
  source:                  string;
  // Itaú Empresas — AWQ Holding
  totalInvestedReal:       number;    // CDB DI saldo total — ÚNICA posição investida
  lastApplicationAmount:   number;    // APLICACAO CDB DI mais recente
  lastApplicationDate:     string;    // data da última aplicação
  investmentType:          string;    // tipo de investimento
  investmentBank:          string;    // banco custodiante
  investmentAccountCash:   number;    // saldo em conta (NÃO investido)
  bankFees:                number;    // tarifas bancárias (NÃO investimento)
  // Cora AWQ — operacional
  operationalCash:         number;    // saldo disponível Cora
  cardLimitTotal:          number;    // limite total cartão garantido
  cardLimitCommitted:      number;    // comprometido em compras
  cardReserveDeposited:    number;    // valor reservado como garantia (2×R$500)
  // Confirmed NOT investment
  intercompanyTotal:       number;    // total enviado para AWQ Producoes (intercompany)
  partnerWithdrawals:      number;    // total retirada sócio Miguel Costa
  // Quality
  confidence:              "empirical_print" | "ingested" | "estimated";
  reconciledWith:          string[];  // itens reconciliados
  NOT_investment:          string[];  // itens explicitamente excluídos
  note:                    string;
}

export const holdingTreasurySnapshot: HoldingTreasurySnapshot = {
  asOf:                  "2026-04-04",
  source:                "Prints bancários Cora AWQ + Itaú Empresas (02–04/04/2026)",

  // Itaú Empresas
  totalInvestedReal:     15_762.62,   // saldo total investido — renda fixa CDB DI
  lastApplicationAmount:  5_000.00,   // APLICACAO CDB DI em 02/04/2026
  lastApplicationDate:   "2026-04-02",
  investmentType:        "Renda Fixa — CDB DI",
  investmentBank:        "Itaú Empresas",
  investmentAccountCash:  1_193.58,   // saldo em conta Itaú (operacional, NÃO investido)
  bankFees:                 108.60,   // R$87 tarifa mensal + R$21,60 tarifa Pix

  // Cora AWQ
  operationalCash:        8_460.00,   // saldo disponível Cora
  cardLimitTotal:         1_000.00,   // limite garantido do cartão
  cardLimitCommitted:       522.61,   // comprometido em compras
  cardReserveDeposited:   1_000.00,   // 2×R$500 reserva de limite para cartão

  // Confirmed NOT investment (proof by print)
  intercompanyTotal:     14_000.00,   // AWQ Producoes: R$5k+R$4k+R$5k (intercompany)
  partnerWithdrawals:     2_000.00,   // Miguel Costa de Souza: R$1k+R$1k (sócio)

  confidence: "empirical_print",
  reconciledWith: [
    "Print Cora AWQ — Saldo R$8.460,00 (03/04/2026 18:39)",
    "Print Itaú Empresas — Saldo investido R$15.762,62 (02/04/2026 13:06)",
    "Print Itaú Empresas — Extrato APLICACAO CDB DI -R$5.000 (02/04/2026)",
    "Print Itaú Empresas — Saldo em conta R$1.193,58",
    "Print Cora — Cartão limite garantido R$1.000 (comprometido R$522,61)",
  ],
  NOT_investment: [
    "Reserva de Limite para Cartão 2×R$500 = R$1.000 (garantia interna Cora — transferencia_interna_enviada)",
    "Pix MIGUEL COSTA DE SOUZA R$1.000 + R$1.000 = R$2.000 (prolabore_retirada)",
    "Pix AWQ PRODUCOES LTDA R$5.000 + R$4.000 + R$5.000 = R$14.000 (transferencia_interna_enviada — intercompany)",
    "TAR MANUT CONTA R$87,00 (tarifa_bancaria)",
    "TAR PIX PGTO TRANSF R$21,60 (tarifa_bancaria)",
    "Saldo em conta Itaú R$1.193,58 (investmentAccountCash — NÃO totalInvestedReal)",
    "Saldo Cora R$8.460,00 (caixa operacional — NÃO investimento)",
  ],
  note:
    "Posição empírica confirmada. totalInvestedReal = R$15.762,62 é o único valor " +
    "de investimento com prova documental nesta data. Aguardando extrato PDF Itaú " +
    "para integração com pipeline financeira e atualização automática via ingest.",
};
