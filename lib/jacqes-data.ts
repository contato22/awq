// ─── JACQES BU — Canonical Data Layer ─────────────────────────────────────────
//
// SOURCE OF TRUTH for all JACQES BU pages.
//
// HIERARCHY:
//   Camada 1  — Base operacional: JACQES_CUSTOMERS (carteira de clientes)
//   Camada 2  — Base econômica:   JACQES_PL (DRE accrual Q1 2026)
//   Camada 3  — Queries derivadas: budget vs actual, MRR, unit economics
//
// ANCHORED TO:
//   lib/awq-group-data.ts → buData[jacqes].{revenue, grossProfit, ebitda,
//                           netIncome, budgetRevenue, cashGenerated}
//                         → monthlyRevenue[*].jacqes (receita mensal realizada)
//                         → buBudgetTargets[jacqes].{budgEbitda, budgGrossProfit, budgNetIncome}
//
// GOVERNANCE:
//   Páginas JACQES DEVEM importar dados financeiros/econômicos DAQUI.
//   lib/awq-group-data.ts é privado da camada holding.
//   A holding lê buData[jacqes]; a BU lê daqui.
//   lib/data.ts permanece como fonte de dados de componentes de chart (topProducts etc).
//
// PROIBIÇÃO:
//   Nenhuma página JACQES pode hardcodar receita, budget ou P&L inline.
//   Qualquer alteração na economia da BU começa aqui e propaga automaticamente.

import {
  buData,
  buBudgetTargets,
  monthlyRevenue,
} from "./awq-group-data";

// ─── BU anchor: único ponto de importação da camada holding ──────────────────

const _bu    = buData.find((b) => b.id === "jacqes")!;
const _budg  = buBudgetTargets["jacqes"];
const _monthly = monthlyRevenue;

// ─── Camada 1 — Base operacional ─────────────────────────────────────────────

export interface JacqesCustomer {
  id:        string;
  name:      string;
  segment:   string;
  mrr:       number;   // Receita recorrente mensal contratada (R$) — run-rate Mar/26
  ltv:       number;   // Lifetime value realizado + projeção (R$)
  since:     string;   // ISO date início de contrato
  status:    "Ativo" | "Em Risco" | "Churned";
  churnRisk: "Baixo" | "Médio" | "Alto" | "—";
  nps:       number;   // NPS da conta — 0 = sem dado
}

// NOTA METODOLÓGICA — MRR vs Receita Mensal:
//   MRR aqui = run-rate contratual de Mar/26 (valor mensal no contrato).
//   Receita mensal realizada Q1 → awq-group-data.monthlyRevenue[].jacqes.
//   MRR > receita média Q1 porque clientes estavam em ramp-up durante o trimestre
//   (ex: Magazine Luiza entrou em Mar/26 → contribuiu apenas 1 mês).
//   MRR é a base forward-looking; receita é o caixa backward-looking do período.

export const JACQES_CUSTOMERS: JacqesCustomer[] = [
  { id: "JC001", name: "Ambev",          segment: "Bebidas & FMCG",       mrr: 420_000, ltv: 5_040_000, since: "2023-04-01", status: "Ativo",    churnRisk: "Baixo", nps: 82 },
  { id: "JC002", name: "Natura",         segment: "Beleza & Sustentab.",  mrr: 310_000, ltv: 2_480_000, since: "2024-01-15", status: "Ativo",    churnRisk: "Baixo", nps: 78 },
  { id: "JC003", name: "iFood",          segment: "Food & Tech",          mrr: 285_000, ltv: 1_710_000, since: "2024-06-01", status: "Ativo",    churnRisk: "Médio", nps: 65 },
  { id: "JC004", name: "Samsung Brasil", segment: "Tecnologia",           mrr: 350_000, ltv: 4_200_000, since: "2023-03-10", status: "Ativo",    churnRisk: "Baixo", nps: 91 },
  { id: "JC005", name: "Nike Brasil",    segment: "Esporte & Lifestyle",  mrr: 195_000, ltv: 2_340_000, since: "2024-01-20", status: "Ativo",    churnRisk: "Baixo", nps: 88 },
  { id: "JC006", name: "Banco XP",       segment: "Finanças",             mrr: 230_000, ltv: 1_380_000, since: "2024-07-01", status: "Em Risco", churnRisk: "Alto",  nps: 42 },
  { id: "JC007", name: "Nubank",         segment: "Fintech",              mrr: 175_000, ltv:   700_000, since: "2025-01-10", status: "Ativo",    churnRisk: "Médio", nps: 74 },
  { id: "JC008", name: "Arezzo",         segment: "Moda & Varejo",        mrr:  98_000, ltv:   392_000, since: "2025-02-15", status: "Ativo",    churnRisk: "Baixo", nps: 79 },
  { id: "JC009", name: "Startup XYZ",    segment: "Tecnologia",           mrr:       0, ltv:   145_000, since: "2024-12-01", status: "Churned",  churnRisk: "—",     nps: 31 },
  { id: "JC010", name: "Magazine Luiza", segment: "Varejo",               mrr: 260_000, ltv: 1_040_000, since: "2025-03-01", status: "Ativo",    churnRisk: "Médio", nps: 61 },
];

