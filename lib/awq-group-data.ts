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

// Economic type determines how the BU is treated in consolidation and page display.
//   operational        — standard P&L BU (revenue, EBITDA, ROIC are meaningful)
//   hybrid_investment  — has operational fee revenue AND patrimonial/investment component
//   pre_revenue        — strategic layer with no operating revenue yet
export type BuEconomicType = "operational" | "hybrid_investment" | "pre_revenue";

export interface BuData {
  id:               string;
  name:             string;
  sub:              string;
  color:            string;       // Tailwind bg color
  accentColor:      string;       // Tailwind text color
  status:           "Ativo" | "Em breve" | "Em construção";
  economicType:     BuEconomicType;
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

// ─── Venture contract data ──────────────────────────────────────────────────
//
// ENERDY — confirmed recurring advisory/incubation fee.
// Source: user-provided evidence (contract).
//   fee mensal: R$2.000,00
//   duração: 36 meses
//   valor contratual bruto: R$72.000,00
//   ARR: R$24.000,00
//
// This is OPERATING revenue for the Venture (hybrid BU),
// separate from the patrimonial/investment position.

export interface VentureContract {
  counterparty:     string;
  monthlyFee:       number;
  durationMonths:   number;
  totalContractValue: number;
  arr:              number;
  startDate:        string | null;
  status:           "active" | "pending" | "completed";
  note:             string;
}

export const ventureContracts: VentureContract[] = [
  {
    counterparty:       "ENERDY",
    monthlyFee:         2_000.00,
    durationMonths:     36,
    totalContractValue: 72_000.00,
    arr:                24_000.00,
    startDate:          null,        // exact start date not yet provided
    status:             "active",
    note:               "Fee recorrente de advisory/incubação. Confirmed by user. Único contrato operacional confirmado da Venture.",
  },
];

export const ventureFeeMRR = ventureContracts
  .filter((c) => c.status === "active")
  .reduce((s, c) => s + c.monthlyFee, 0);

export const ventureFeeARR = ventureFeeMRR * 12;

export const ventureContractValueRemaining = ventureContracts
  .filter((c) => c.status === "active")
  .reduce((s, c) => s + c.totalContractValue, 0);  // approximate — no start date to prorate

// ─── JACQES MRR confirmado — Notion CRM Abr/2026 ─────────────────────────────
// Jan/Fev/Mar: 3 clientes (CEM R$3.200 + Carol R$1.790 + André R$1.500) = R$6.490/mês
// Abr:        4 clientes (+ Tati Simões R$1.790, entrou no início de Abr, já paga) = R$8.280/mês
export const JACQES_MRR_Q1  = 6_490;  // Jan/Fev/Mar — sem Tati
export const JACQES_MRR     = 8_280;  // Abr em diante — com Tati

export const buData: BuData[] = [
  {
    // SOURCE: Notion CRM — receita confirmada por mês
    //   Jan+Fev+Mar: JACQES_MRR_Q1 × 3 = 6.490 × 3 = 19.470
    //   Abr:         JACQES_MRR = 8.280 (Tati Simões entrou, já pagou)
    //   Total YTD (Jan–Abr): 27.750
    id:               "jacqes",
    name:             "JACQES",
    sub:              "Agência · AWQ Group",
    color:            "bg-brand-600",
    accentColor:      "text-brand-400",
    status:           "Ativo",
    economicType:     "operational",
    revenue:          27_750,  // YTD Jan–Abr: 6.490×3 + 8.280 = 27.750
    grossProfit:      0,       // aguardando confirmação contábil
    ebitda:           0,       // aguardando confirmação contábil
    netIncome:        0,       // aguardando confirmação contábil
    cashGenerated:    0,
    cashBalance:      0,
    customers:        4,       // Notion CRM: CEM, Carol Bertolini, André Vieira, Tati Simões
    ftes:             0,
    capitalAllocated: 0,
    roic:             0,
    budgetRevenue:    0,
    hrefOverview:     "/jacqes",
    hrefFinancial:    "/jacqes/fpa",
    hrefCustomers:    "/jacqes/fpa",
    hrefUnitEcon:     "/jacqes/fpa",
    hrefBudget:       "/jacqes/fpa",
  },
  {
    // ⚠  CORRECTED 2026-04-15 — all previous Caza P&L and cash values were fabricated.
    //
    // PREVIOUS (invented planning data — no empirical basis):
    //   revenue:2,418,000 · grossProfit:1,730,000 · ebitda:653,000 · netIncome:420,000
    //   cashGenerated:580,000 · cashBalance:920,000 · capitalAllocated:1,200,000
    //   customers:8 · budgetRevenue:2,148,000 · roic:35.0%
    //   Monthly (fabricated): Jan=712K · Fev=798K · Mar=908K
    //
    // SOURCE OF CORRECTION: public/data/caza-financial.json + public/data/caza-stats.json
    //   Origin: Notion (project management / invoice tracking). Confirmed via API route.
    //   Caza Vision is project-based; revenue recognized per project delivery.
    //
    // REAL REVENUE — confirmed from Notion (caza-financial.json / caza-stats.json):
    //   Jan/26: R$0          (no projects closed)
    //   Fev/26: R$12.400     (confirmed)
    //   Mar/26: R$33.900     (confirmed)
    //   Abr/26: R$27.900     (confirmed — caza-stats.json revenueData)
    //   YTD Jan–Abr 2026: R$74.200
    //   All-time (Apr/25–Mai/26): R$115.000
    //
    // EXPENSES: not tracked in Notion. grossProfit / ebitda / netIncome = 0
    //   until cost data is entered. ROIC = 0.
    // CASH BALANCE: Caza Itaú account statements NOT yet ingested → 0.
    // CAPITAL ALLOCATED: unverified without Itaú statement → 0.
    // CUSTOMERS: 6 confirmed active clients (caza-stats.json: clientes_ativos=6).
    // BUDGET: old budget (2,148,000) was based on fabricated scale → 0 until reset.
    id:               "caza",
    name:             "Caza Vision",
    sub:              "Produtora · AWQ Group",
    color:            "bg-emerald-600",
    accentColor:      "text-emerald-400",
    status:           "Ativo",
    economicType:     "operational",
    revenue:          74_200,    // YTD Jan–Abr: 0+12,400+33,900+27,900 — source: Notion
    grossProfit:      0,         // expenses not tracked in Notion yet
    ebitda:           0,         // idem
    netIncome:        0,         // idem
    cashGenerated:    0,         // awaiting Itaú statement ingestion
    cashBalance:      0,         // awaiting Itaú statement ingestion
    customers:        6,         // confirmed active clients — caza-stats.json
    ftes:             15,        // no contradicting evidence
    capitalAllocated: 0,         // unverified without Itaú statement
    roic:             0,         // netIncome=0
    budgetRevenue:    0,         // old budget was based on fabricated scale
    hrefOverview:     "/caza-vision",
    hrefFinancial:    "/caza-vision/financial",
    hrefCustomers:    "/caza-vision/clientes",
    hrefUnitEcon:     "/caza-vision/unit-economics",
    hrefBudget:       "/caza-vision",
  },
  {
    // ⚠  CORRECTED 2026-04-08 — Advisor has NO confirmed operating revenue.
    //    Previous values (R$1.57M revenue, R$479K net income, 30 customers, 59.9% ROIC)
    //    were unverified planning data with no empirical backing.
    //
    //    ECONOMIC TYPE: pre_revenue
    //    Advisor is a strategic layer / incubation entity. It does not generate
    //    operating revenue at this time. It must NOT appear in consolidated P&L
    //    as if it had revenue, EBITDA, or ROIC.
    //
    //    CLIENTES: 1 cliente ativo cadastrado (AVVA — desde 2026-04-14).
    //    Fonte: public/data/advisor-clients.json + advisor_clients (Neon Postgres).
    id:               "advisor",
    name:             "Advisor",
    sub:              "Consultoria · AWQ Group",
    color:            "bg-violet-600",
    accentColor:      "text-violet-400",
    status:           "Ativo",
    economicType:     "pre_revenue",
    revenue:          0,
    grossProfit:      0,
    ebitda:           0,
    netIncome:        0,
    cashGenerated:    0,
    cashBalance:      0,
    customers:        1,
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
    economicType:     "hybrid_investment",
    revenue:          0,               // operating fee revenue tracked via ventureContracts / ventureFeeMRR
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

// ─── AWQ Holding own cash (not allocated to any BU) ─────────────────────────
// SOURCE: PR #10 — caixa da holding confirmado empiricamente
export const holdingCash = 25_000;

// ─── Operating BUs only (exclude Venture for P&L aggregation) ─────────────────
export const operatingBus = buData.filter((b) => b.id !== "venture");

// ─── Consolidated operating P&L ───────────────────────────────────────────────
export const consolidated = {
  revenue:          operatingBus.reduce((s, b) => s + b.revenue,          0),
  grossProfit:      operatingBus.reduce((s, b) => s + b.grossProfit,      0),
  ebitda:           operatingBus.reduce((s, b) => s + b.ebitda,           0),
  netIncome:        operatingBus.reduce((s, b) => s + b.netIncome,        0),
  cashGenerated:    operatingBus.reduce((s, b) => s + b.cashGenerated,    0),
  cashBalance:      buData.reduce      ((s, b) => s + b.cashBalance,      0) + holdingCash, // all BUs + holding
  customers:        operatingBus.reduce((s, b) => s + b.customers,        0),
  ftes:             operatingBus.reduce((s, b) => s + b.ftes,             0),
  capitalAllocated: buData.reduce      ((s, b) => s + b.capitalAllocated, 0),
  budgetRevenue:    operatingBus.reduce((s, b) => s + b.budgetRevenue,    0),
};

// Guards: after Caza correction, consolidated values may be zero; avoid NaN/Infinity.
export const consolidatedMargins = {
  grossMargin:  consolidated.revenue > 0 ? consolidated.grossProfit / consolidated.revenue : 0,
  ebitdaMargin: consolidated.revenue > 0 ? consolidated.ebitda      / consolidated.revenue : 0,
  netMargin:    consolidated.revenue > 0 ? consolidated.netIncome   / consolidated.revenue : 0,
};

export const consolidatedRoic =
  consolidated.capitalAllocated > 0
    ? (consolidated.netIncome / consolidated.capitalAllocated) * 100
    : 0;

// Guard: budgetRevenue may be 0 after zeroing stale Caza budget.
export const budgetVsActual =
  consolidated.budgetRevenue > 0
    ? ((consolidated.revenue - consolidated.budgetRevenue) / consolidated.budgetRevenue) * 100
    : 0;

// ─── Monthly consolidated revenue (Jan–Mar 2026 per BU) ──────────────────────
export interface MonthlyPoint {
  month:        string;
  jacqes:       number;
  caza:         number;
  advisor:      number;
  total:        number;
  /** true = período não fechado (estimativa); false/undefined = realizado */
  is_forecast?: boolean;
}

// ⚠  CORRECTED 2026-04-08 — Advisor is pre_revenue (revenue = 0). Previous entries
// showed advisor R$508K / R$528K / R$536K / month (total R$1.572M) which contradicted
// buData.advisor.revenue = 0. Zeroed here. total = jacqes + caza only.
//
// ⚠  CORRECTED 2026-04-15 — Caza monthly values replaced with REAL project revenue
// from Notion (caza-financial.json / caza-stats.json). Previous values were fabricated:
//   OLD: Jan=712.000 · Fev=798.000 · Mar=908.000 (INVENTED planning data, 52× real scale)
//   NEW: Jan=0 · Fev=12.400 · Mar=33.900 · Abr=27.900 (confirmed from Notion)
//
// Jan/Fev/Mar: JACQES_MRR_Q1 = 6.490 (3 clientes, sem Tati)
// Abr: JACQES_MRR = 8.280 (Tati entrou início Abr, já paga — confirmed)
// Caza Abr/26: R$27.900 confirmed from Notion (caza-stats.json revenueData)
type MonthlyRaw = Omit<MonthlyPoint, "total">;
const _monthlyRaw: MonthlyRaw[] = [
  { month: "Jan/26", jacqes: JACQES_MRR_Q1, caza:       0, advisor: 0 },  // Caza: no project closed Jan
  { month: "Fev/26", jacqes: JACQES_MRR_Q1, caza:  12_400, advisor: 0 },  // Caza: confirmed Notion
  { month: "Mar/26", jacqes: JACQES_MRR_Q1, caza:  33_900, advisor: 0 },  // Caza: confirmed Notion
  { month: "Abr/26", jacqes: JACQES_MRR,    caza:  27_900, advisor: 0 },  // Both confirmed — no is_forecast
];

export const monthlyRevenue: MonthlyPoint[] = _monthlyRaw.map(m => ({
  ...m,
  total: m.jacqes + m.caza + m.advisor,  // computed — no drift possible
}));

// ── Derived risk metrics — computed from buData to prevent hardcode drift ─────
//
// RULE: never hardcode BU revenue percentages. If buData changes, these auto-update.
const _operationalBUs = buData.filter(
  (b) => b.economicType === "operational" && b.revenue > 0
);
const _operationalRevTotal = _operationalBUs.reduce((s, b) => s + b.revenue, 0);
// Identify the highest-concentration BU dynamically.
// After 2026-04-15 correction: Caza=74,200 (73%) > JACQES=27,750 (27%).
const _highestRevBU = _operationalBUs.length > 0
  ? _operationalBUs.reduce((max, b) => b.revenue > max.revenue ? b : max)
  : null;
const _highestRevPct = _highestRevBU && _operationalRevTotal > 0
  ? Math.round((_highestRevBU.revenue / _operationalRevTotal) * 100)
  : 0;

// BU dependency risk details — computed from buData, never hardcoded
export const buDependencyDetails: RiskCategoryDetail[] = _operationalBUs.map((b) => ({
  label: b.name,
  share: Math.round((b.revenue / _operationalRevTotal) * 100),
  mrr:   b.revenue,
  risk:  (b.revenue / _operationalRevTotal) > 0.50 ? "Atenção" : "OK",
}));

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
    // ⚠  CORRECTED 2026-04-15 — After Caza revenue correction (74,200 vs JACQES 27,750),
    //    Caza Vision is now the highest-concentration BU at ~73%.
    //    Previously JACQES was incorrectly identified as high-concentration because
    //    Caza was inflated 52× (2,418,000 fabricated). Severity now derived dynamically.
    id: "R2",
    title:       "Concentração de BU — Receita",
    description: _highestRevBU
      ? `${_highestRevBU.name} representa ${_highestRevPct}% da receita operacional do grupo.`
      : "Nenhuma BU com receita operacional confirmada.",
    severity:    _highestRevPct > 50 ? "high" : _highestRevPct > 30 ? "medium" : "low",
    bu:          "AWQ Group",
    metric:      _highestRevBU ? `${_highestRevBU.name} share: ${_highestRevPct}%` : "—",
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
    id: "R5",
    title:       "Posição Investida — AWQ Venture",
    description: "CDB DI R$15.762,62 (única posição confirmada). Venture fee ENERDY: R$2K/mês ativo.",
    severity:    "low",
    bu:          "AWQ Venture",
    metric:      "CDB DI: R$15.762,62",
    threshold:   "Posição empírica — print 02/04/2026",
  },
  {
    // ⚠  CORRECTED 2026-04-11 — previous entry referenced "André Teixeira (R$6.2M AUM, NPS 68)",
    // a fictitious client that survived the 2026-04-08 Advisor correction.
    // Advisor economicType = "pre_revenue" with customers = 0 and revenue = 0.
    // The AUM, NPS, and client name were unverified planning data with no empirical backing.
    id: "R6",
    title:       "Advisor — Em Construção (Pré-Receita)",
    description: "Advisor é uma camada estratégica em construção. Nenhum cliente operacional confirmado. Revenue = R$0, AUM = R$0. Sem meta de receita até primeiro contrato.",
    severity:    "low",
    bu:          "Advisor",
    metric:      "Clientes: 0 · Revenue: R$0",
    threshold:   "economicType: pre_revenue",
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

// ⚠  CORRECTED 2026-04-15 (final v2) — Abr–Dez removidos. Somente Jan–Mar permanecem.
//
// REGRA: realizado só pode vir de financial-query.ts (transações conciliadas).
// monthlyRevenue (e toda a camada de planejamento) é snapshot criado manualmente —
// NÃO é dado real. Usar monthlyRevenue como `actual` viola a regra canônica.
//
// HISTÓRICO DE CORREÇÕES:
//   2026-04-08: Subtrai Advisor (~508K/mês). Resultado ainda errado (Caza em escala antiga).
//   2026-04-15a: Deriva actuals de monthlyRevenue. Mas monthlyRevenue também é snapshot.
//   2026-04-15b: Remove `actual` completamente.
//   2026-04-15c (este): Remove Abr–Dez. Aquelas projeções (3.6M–5.1M/mês) não têm:
//     - base histórica documentada (run rate real é 718K–914K/mês)
//     - metodologia de crescimento
//     - premissas explícitas
//     - regime declarado
//     - confidence_status
//     Mantivê-las como "forecast" viola o contrato de dados. REMOVIDAS.
//
// CRITÉRIO PARA RE-INTRODUZIR projeções futuras:
//   Modelo de forecast deve declarar: base histórica, período, premissas, método,
//   fonte, regime, confidence_status, última atualização.
//   Enquanto não houver, o frontend exibe estado vazio honesto (Option C).
//
// Somente Jan–Mar permanecem — são referências de snapshot de planejamento,
// não forecasts. base=bull=bear (sem modelo de cenários rodado).
export const revenueForecasts: ForecastPoint[] = [
  // Jan–Mar: referência snapshot — monthlyRevenue é planejamento, não extrato bancário
  // base=bull=bear porque nenhum modelo de cenários foi rodado para este período
  {
    month: "Jan/26",
    base: monthlyRevenue[0].total,
    bull: monthlyRevenue[0].total,
    bear: monthlyRevenue[0].total,
  },
  {
    month: "Fev/26",
    base: monthlyRevenue[1].total,
    bull: monthlyRevenue[1].total,
    bear: monthlyRevenue[1].total,
  },
  {
    month: "Mar/26",
    base: monthlyRevenue[2].total,
    bull: monthlyRevenue[2].total,
    bear: monthlyRevenue[2].total,
  },
  // Abr–Dez: REMOVIDOS 2026-04-15c — sem base histórica, sem metodologia, sem premissas.
  // Discrepância comprovada: run rate atual ~800K/mês vs projeção 3.6M–5.1M/mês (4–6× inflado).
  // Serão re-adicionados quando um modelo de forecast documentado for construído.
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

// ⚠ venture column must be 0 for all operating cash flow lines.
// AWQ Venture is an investment vehicle with no operating revenue, no P&L, no capex.
// Empirical position (CDB DI R$15.762,62) is tracked in holdingTreasurySnapshot /
// buildCanonicalInvestmentPosition — NOT in operating cash flow rows.
//
// ⚠  CORRECTED 2026-04-08 — Advisor column zeroed (was non-zero: R$479K net income,
// R$510K FCO, R$498K FCF). Advisor is pre_revenue (economicType) with netIncome=0
// and cashGenerated=0 in buData. Cash flow rows must be consistent with buData.
// ⚠  ZEROED 2026-04-15 — cashFlowRows values were never empirically verified.
//
// JACQES (previously 518K lucro / 720K FCO / 672K FCF):
//   These were old planning data from when JACQES had revenue=4.82M.
//   After correction: buData.jacqes.netIncome=0, cashGenerated=0.
//   cashFlowRows must be consistent with buData. Zeroed.
//
// CAZA (previously 420K lucro / 580K FCO / 548K FCF):
//   These were based on fabricated revenue=2,418,000. After correction:
//   buData.caza.netIncome=0 (expenses not tracked in Notion), cashGenerated=0.
//   Caza Itaú account not yet ingested. Zeroed.
//
// NOTE: cashFlowRows is not currently consumed by any live page.
// /awq/cashflow uses financial-query.ts (real pipeline) — not these rows.
// Kept for future use; must be re-populated from real data when available.
export const cashFlowRows: CashFlowRow[] = [
  { label: "Lucro Líquido",              jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 1, bold: false },
  { label: "(+) D&A",                    jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 1, bold: false },
  { label: "(+/-) Cap. de Giro",         jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 1, bold: false },
  { label: "= FCO (Caixa Operacional)",  jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 0, bold: true  },
  { label: "(-) Capex",                  jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 1, bold: false },
  { label: "(-) Novos Investimentos",    jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 1, bold: false },
  { label: "= FCO Livre (FCF)",          jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 0, bold: true  },
  { label: "(-) Distribuições/Divid.",   jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 1, bold: false },
  { label: "= Var. de Caixa",            jacqes: 0, caza: 0, advisor: 0, venture: 0, indent: 0, bold: true  },
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

// ⚠  Advisor removed — pre_revenue BU has no budget targets.
//
// ⚠  ZEROED 2026-04-15 — all budget targets were based on fabricated revenue scales.
//
// JACQES: targets (2.664M grossProfit / 976K EBITDA / 489K netIncome) assumed
//   revenue ≈ 4.82M. Real confirmed YTD revenue = R$27,750. Targets meaningless.
//
// CAZA: targets (1.546M grossProfit / 515K EBITDA / 386K netIncome) assumed
//   revenue ≈ 2.418M. Real confirmed YTD revenue = R$74,200. Targets meaningless.
//
// Re-populate when real budget planning is done against confirmed revenue scale.
export const buBudgetTargets: Record<string, BuBudgetTargets> = {
  jacqes:  { budgGrossProfit: 0, budgEbitda: 0, budgNetIncome: 0, budgCash: 0 },
  caza:    { budgGrossProfit: 0, budgEbitda: 0, budgNetIncome: 0, budgCash: 0 },
};

// ─── Expense category budgets (consolidated AWQ Group) ────────────────────────

export interface CategoryBudgetItem {
  category: string;
  budget:   number;
  actual:   number;
  bu:       string;
}

export const categoryBudget: CategoryBudgetItem[] = [
  // Dados de budget por categoria devem ser inseridos via pipeline verificável.
  // Nenhum valor fictício é aceito aqui.
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

// ⚠  CLEARED 2026-04-15 — historical forecast accuracy data was invalid and has been removed.
//
// WHY CLEARED:
//   Historical forecasts (Jan: 2.084K / Fev: 2.361K / Mar: 2.752K) were issued when
//   the business model assumed Caza Vision generating ~1.7M/month. Current corrected
//   actuals (718K / 804K / 914K from monthlyRevenue) reflect a different Caza scale (~800K/month).
//   Comparing the old forecasts to the new actuals produces ~-65% errors that measure the
//   MODEL CORRECTION, not forecasting quality. Displaying this as "Forecast Accuracy" is
//   misleading and has been removed.
//
// RE-POPULATION CRITERIA:
//   - New forecasts must be issued based on the CURRENT data model (monthlyRevenue scale)
//   - Actual values must come from financial-query.ts (real bank transactions) — NOT snapshot
//   - Until then, forecastAccuracyHistory remains empty and UI shows empty state
export const forecastAccuracyHistory: ForecastAccuracyPoint[] = [];

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

// ⚠  CLEARED 2026-04-15c — fullYearBase/Bull/Bear projections removed.
//
// WHY CLEARED:
//   JACQES: annualized run rate = 83.250/ano (MRR 6.490 × 12).
//           fullYearBase was 19.800.000 — 238× the actual run rate. No methodology.
//   Caza:   annualized run rate ≈ 7.254.000/ano (monthlyRevenue ~804K × 9 remaining months).
//           fullYearBase was 12.100.000 — 67% premium with no documented basis.
//   growth: "+12.4%/+28.3% vs 2025" — no verifiable 2025 baseline in the data store.
//
// A forecast scenario MUST declare:
//   - base histórica (período e fonte verificável)
//   - metodologia de crescimento
//   - premissas explícitas
//   - regime (cash vs accrual)
//   - confidence_status
//   - última atualização
// None of the removed values met these criteria. Displaying them as "forecast" was dishonest.
//
// RE-POPULATION CRITERIA:
//   When a documented forecast model is built with real historical baseline,
//   re-add entries here with all required metadata fields.
export const buForecastScenarios: BuForecastScenario[] = [];
// CLEARED — see comment above. UI shows honest empty state (Option C).

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
    // ⚠  CORRECTED 2026-04-11 — previous entries showed Ambev (R$420K), Samsung (R$350K),
    // Natura (R$310K) as JACQES clients. These are FICTITIOUS — JACQES has 4 confirmed clients
    // from Notion CRM (Apr/2026): CEM R$3.200, Carol Bertolini R$1.790, André Vieira R$1.500,
    // Tati Simões R$1.790. Total MRR = R$8.280. Concentration updated to reflect real state.
    //
    // Real shares (of MRR R$8.280):
    //   CEM:             3.200 / 8.280 = 38.6%  →  share: 39
    //   Tati Simões:     1.790 / 8.280 = 21.6%  →  share: 22
    //   Carol Bertolini: 1.790 / 8.280 = 21.6%  →  share: 22
    //   André Vieira:    1.500 / 8.280 = 18.1%  →  share: 18
    //   Top-3 (CEM+Tati+Carol): 39+22+22 = 83% — concentration is CRITICAL (threshold 40%)
    id: "concentration",
    title:     "Concentração de Cliente — JACQES",
    iconKey:   "users",
    colorKey:  "red",
    severity:  "high",
    details: [
      { label: "CEM",                             share: 39, mrr: 3_200, risk: "Crítico"  },
      { label: "Tati Simões",                     share: 22, mrr: 1_790, risk: "Alto"     },
      { label: "Carol Bertolini",                 share: 22, mrr: 1_790, risk: "Alto"     },
      { label: "André Vieira",                    share: 18, mrr: 1_500, risk: "Médio"    },
      { label: "CEM + Tati + Carol (top-3)",      share: 83, mrr: 6_780, risk: "Crítico", isTotal: true },
    ],
    threshold: "Limite: nenhum cliente > 30%; top-3 ≤ 40%",
    current:   "Top-3 = 83% do MRR JACQES · 1 cliente (CEM) = 39%",
    action:    "Prioridade máxima: diversificar carteira JACQES — adicionar 3+ novos clientes em Q2/Q3",
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
      // ⚠  CORRECTED 2026-04-11 — "Banco XP Advisory" (R$42K) removido.
      //    Advisor é pre_revenue com customers=0. Recebível era dado fictício pré-2026-04-08.
      //    Total corrigido de R$507K → R$465K.
    ],
    threshold: "Limite: total ≤ R$200K",
    current:   "Total em aberto: R$465K",
    action:    "Cobrança ativa Banco XP (CV002) — prazo expirado",
  },
  {
    // ⚠  CORRECTED 2026-04-08 — details now computed from buDependencyDetails (derived from buData).
    // ⚠  CORRECTED 2026-04-15 — after Caza revenue fix, highest BU is now Caza (~73%).
    //    _jacqesRevPct removed; use _highestRevPct (dynamic) throughout.
    id: "buDependency",
    title:    "Dependência de BU Única",
    iconKey:  "building",
    colorKey: _highestRevPct > 50 ? "red" : "amber",
    severity: _highestRevPct > 50 ? "high" : "medium",
    details:  buDependencyDetails,
    threshold: "Limite: nenhuma BU > 50%",
    current:   _highestRevBU ? `${_highestRevBU.name} = ${_highestRevPct}% da receita` : "—",
    action:    "Distribuir receita entre BUs para reduzir dependência. JACQES: crescer carteira. Caza: diversificar clientes.",
  },
  {
    // ⚠  SNAPSHOT — EBITDA ainda não confirmado contabilmente para JACQES.
    // buData.jacqes.ebitda = 0 (aguardando confirmação contábil).
    // Os valores abaixo são estimativas de planejamento (não "realizado" empírico).
    // CORRECTED 2026-04-11: "EBITDA Realizado" renomeado para "EBITDA Estimado" para
    // evitar confusão entre dado confirmado e projeção planejamento.
    id: "marginCompression",
    title:    "Margem JACQES — Pendente Confirmação",
    iconKey:  "trending-down",
    colorKey: "amber",
    severity: "medium",
    details: [
      { label: "Meta EBITDA 2026",              share: 22, mrr: 0, risk: "Meta"         },
      { label: "EBITDA Estimado (planejamento)", share: 18, mrr: 0, risk: "Estimado"     },
      { label: "Gap estimado",                  share: -4, mrr: 0, risk: "4pp (estim.)" },
    ],
    threshold: "Meta: EBITDA ≥ 22%",
    current:   "EBITDA pendente confirmação contábil (estimado: 18%)",
    action:    "Aguardar confirmação contábil Q1/2026 para validar margem real JACQES",
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
    // ⚠  CORRECTED 2026-04-08 — Q2 numbers derived from revenueForecasts (Abr/Mai/Jun).
    // Previous: bear Q2 = R$10,020,000 / downside -13.2% — inconsistent with revenueForecasts
    //   (Apr bear 3,060K + Mai 3,080K + Jun 3,280K = 9,420,000 ≠ 10,020,000).
    // Corrected: bear = 9,420,000, downside = -2,130,000 = -18.4%.
    id: "forecastDet",
    title:    "Deterioração de Forecast",
    iconKey:  "shield-alert",
    colorKey: "amber",
    severity: "medium",   // -18.4% bear is closer to the -20% threshold
    details: [
      { label: "Cenário base Q2", share: 0, mrr: 11_550_000, risk: "Base"  },
      { label: "Cenário bear Q2", share: 0, mrr:  9_420_000, risk: "Bear"  },
      { label: "Downside máximo", share: 0, mrr: -2_130_000, risk: "-18.4%"},
    ],
    threshold: "Bear < -20% do base",
    current:   "Bear = -18.4%: próximo ao limite de alerta (-20%)",
    action:    "Monitorar de perto — diversificar receita Q2 para reduzir risco de bear",
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
