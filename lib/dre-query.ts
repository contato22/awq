// ─── AWQ DRE Gerencial — Canonical Camada 5 ──────────────────────────────────
//
// THE canonical cash-basis DRE gerencial (Demonstração de Resultado do Exercício)
// for AWQ Holding and its business units.
//
// CAMADA 5 — DRE Gerencial Canônica:
//   dreRevenue            — total receita bruta (all revenue cats, excl. intercompany)
//   dreFinancialRevenue   — receitas financeiras (rendimento_financeiro, ajuste_bancario_credito)
//   dreOperationalRevenue — receitas operacionais (receita_* cats excluding financial)
//   dreCOGS               — custo direto de serviço/produção (freelancer, fornecedor)
//   dreGrossProfit        — receita líquida − COGS
//   dreOperatingExpenses  — despesas operacionais abaixo do lucro bruto
//   dreEBITDA             — grossProfit − operatingExpenses
//   dreFinancialExpenses  — juros, multas, IOF (below EBITDA)
//   dreNetResult          — EBITDA − financialExpenses
//   categoryBreakdown     — per-category amounts for waterfall/breakdown rendering
//
// CASH-BASIS METHODOLOGY:
//   All values derived from bank transactions in financial-db.ts.
//   Revenue = credits in REVENUE_CATS (excludedFromConsolidated = false).
//   Expenses = debits in EXPENSE_CATS (excludedFromConsolidated = false).
//   Intercompany (excludedFromConsolidated = true) is ELIMINATED before any line.
//   Prolabore_retirada: treated as operating expense (below EBITDA line in gerencial).
//
// ANTI-REGRESSION RULES:
//   ✗ aplicacao_financeira → NEVER enters dreRevenue or any DRE expense line
//   ✗ resgate_financeiro   → NEVER enters dreRevenue
//   ✗ transferencia_interna_enviada/recebida → NEVER enters any DRE line
//   ✗ aporte_socio         → NEVER enters dreRevenue (capitalisation, not P&L)
//   ✗ intercompany         → ELIMINATED via excludedFromConsolidated flag
//
// DO NOT import in client components — uses Node fs via financial-db.

import {
  getAllTransactions,
  type BankTransaction,
  type ManagerialCategory,
  type EntityLayer,
} from "./financial-db";

// ─── DRE Category groupings ───────────────────────────────────────────────────

/** Operational revenue (client-facing, core business). */
const OPERATIONAL_REVENUE_CATS = new Set<ManagerialCategory>([
  "receita_recorrente",
  "receita_projeto",
  "receita_consultoria",
  "receita_producao",
  "receita_social_media",
  "receita_revenue_share",
  "receita_eventual",
]);

/** Financial / non-operating revenue (yields, bank adjustments). */
const FINANCIAL_REVENUE_CATS = new Set<ManagerialCategory>([
  "rendimento_financeiro",
  "ajuste_bancario_credito",
]);

/** All revenue categories that enter the DRE (operational + financial). */
const ALL_REVENUE_CATS = new Set<ManagerialCategory>([
  ...OPERATIONAL_REVENUE_CATS,
  ...FINANCIAL_REVENUE_CATS,
]);

/**
 * COGS — custo direto de serviço/produção.
 * Direct costs attributable to delivering client work.
 */
const COGS_CATS = new Set<ManagerialCategory>([
  "freelancer_terceiro",
  "fornecedor_operacional",
]);

/**
 * Operating expenses — below gross profit, above EBITDA.
 * These reduce EBITDA but are not direct cost of service delivery.
 */
const OPEX_CATS = new Set<ManagerialCategory>([
  "folha_remuneracao",
  "prolabore_retirada",
  "imposto_tributo",
  "tarifa_bancaria",
  "software_assinatura",
  "marketing_midia",
  "deslocamento_combustivel",
  "alimentacao_representacao",
  "viagem_hospedagem",
  "aluguel_locacao",
  "energia_agua_internet",
  "servicos_contabeis_juridicos",
  "cartao_compra_operacional",
  "despesa_pessoal_misturada",
  "despesa_ambigua",
]);

/** Financial expenses — below EBITDA. */
const FINANCIAL_EXPENSE_CATS = new Set<ManagerialCategory>([
  "juros_multa_iof",
]);