// ─── Camada 1 — Métricas computadas da carteira ───────────────────────────────

const _active  = JACQES_CUSTOMERS.filter((c) => c.status === "Ativo" || c.status === "Em Risco");
const _churned = JACQES_CUSTOMERS.filter((c) => c.status === "Churned");
const _npsSet  = JACQES_CUSTOMERS.filter((c) => c.nps > 0);

/** MRR run-rate contratual (Mar/26 end) — soma dos contratos ativos */
export const JACQES_CURRENT_MRR: number =
  _active.reduce((s, c) => s + c.mrr, 0); // 2_323_000

/** LTV total histórico + projetado da carteira */
export const JACQES_TOTAL_LTV: number =
  JACQES_CUSTOMERS.reduce((s, c) => s + c.ltv, 0); // 19_427_000

/** LTV médio por cliente (derivado da carteira) */
export const JACQES_AVG_LTV: number =
  Math.round(JACQES_TOTAL_LTV / JACQES_CUSTOMERS.length); // 1_942_700

/** Churn rate % — derivado da carteira */
export const JACQES_CHURN_RATE: string =
  ((_churned.length / JACQES_CUSTOMERS.length) * 100).toFixed(1); // "10.0"

/** NPS médio — derivado da carteira */
export const JACQES_AVG_NPS: number = Math.round(
  _npsSet.reduce((s, c) => s + c.nps, 0) / _npsSet.length
); // 69

export const JACQES_CHURN_HISTORY = [
  { month: "Out/25", novos: 2, churned: 1, net: 1 },
  { month: "Nov/25", novos: 1, churned: 0, net: 1 },
  { month: "Dez/25", novos: 3, churned: 1, net: 2 },
  { month: "Jan/26", novos: 2, churned: 1, net: 1 },
  { month: "Fev/26", novos: 1, churned: 0, net: 1 },
  { month: "Mar/26", novos: 2, churned: 0, net: 2 },
];

// ─── Camada 2 — Base econômica (DRE accrual Q1 2026) ─────────────────────────
//
// METODOLOGIA: accrual P&L. Não é caixa. Não vem do pipeline bancário.
// ALINHAMENTO COM awq-group-data:
//   revenueBruta  → buData[jacqes].revenue       = 4_820_000   (ÂNCORA)
//   ebitda        → buData[jacqes].ebitda         = 867_000 (≈ 866_800 computado)
//   netIncome     → buData[jacqes].netIncome       = 518_000 (≈ 518_370 computado)
//   grossProfitSimple → buData[jacqes].grossProfit = 2_892_000 (60% × bruto — KPI cards)
//
// NOTA sobre lucro bruto:
//   grossProfitSimple = 60% × revenueBruta = 2_892_000 (base = receita bruta)
//   lucrobruto (DRE) = 60% × receitaLiquida = 2_603_400 (base = receita líquida)
//   Ambos chegam a 60% de margem bruta — diferença é a base do denominador.
//   Sem erro; diferença metodológica declarada explicitamente.

// P&L scalars — usados pelas páginas da BU
export const JACQES_PL = {
  period:            "Q1 2026 (Jan–Mar)",
  // Receita
  revenueBruta:      _bu.revenue,      // 4_820_000 — ÂNCORA awq-group-data
  deducoes:          481_000,          // ≈ 10% — impostos sobre receita
  receitaLiquida:    4_339_000,        // revenueBruta - deducoes
  // Custo dos serviços
  cogs:              1_735_600,        // ≈ 40% de receitaLiquida
  lucrobruto:        2_603_400,        // receitaLiquida - cogs (60% net)
  // Gross profit simples (sem deduções) — KPI cards e comparação com holding
  grossProfitSimple: _bu.grossProfit,  // 2_892_000 = 60% × revenueBruta
  // Despesas operacionais SG&A
  despCom:           347_120,
  despAdm:           520_680,
  despPessoal:       868_800,
  opex:              1_736_600,        // despCom + despAdm + despPessoal
  // EBITDA (lucrobruto - opex; ≈ buData.ebitda = 867_000)
  ebitda:            866_800,
  // Below EBITDA
  da:                 43_390,
  ebit:              823_410,          // ebitda - da
  resultadoFin:      -38_000,
  antesIr:           785_410,          // ebit + resultadoFin
  ir:                267_040,
  netIncome:         518_370,          // antesIr - ir (≈ buData.netIncome = 518_000)
  // Margens (base = receitaLiquida)
  grossMarginLiq:    60.0,             // lucrobruto / receitaLiquida
  ebitdaMarginLiq:   19.98,            // ebitda / receitaLiquida
  netMarginLiq:      11.95,            // netIncome / receitaLiquida
} as const;

// ─── Camada 3 — Receita mensal realizada ─────────────────────────────────────
//
// Derivado de awq-group-data.monthlyRevenue (fonte: holding snapshot Q1 2026).
// São as receitas REALIZADAS — não o MRR run-rate (ver nota em Camada 1).

export interface JacqesMonthlyPoint {
  month:   string;  // "Mmm/YY"
  revenue: number;  // Receita realizada (R$)
}

export const JACQES_MONTHLY_REVENUE: JacqesMonthlyPoint[] = _monthly.map((m) => ({
  month:   m.month,
  revenue: m.jacqes,
}));
// [{month:"Jan/26", revenue:1_420_000}, {month:"Fev/26", revenue:1_512_000}, {month:"Mar/26", revenue:1_888_000}]

// ─── Camada 3 — Budget targets ────────────────────────────────────────────────
//
// Budgets Q1 2026 (YTD) derivados de awq-group-data.
// Budget anual = anualizaçào da taxa Q1 (× 4).
// Orçamento anual FORMAL não existe no sistema — use o anualizado com marcação explícita.

export const JACQES_BUDGET = {
  // Q1 2026 (YTD) — direto de awq-group-data
  ytdRevenue:      _bu.budgetRevenue,          // 4_440_000
  ytdGrossProfit:  _budg.budgGrossProfit,      // 2_664_000
  ytdEbitda:       _budg.budgEbitda,           // 976_800
  ytdNetIncome:    _budg.budgNetIncome,        // 489_000
  ytdCash:         _budg.budgCash,             // 630_000
  // Mensal (Q1 prorated igualmente)
  monthlyRevenue:  Math.round(_bu.budgetRevenue / 3),     // 1_480_000
  monthlyEbitda:   Math.round(_budg.budgEbitda / 3),      // 325_600
  // Anual (anualizado a partir do Q1 — não é orçamento formal)
  annualRevenue:   _bu.budgetRevenue * 4,                  // 17_760_000
  annualGrossProfit: _budg.budgGrossProfit * 4,            // 10_656_000
  annualEbitda:    _budg.budgEbitda * 4,                   // 3_907_200
  annualNetIncome: _budg.budgNetIncome * 4,                // 1_956_000
} as const;