/** Categories explicitly excluded from all DRE lines (balance sheet / flow items). */
const NON_DRE_CATS = new Set<ManagerialCategory>([
  "aplicacao_financeira",
  "resgate_financeiro",
  "transferencia_interna_enviada",
  "transferencia_interna_recebida",
  "aporte_socio",
  "recebimento_ambiguo",
  "unclassified",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DreCategoryLine {
  category:      ManagerialCategory;
  label:         string;
  amount:        number;     // positive = revenue, positive = expense (shown as subtraction)
  transactionCount: number;
  confidence:    "confirmed" | "probable" | "ambiguous" | "mixed";
}

export interface DreSection {
  label:    string;
  total:    number;
  lines:    DreCategoryLine[];
}

export interface DreResult {
  // ── DRE Lines (all positive amounts) ──────────────────────────────────────

  /** (+) Receita Bruta = operational + financial revenue. */
  dreRevenue:              number;

  /** (+) Receita Operacional (client-facing revenue only). */
  dreOperationalRevenue:   number;

  /** (+) Receita Financeira (rendimentos CDB, ajustes). */
  dreFinancialRevenue:     number;

  /** (-) COGS — custo direto de serviço (freelancer, fornecedor). */
  dreCOGS:                 number;

  /** (=) Lucro Bruto = dreRevenue − dreCOGS. */
  dreGrossProfit:          number;

  /** Margem bruta % = dreGrossProfit / dreRevenue. */
  dreGrossMargin:          number | null;

  /** (-) Despesas Operacionais (folha, marketing, etc., excluding COGS and financial). */
  dreOperatingExpenses:    number;

  /** (=) EBITDA = dreGrossProfit − dreOperatingExpenses. */
  dreEBITDA:               number;

  /** Margem EBITDA % = dreEBITDA / dreRevenue. */
  dreEBITDAMargin:         number | null;

  /** (-) Despesas Financeiras (juros, multas, IOF). */
  dreFinancialExpenses:    number;

  /** (=) Resultado Líquido = dreEBITDA − dreFinancialExpenses. */
  dreNetResult:            number;

  /** Margem líquida % = dreNetResult / dreRevenue. */
  dreNetMargin:            number | null;

  // ── Excluded (below-the-line, for reconciliation display) ─────────────────

  /** Intercompany transfers eliminated (sum of both sides excluded). */
  intercompanyEliminated:  number;

  /** Aplicações financeiras (investment outflows, NOT expenses). */
  financialApplications:   number;

  /** Resgates financeiros (investment redemptions, NOT revenue). */
  financialRedemptions:    number;

  /** Partner withdrawals and pró-labore (already in dreOperatingExpenses). */
  prolaboreTotal:          number;

  // ── Category breakdowns for waterfall/detail rendering ────────────────────

  revenueSections:         DreSection;
  cogsSections:            DreSection;
  opexSections:            DreSection;
  financialExpenseSections: DreSection;

  // ── Data quality ──────────────────────────────────────────────────────────

  hasData:                 boolean;
  periodStart:             string | null;
  periodEnd:               string | null;
  transactionCount:        number;
  confirmedCount:          number;
  ambiguousCount:          number;
  note:                    string | null;

  // ── Entity filter applied ─────────────────────────────────────────────────
  entityFilter:            EntityLayer | "all";
}

// ─── Label map (subset used in DRE — mirrors CATEGORY_LABELS) ────────────────

const DRE_LABELS: Partial<Record<ManagerialCategory, string>> = {
  receita_recorrente:             "Receita Recorrente",
  receita_projeto:                "Receita de Projeto",
  receita_consultoria:            "Receita de Consultoria",
  receita_producao:               "Receita de Produção",
  receita_social_media:           "Receita Social Media",
  receita_revenue_share:          "Revenue Share",
  receita_eventual:               "Receita Eventual",
  rendimento_financeiro:          "Rendimento Financeiro",
  ajuste_bancario_credito:        "Ajuste / Crédito Bancário",
  freelancer_terceiro:            "Freelancer / Terceiro",
  fornecedor_operacional:         "Fornecedor Operacional",
  folha_remuneracao:              "Folha / Remuneração",
  prolabore_retirada:             "Pró-labore / Retirada",
  imposto_tributo:                "Imposto / Tributo",
  juros_multa_iof:                "Juros / Multa / IOF",
  tarifa_bancaria:                "Tarifa Bancária",
  software_assinatura:            "Software / Assinatura",
  marketing_midia:                "Marketing / Mídia Paga",
  deslocamento_combustivel:       "Deslocamento / Combustível",
  alimentacao_representacao:      "Alimentação / Representação",
  viagem_hospedagem:              "Viagem / Hospedagem",
  aluguel_locacao:                "Aluguel / Locação",
  energia_agua_internet:          "Energia / Água / Internet",
  servicos_contabeis_juridicos:   "Serviços Contábeis / Jurídicos",
  cartao_compra_operacional:      "Compra via Cartão Corporativo",
  despesa_pessoal_misturada:      "Despesa Pessoal Misturada",
  despesa_ambigua:                "Despesa Ambígua",
};

function dreLabel(cat: ManagerialCategory): string {
  return DRE_LABELS[cat] ?? cat;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/** Aggregate transactions by category into DreCategoryLine[]. */
function aggregateByCategory(
  txns: BankTransaction[],
  cats: Set<ManagerialCategory>
): DreCategoryLine[] {
  const map = new Map<ManagerialCategory, { amount: number; count: number; confidences: Set<string> }>();

  for (const t of txns) {
    if (!cats.has(t.managerialCategory)) continue;
    const abs = Math.abs(t.amount);
    const entry = map.get(t.managerialCategory) ?? { amount: 0, count: 0, confidences: new Set() };
    entry.amount += abs;
    entry.count  += 1;
    entry.confidences.add(t.classificationConfidence);
    map.set(t.managerialCategory, entry);
  }

  const lines: DreCategoryLine[] = [];
  for (const [cat, entry] of map) {
    const cs = entry.confidences;
    const confidence: DreCategoryLine["confidence"] =
      cs.size === 1 && cs.has("confirmed") ? "confirmed"
      : cs.size === 1 && cs.has("probable") ? "probable"
      : cs.has("ambiguous") ? "ambiguous"
      : "mixed";

    lines.push({
      category:         cat,
      label:            dreLabel(cat),
      amount:           entry.amount,
      transactionCount: entry.count,
      confidence,
    });
  }

  // Sort descending by amount
  return lines.sort((a, b) => b.amount - a.amount);
}

function sumLines(lines: DreCategoryLine[]): number {
  return lines.reduce((s, l) => s + l.amount, 0);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build the canonical cash-basis DRE gerencial for AWQ.
 *
 * @param entityFilter - "all" = consolidated (intercompany eliminated),
 *                       EntityLayer = single-entity view (no elimination needed).
 */
export async function buildDreQuery(
  entityFilter: EntityLayer | "all" = "all"
): Promise<DreResult> {
  const allTxns = await getAllTransactions();

  // ── Filter by entity and exclude intercompany from DRE ───────────────────
  const txns: BankTransaction[] = allTxns.filter((t) => {
    // Entity filter
    if (entityFilter !== "all" && t.entity !== entityFilter) return false;
    // Exclude intercompany from DRE P&L lines (they appear in eliminatedSection)
    if (t.excludedFromConsolidated && (
      t.managerialCategory === "transferencia_interna_enviada" ||
      t.managerialCategory === "transferencia_interna_recebida" ||
      t.managerialCategory === "aplicacao_financeira" ||
      t.managerialCategory === "resgate_financeiro"
    )) return false;
    return true;
  });

  const hasData = txns.length > 0;

  if (!hasData) {
    const empty: DreResult = {
      dreRevenue: 0, dreOperationalRevenue: 0, dreFinancialRevenue: 0,
      dreCOGS: 0, dreGrossProfit: 0, dreGrossMargin: null,
      dreOperatingExpenses: 0,
      dreEBITDA: 0, dreEBITDAMargin: null,
      dreFinancialExpenses: 0,
      dreNetResult: 0, dreNetMargin: null,
      intercompanyEliminated: 0, financialApplications: 0,
      financialRedemptions: 0, prolaboreTotal: 0,
      revenueSections:          { label: "Receita Bruta",           total: 0, lines: [] },
      cogsSections:             { label: "Custo Direto (COGS)",      total: 0, lines: [] },
      opexSections:             { label: "Despesas Operacionais",    total: 0, lines: [] },
      financialExpenseSections: { label: "Despesas Financeiras",     total: 0, lines: [] },
      hasData: false,
      periodStart: null, periodEnd: null,
      transactionCount: 0, confirmedCount: 0, ambiguousCount: 0,
      note: "Sem dados — nenhum documento ingested com status=done.",
      entityFilter,
    };
    return empty;
  }

  // ── Revenue credits (excludedFromConsolidated=false, direction=credit) ────
  const revTxns  = txns.filter((t) => t.direction === "credit"  && ALL_REVENUE_CATS.has(t.managerialCategory));
  const cogsTxns = txns.filter((t) => t.direction === "debit"   && COGS_CATS.has(t.managerialCategory));
  const opexTxns = txns.filter((t) => t.direction === "debit"   && OPEX_CATS.has(t.managerialCategory));
  const finExpTxns = txns.filter((t) => t.direction === "debit" && FINANCIAL_EXPENSE_CATS.has(t.managerialCategory));

  // ── Excluded (for audit display) ─────────────────────────────────────────
  const intercompanyOut = allTxns
    .filter((t) => t.excludedFromConsolidated && t.managerialCategory === "transferencia_interna_enviada")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const financialApplications = allTxns
    .filter((t) => t.managerialCategory === "aplicacao_financeira")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const financialRedemptions = allTxns
    .filter((t) => t.managerialCategory === "resgate_financeiro")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const prolaboreTotal = opexTxns
    .filter((t) => t.managerialCategory === "prolabore_retirada")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── Build category lines ──────────────────────────────────────────────────
  const opRevLines   = aggregateByCategory(revTxns.filter((t) => OPERATIONAL_REVENUE_CATS.has(t.managerialCategory)), OPERATIONAL_REVENUE_CATS);
  const finRevLines  = aggregateByCategory(revTxns.filter((t) => FINANCIAL_REVENUE_CATS.has(t.managerialCategory)),   FINANCIAL_REVENUE_CATS);
  const allRevLines  = [...opRevLines, ...finRevLines].sort((a, b) => b.amount - a.amount);
  const cogsLines    = aggregateByCategory(cogsTxns, COGS_CATS);
  const opexLines    = aggregateByCategory(opexTxns, OPEX_CATS);
  const finExpLines  = aggregateByCategory(finExpTxns, FINANCIAL_EXPENSE_CATS);

  // ── DRE aggregates ────────────────────────────────────────────────────────
  const dreOperationalRevenue = sumLines(opRevLines);
  const dreFinancialRevenue   = sumLines(finRevLines);
  const dreRevenue            = dreOperationalRevenue + dreFinancialRevenue;
  const dreCOGS               = sumLines(cogsLines);
  const dreGrossProfit        = dreRevenue - dreCOGS;
  const dreOperatingExpenses  = sumLines(opexLines);
  const dreEBITDA             = dreGrossProfit - dreOperatingExpenses;
  const dreFinancialExpenses  = sumLines(finExpLines);
  const dreNetResult          = dreEBITDA - dreFinancialExpenses;

  // ── Period ────────────────────────────────────────────────────────────────
  let periodStart: string | null = null;
  let periodEnd:   string | null = null;
  let confirmedCount = 0;
  let ambiguousCount = 0;

  for (const t of txns) {
    periodStart = minDate(periodStart, t.transactionDate);
    periodEnd   = maxDate(periodEnd,   t.transactionDate);
    if (t.classificationConfidence === "confirmed") confirmedCount++;
    if (t.classificationConfidence === "ambiguous") ambiguousCount++;
  }

  return {
    dreRevenue,
    dreOperationalRevenue,
    dreFinancialRevenue,
    dreCOGS,
    dreGrossProfit,
    dreGrossMargin:   dreRevenue > 0 ? dreGrossProfit  / dreRevenue : null,
    dreOperatingExpenses,
    dreEBITDA,
    dreEBITDAMargin:  dreRevenue > 0 ? dreEBITDA       / dreRevenue : null,
    dreFinancialExpenses,
    dreNetResult,
    dreNetMargin:     dreRevenue > 0 ? dreNetResult    / dreRevenue : null,

    intercompanyEliminated: intercompanyOut,
    financialApplications,
    financialRedemptions,
    prolaboreTotal,

    revenueSections:          { label: "Receita Bruta",        total: dreRevenue,           lines: allRevLines  },
    cogsSections:             { label: "Custo Direto (COGS)",   total: dreCOGS,              lines: cogsLines    },
    opexSections:             { label: "Despesas Operacionais", total: dreOperatingExpenses, lines: opexLines    },
    financialExpenseSections: { label: "Despesas Financeiras",  total: dreFinancialExpenses, lines: finExpLines  },

    hasData: true,
    periodStart,
    periodEnd,
    transactionCount: txns.length,
    confirmedCount,
    ambiguousCount,
    note: ambiguousCount > 0
      ? `${ambiguousCount} transações ambíguas incluídas — revisar em /awq/data.`
      : null,

    entityFilter,
  };
}