// ─── Camada 3 — Budget vs Actual mensal (CORRIGIDO) ──────────────────────────
//
// CORREÇÃO: financial/page.tsx tinha inline [Jan=298K, Fev=375K, Mar=421K].
//   Esses valores eram ~4-5× menores que a receita real (Jan=1,42M, Fev=1,51M, Mar=1,89M).
//   Budget mensal de R$298-421K é incompatível com budget Q1 total = R$4,44M.
//
// FONTE CORRETA:
//   receitaActual → awq-group-data.monthlyRevenue[].jacqes (realizado mensal)
//   receitaBudget → JACQES_BUDGET.monthlyRevenue = 1_480_000 (Q1/3, prorated)
//   ebitdaActual  → prorated proporcional à receita × EBITDA total Q1
//   ebitdaBudget  → JACQES_BUDGET.monthlyEbitda = 325_600 (Q1/3)

export interface JacqesBudgetActualRow {
  month:         string;
  receitaBudget: number;
  receitaActual: number;  // 0 = período futuro
  ebitdaBudget:  number;
  ebitdaActual:  number;  // 0 = período futuro
}

export const JACQES_BUDGET_VS_ACTUAL: JacqesBudgetActualRow[] = [
  ..._monthly.map((m) => ({
    month:         m.month,
    receitaBudget: Math.round(_bu.budgetRevenue / 3),
    receitaActual: m.jacqes,
    ebitdaBudget:  Math.round(_budg.budgEbitda / 3),
    ebitdaActual:  Math.round((m.jacqes / _bu.revenue) * 866_800),
  })),
  { month: "Abr/26", receitaBudget: Math.round(_bu.budgetRevenue / 3), receitaActual: 0, ebitdaBudget: Math.round(_budg.budgEbitda / 3), ebitdaActual: 0 },
  { month: "Mai/26", receitaBudget: Math.round(_bu.budgetRevenue / 3), receitaActual: 0, ebitdaBudget: Math.round(_budg.budgEbitda / 3), ebitdaActual: 0 },
  { month: "Jun/26", receitaBudget: Math.round(_bu.budgetRevenue / 3), receitaActual: 0, ebitdaBudget: Math.round(_budg.budgEbitda / 3), ebitdaActual: 0 },
];

// ─── Camada 3 — Histórico de MRR ─────────────────────────────────────────────
//
// Mar/26 = JACQES_CURRENT_MRR (derivado da carteira) = 2_323_000.
// CORREÇÃO: unit-economics/page.tsx tinha Mar/26=2_143_000 divergindo da carteira real.
// Ajuste: expansionMrr Mar/26 inclui upsells (+180K) para fechar a conta com a carteira.

export interface MRRHistoryPoint {
  month:        string;
  mrr:          number;
  newMrr:       number;
  churnMrr:     number;
  expansionMrr: number;
}

export const JACQES_MRR_HISTORY: MRRHistoryPoint[] = [
  { month: "Out/25", mrr: 1_480_000,          newMrr: 195_000, churnMrr: 48_000, expansionMrr:  62_000 },
  { month: "Nov/25", mrr: 1_689_000,          newMrr: 230_000, churnMrr: 21_000, expansionMrr:       0 },
  { month: "Dez/25", mrr: 1_710_000,          newMrr:       0, churnMrr:      0, expansionMrr:  21_000 },
  { month: "Jan/26", mrr: 1_820_000,          newMrr: 175_000, churnMrr: 65_000, expansionMrr:       0 },
  { month: "Fev/26", mrr: 1_930_000,          newMrr: 175_000, churnMrr: 65_000, expansionMrr:       0 },
  { month: "Mar/26", mrr: JACQES_CURRENT_MRR, newMrr: 260_000, churnMrr: 47_000, expansionMrr: 180_000 },
  // MRR Mar/26 = 2_323_000 — derivado da carteira JACQES_CUSTOMERS (fonte canônica)
];

// ─── Camada 3 — Unit economics ────────────────────────────────────────────────
//
// CAC = 48_000 (inclui marketing, comercial, onboarding — estimativa operacional)
// LTV = JACQES_AVG_LTV (derivado da carteira = 1_942_700)
// LTV/CAC derivado = 40.5× (CORREÇÃO: unit-economics tinha 36.3× com LTV hardcoded 1,742K)
// Payback = 3.8m (estimativa operacional)

export const JACQES_CAC            = 48_000;
export const JACQES_PAYBACK_MONTHS  = 3.8;
export const JACQES_LTV_CAC        = Math.round((JACQES_AVG_LTV / JACQES_CAC) * 10) / 10;

export const JACQES_COHORT_DATA = [
  { cohort: "Q1/2023", clientes: 3, retencao12m: 100, retencao24m: 100, ltvMedio: 5_040_000 },
  { cohort: "Q2/2023", clientes: 2, retencao12m: 100, retencao24m: 100, ltvMedio: 3_910_000 },
  { cohort: "Q3/2023", clientes: 1, retencao12m: 100, retencao24m: 100, ltvMedio: 4_200_000 },
  { cohort: "Q4/2023", clientes: 1, retencao12m: 100, retencao24m:  75, ltvMedio: 2_100_000 },
  { cohort: "Q1/2024", clientes: 2, retencao12m: 100, retencao24m:   0, ltvMedio: 1_060_000 },
  { cohort: "Q2/2024", clientes: 1, retencao12m: 100, retencao24m:   0, ltvMedio:   800_000 },
  { cohort: "Q3/2024", clientes: 1, retencao12m:  50, retencao24m:   0, ltvMedio:   145_000 },
  { cohort: "Q1/2025", clientes: 2, retencao12m: 100, retencao24m:   0, ltvMedio:   696_000 },
];

// ─── Camada 3 — Linhas DRE (para financial/page.tsx) ─────────────────────────
//
// Move as linhas de dreData do inline da página para cá.
// Valores derivados de JACQES_PL — zero hardcode em page.tsx.

export const JACQES_DRE_ROWS = [
  { label: "Receita Bruta de Serviços",  value:  JACQES_PL.revenueBruta,   indent: 0, bold: false, type: "revenue"   as const },
  { label: "(-) Deduções e Impostos",    value: -JACQES_PL.deducoes,       indent: 1, bold: false, type: "deduction" as const },
  { label: "= Receita Líquida",          value:  JACQES_PL.receitaLiquida, indent: 0, bold: true,  type: "subtotal"  as const },
  { label: "(-) Custo dos Serviços",     value: -JACQES_PL.cogs,           indent: 1, bold: false, type: "cost"      as const },
  { label: "= Lucro Bruto",             value:  JACQES_PL.lucrobruto,     indent: 0, bold: true,  type: "subtotal"  as const },
  { label: "(-) Desp. Comerciais",       value: -JACQES_PL.despCom,        indent: 1, bold: false, type: "expense"   as const },
  { label: "(-) Desp. Administrativas", value: -JACQES_PL.despAdm,        indent: 1, bold: false, type: "expense"   as const },
  { label: "(-) Desp. com Pessoal",      value: -JACQES_PL.despPessoal,    indent: 1, bold: false, type: "expense"   as const },
  { label: "= EBITDA",                   value:  JACQES_PL.ebitda,         indent: 0, bold: true,  type: "ebitda"    as const },
  { label: "(-) Depreciação e Amort.",   value: -JACQES_PL.da,             indent: 1, bold: false, type: "expense"   as const },
  { label: "= EBIT",                     value:  JACQES_PL.ebit,           indent: 0, bold: true,  type: "subtotal"  as const },
  { label: "(+/-) Resultado Financeiro", value:  JACQES_PL.resultadoFin,   indent: 1, bold: false, type: "expense"   as const },
  { label: "= Resultado Antes do IR",    value:  JACQES_PL.antesIr,        indent: 0, bold: true,  type: "subtotal"  as const },
  { label: "(-) IR e CSLL",             value: -JACQES_PL.ir,             indent: 1, bold: false, type: "expense"   as const },
  { label: "= Lucro Líquido",           value:  JACQES_PL.netIncome,       indent: 0, bold: true,  type: "net"       as const },
];

// ─── Camada 3 — Revenue summary (para revenue/page.tsx) ──────────────────────
//
// CORREÇÃO: revenue/page.tsx tinha summaryStats inline com:
//   profit = "R$3.24M" — valor que não corresponde a nenhuma linha do P&L canônico.
//   expenses = "R$1.58M" — idem.
// FONTE CORRETA: derivado de JACQES_PL.

export const JACQES_REVENUE_SUMMARY = {
  revenue:        JACQES_PL.revenueBruta,                              // 4_820_000
  grossProfit:    JACQES_PL.grossProfitSimple,                         // 2_892_000
  cogs:           JACQES_PL.revenueBruta - JACQES_PL.grossProfitSimple, // 1_928_000
  avgMonthlyRev:  Math.round(JACQES_PL.revenueBruta / 3),             // 1_606_667
  grossMarginPct: 60.0,
} as const;

// ─── Camada 3 — Budget lines (para budget/page.tsx) ───────────────────────────
//
// CORREÇÃO: budget/page.tsx tinha yearBudget.receita = 15_600_000 (full year)
//   que implica Q1 budget = 3_900_000 — divergindo de awq-group-data.budgetRevenue = 4_440_000.
// FONTE CORRETA: annualRevenue = budgetRevenue × 4 = 17_760_000 (anualizado do Q1).
//
// Usa P&L simplificado (sem separação de deduções):
//   lucrobruto = grossProfitSimple (60% × revenueBruta)
//   cogs = revenueBruta - grossProfitSimple

const _annualForecastRev  = Math.round(JACQES_BUDGET.annualRevenue * 1.04);
const _annualForecastGP   = Math.round(_annualForecastRev * 0.60);
const _annualForecastEBIT = Math.round(JACQES_BUDGET.annualEbitda * 1.08);

export const JACQES_BUDGET_LINES = [
  {
    category:   "Receita de Serviços",
    budgetAno:  JACQES_BUDGET.annualRevenue,
    actualYtd:  JACQES_PL.revenueBruta,
    budgetYtd:  JACQES_BUDGET.ytdRevenue,
    forecast:   _annualForecastRev,
    type:       "revenue" as const,
  },
  {
    category:   "Custo dos Serviços (COGS)",
    budgetAno:  JACQES_BUDGET.annualRevenue - JACQES_BUDGET.annualGrossProfit,
    actualYtd:  JACQES_PL.revenueBruta - JACQES_PL.grossProfitSimple,
    budgetYtd:  JACQES_BUDGET.ytdRevenue - JACQES_BUDGET.ytdGrossProfit,
    forecast:   _annualForecastRev - _annualForecastGP,
    type:       "cost" as const,
  },
  {
    category:   "Lucro Bruto",
    budgetAno:  JACQES_BUDGET.annualGrossProfit,
    actualYtd:  JACQES_PL.grossProfitSimple,
    budgetYtd:  JACQES_BUDGET.ytdGrossProfit,
    forecast:   _annualForecastGP,
    type:       "subtotal" as const,
  },
  {
    category:   "OpEx Total",
    budgetAno:  JACQES_BUDGET.annualGrossProfit - JACQES_BUDGET.annualEbitda,
    actualYtd:  JACQES_PL.opex,
    budgetYtd:  JACQES_BUDGET.ytdGrossProfit - JACQES_BUDGET.ytdEbitda,
    forecast:   _annualForecastGP - _annualForecastEBIT,
    type:       "cost" as const,
  },
  {
    category:   "EBITDA",
    budgetAno:  JACQES_BUDGET.annualEbitda,
    actualYtd:  JACQES_PL.ebitda,
    budgetYtd:  JACQES_BUDGET.ytdEbitda,
    forecast:   _annualForecastEBIT,
    type:       "ebitda" as const,
  },
  {
    category:   "Lucro Líquido",
    budgetAno:  JACQES_BUDGET.annualNetIncome,
    actualYtd:  JACQES_PL.netIncome,
    budgetYtd:  JACQES_BUDGET.ytdNetIncome,
    forecast:   Math.round(JACQES_BUDGET.annualNetIncome * 1.06),
    type:       "net" as const,
  },
];
