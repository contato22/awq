// ─── AWQ Financial Query Layer ─────────────────────────────────────────────────
//
// THE ONLY authorised way for server components to read financial data.
// All numbers come exclusively from financial-db.ts (populated by the ingest
// pipeline). No mocks, no snapshots, no hardcodes, no fallbacks.
//
// CASH-BASIS METHODOLOGY (label accordingly in UI):
//   Revenue  = credits classified as receita_* categories
//   Expenses = debits classified as operational expense categories
//   This is a CASH-BASIS view — not accrual P&L. Label: "Visão de Caixa".
//
// INTERCOMPANY ELIMINATION:
//   Transactions tagged `excludedFromConsolidated = true` are excluded from
//   the consolidated totals. This includes intercompany transfers, financial
//   applications and redemptions.
//
// HONEST STATES:
//   When hasData === false (zero documents with status="done"), ALL aggregate
//   values are zero and callers MUST render an honest empty state.
//   NEVER fall back to awq-group-data.ts, data.ts, or caza-data.ts snapshots.
//
// DO NOT import in client components — calls financial-db which uses Node fs.

import {
  getAllDocuments,
  getAllTransactions,
  type BankTransaction,
  type FinancialDocument,
  type EntityLayer,
  type ManagerialCategory,
} from "./financial-db";

import {
  REQUIRED_COVERAGE_ENTITIES,
  KNOWN_ACCOUNTS,
} from "./bank-account-registry";

export type { EntityLayer, ManagerialCategory };

// ─── Category sets (DRE-complete) ────────────────────────────────────────────
//
// REVENUE_CATS: all credit categories that feed the DRE revenue lines.
//   rendimento_financeiro is included — it feeds DRE "Receita Financeira".
//   ajuste_bancario_credito is included — storno / credit adjustment.
//   transferencia_interna_recebida is EXCLUDED — intercompany, no P&L.
//   aporte_socio is EXCLUDED — capitalização, not revenue.
//
// OPERATIONAL_EXPENSE_CATS: all debit categories that feed DRE expense lines.
//   Excludes aplicacao_financeira, resgate_financeiro, transferencia_interna_enviada
//   (those are in CONSOLIDATION_EXCLUDED via excludedFromConsolidated flag).
//   Includes prolabore_retirada (below-the-line, shown separately in FCO).

const REVENUE_CATS = new Set<ManagerialCategory>([
  "receita_recorrente",
  "receita_projeto",
  "receita_consultoria",
  "receita_producao",
  "receita_social_media",
  "receita_revenue_share",
  "receita_fee_venture",
  "receita_eventual",
  "rendimento_financeiro",
  "ajuste_bancario_credito",
]);

const OPERATIONAL_EXPENSE_CATS = new Set<ManagerialCategory>([
  "fornecedor_operacional",
  "freelancer_terceiro",
  "folha_remuneracao",
  "prolabore_retirada",
  "imposto_tributo",
  "juros_multa_iof",
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

const AMBIGUOUS_CATS = new Set<ManagerialCategory>([
  "despesa_ambigua",
  "recebimento_ambiguo",
  "unclassified",
]);

export const CATEGORY_LABELS: Record<ManagerialCategory, string> = {
  // ── Entradas ──────────────────────────────────────────────────────────────
  receita_recorrente:             "Receita Recorrente",
  receita_projeto:                "Receita de Projeto",
  receita_consultoria:            "Receita de Consultoria",
  receita_producao:               "Receita de Produção",
  receita_social_media:           "Receita Social Media",
  receita_revenue_share:          "Revenue Share",
  receita_fee_venture:            "Fee Recorrente Venture",
  receita_eventual:               "Receita Eventual",
  rendimento_financeiro:          "Rendimento Financeiro",
  aporte_socio:                   "Aporte do Sócio",
  transferencia_interna_recebida: "Transf. Intercompany (recebida)",
  ajuste_bancario_credito:        "Ajuste / Crédito Bancário",
  recebimento_ambiguo:            "Recebimento Ambíguo",
  // ── Saídas ────────────────────────────────────────────────────────────────
  fornecedor_operacional:         "Fornecedor Operacional",
  freelancer_terceiro:            "Freelancer / Terceiro",
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
  aplicacao_financeira:           "Aplicação Financeira",
  resgate_financeiro:             "Resgate Financeiro",
  transferencia_interna_enviada:  "Transf. Intercompany (enviada)",
  reserva_limite_cartao:          "Reserva Limite Cartão",
  despesa_ambigua:                "Despesa Ambígua",
  unclassified:                   "Não Classificado",
};

export const ENTITY_LABELS: Record<EntityLayer, string> = {
  AWQ_Holding:  "AWQ Holding",
  JACQES:       "JACQES",
  Caza_Vision:  "Caza Vision",
  Intercompany: "Intercompany",
  Socio_PF:     "Sócio / PF",
  Unknown:      "Não identificado",
};

// ─── Output types ─────────────────────────────────────────────────────────────

/** Cash position for a single ingested document / bank account. */
export interface CashAccount {
  documentId:               string;
  filename:                 string;
  bank:                     string;
  accountName:              string;
  entity:                   EntityLayer;
  openingBalance:           number;
  closingBalance:           number;
  totalCredits:             number;    // all credit amounts (absolute)
  totalDebits:              number;    // all debit amounts (absolute)
  operationalRevenue:       number;    // credits in receita_* categories
  operationalExpenses:      number;    // debits in operational expense cats
  operationalNetCash:       number;    // operationalRevenue - operationalExpenses
  intercompanyIn:           number;    // excluded transfers received
  intercompanyOut:          number;    // excluded transfers sent
  financialApplications:    number;    // aplicacao_financeira
  financialRedemptions:     number;    // resgate_financeiro
  partnerWithdrawals:       number;    // prolabore_retirada
  personalExpenses:         number;    // despesa_pessoal_misturada
  ambiguousCredits:         number;    // recebimento_ambiguo + unclassified credits
  ambiguousDebits:          number;    // despesa_ambigua + unclassified debits
  periodStart:              string | null;
  periodEnd:                string | null;
  lastMovement:             string | null;  // ISO date of most recent transaction
  transactionCount:         number;
  confirmedCount:           number;
  ambiguousCount:           number;
  parserConfidence:         "high" | "medium" | "low" | null;
}

/** Aggregated view for one entity layer (sum of all its accounts). */
export interface EntitySummary {
  entity:                   EntityLayer;
  label:                    string;
  accounts:                 CashAccount[];
  // Aggregated cash
  totalCashBalance:         number;
  operationalRevenue:       number;
  operationalExpenses:      number;
  operationalNetCash:       number;
  // Eliminated / non-operational
  intercompanyIn:           number;
  intercompanyOut:          number;
  partnerWithdrawals:       number;
  personalExpenses:         number;
  financialMovements:       number;   // applications + redemptions (net)
  ambiguousAmount:          number;
  // Coverage
  documentCount:            number;
  transactionCount:         number;
  confirmedCount:           number;
  ambiguousCount:           number;
  periodStart:              string | null;
  periodEnd:                string | null;
}

/** AWQ Group consolidated view (intercompany eliminated). */
export interface HoldingConsolidation {
  // Operational (Cora + Itaú, intercompany already excluded)
  totalRevenue:             number;
  totalExpenses:            number;
  operationalNetCash:       number;
  // Cash
  totalCashBalance:         number;
  // Eliminated
  intercompanyEliminated:   number;  // abs value removed from both sides
  // Non-operational
  partnerWithdrawals:       number;
  personalExpenses:         number;
  financialMovements:       number;
  // Ambiguous (pending review)
  ambiguousAmount:          number;
  // Coverage
  documentCount:            number;
  transactionCount:         number;
  confirmedTransactions:    number;
  ambiguousTransactions:    number;
  periodStart:              string | null;
  periodEnd:                string | null;
  lastUpdated:              string | null;
}

/** Monthly cash-basis data point for bridge/trend chart. */
export interface MonthlyEntry {
  month:                    string;        // "YYYY-MM"
  entity:                   EntityLayer;
  revenue:                  number;
  expenses:                 number;
  netCash:                  number;
  intercompanyEliminated:   number;
}

export interface CounterpartyRevenue {
  counterparty:             string;
  amount:                   number;
  category:                 ManagerialCategory;
  categoryLabel:            string;
  entity:                   EntityLayer;
  transactionCount:         number;
}

export interface CategoryExpense {
  category:                 ManagerialCategory;
  categoryLabel:            string;
  amount:                   number;
  entity:                   EntityLayer;
  transactionCount:         number;
  isAmbiguous:              boolean;
}

export interface FinancialQueryResult {
  hasData:               boolean;   // false = no "done" documents, render empty state
  accounts:              CashAccount[];
  entities:              EntitySummary[];
  consolidated:          HoldingConsolidation;
  monthlyBridge:         MonthlyEntry[];
  revenueByCounterparty: CounterpartyRevenue[];
  expensesByCategory:    CategoryExpense[];
  dataQuality: {
    totalDocuments:      number;
    doneDocuments:       number;
    totalTransactions:   number;
    confirmedCount:      number;
    ambiguousCount:      number;
    intercompanyPairs:   number;
    coverageGaps:        string[];
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

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

/** Build a CashAccount from one FinancialDocument + its transactions. */
function buildCashAccount(
  doc: FinancialDocument,
  txns: BankTransaction[]
): CashAccount {
  let totalCredits           = 0;
  let totalDebits            = 0;
  let operationalRevenue     = 0;
  let operationalExpenses    = 0;
  let intercompanyIn         = 0;
  let intercompanyOut        = 0;
  let financialApplications  = 0;
  let financialRedemptions   = 0;
  let partnerWithdrawals     = 0;
  let personalExpenses       = 0;
  let ambiguousCredits       = 0;
  let ambiguousDebits        = 0;

  let lastMovement: string | null = null;
  let confirmedCount = 0;
  let ambiguousCount = 0;

  for (const t of txns) {
    const amt = Math.abs(t.amount);
    const cat = t.managerialCategory;

    if (t.direction === "credit") totalCredits += amt;
    else totalDebits += amt;

    if (t.transactionDate > (lastMovement ?? "")) lastMovement = t.transactionDate;

    if (t.classificationConfidence === "confirmed" || t.classificationConfidence === "probable") {
      confirmedCount++;
    } else {
      ambiguousCount++;
    }

    // Intercompany (excluded from operational)
    if (t.excludedFromConsolidated) {
      if (t.isIntercompany) {
        if (t.direction === "credit") intercompanyIn += amt;
        else intercompanyOut += amt;
      } else if (cat === "aplicacao_financeira") {
        financialApplications += amt;
      } else if (cat === "resgate_financeiro") {
        financialRedemptions += amt;
      }
      continue; // excluded — don't count in operational
    }

    // Operational revenue
    if (REVENUE_CATS.has(cat) && t.direction === "credit") {
      operationalRevenue += amt;
      continue;
    }

    // Pró-labore / retirada
    if (cat === "prolabore_retirada" && t.direction === "debit") {
      partnerWithdrawals += amt;
      operationalExpenses += amt;
      continue;
    }

    // Personal expenses mixed into company
    if (cat === "despesa_pessoal_misturada" && t.direction === "debit") {
      personalExpenses += amt;
      operationalExpenses += amt;
      continue;
    }

    // Ambiguous
    if (AMBIGUOUS_CATS.has(cat)) {
      if (t.direction === "credit") ambiguousCredits += amt;
      else ambiguousDebits += amt;
      continue;
    }

    // Other operational expenses
    if (OPERATIONAL_EXPENSE_CATS.has(cat) && t.direction === "debit") {
      operationalExpenses += amt;
    }
  }

  return {
    documentId:            doc.id,
    filename:              doc.filename,
    bank:                  doc.bank,
    accountName:           doc.accountName,
    entity:                doc.entity,
    openingBalance:        doc.openingBalance ?? 0,
    closingBalance:        doc.closingBalance ?? 0,
    totalCredits,
    totalDebits,
    operationalRevenue,
    operationalExpenses,
    operationalNetCash:    operationalRevenue - operationalExpenses,
    intercompanyIn,
    intercompanyOut,
    financialApplications,
    financialRedemptions,
    partnerWithdrawals,
    personalExpenses,
    ambiguousCredits,
    ambiguousDebits,
    periodStart:           doc.periodStart,
    periodEnd:             doc.periodEnd,
    lastMovement,
    transactionCount:      txns.length,
    confirmedCount,
    ambiguousCount,
    parserConfidence:      doc.parserConfidence,
  };
}

/** Aggregate multiple CashAccounts into one EntitySummary. */
function buildEntitySummary(entity: EntityLayer, accounts: CashAccount[]): EntitySummary {
  const sum = accounts.reduce(
    (acc, a) => ({
      totalCashBalance:      acc.totalCashBalance + a.closingBalance,
      operationalRevenue:    acc.operationalRevenue + a.operationalRevenue,
      operationalExpenses:   acc.operationalExpenses + a.operationalExpenses,
      intercompanyIn:        acc.intercompanyIn + a.intercompanyIn,
      intercompanyOut:       acc.intercompanyOut + a.intercompanyOut,
      partnerWithdrawals:    acc.partnerWithdrawals + a.partnerWithdrawals,
      personalExpenses:      acc.personalExpenses + a.personalExpenses,
      financialMovements:    acc.financialMovements + a.financialApplications + a.financialRedemptions,
      ambiguousAmount:       acc.ambiguousAmount + a.ambiguousCredits + a.ambiguousDebits,
      transactionCount:      acc.transactionCount + a.transactionCount,
      confirmedCount:        acc.confirmedCount + a.confirmedCount,
      ambiguousCount:        acc.ambiguousCount + a.ambiguousCount,
      periodStart:           minDate(acc.periodStart, a.periodStart),
      periodEnd:             maxDate(acc.periodEnd, a.periodEnd),
    }),
    {
      totalCashBalance: 0, operationalRevenue: 0, operationalExpenses: 0,
      intercompanyIn: 0, intercompanyOut: 0, partnerWithdrawals: 0,
      personalExpenses: 0, financialMovements: 0, ambiguousAmount: 0,
      transactionCount: 0, confirmedCount: 0, ambiguousCount: 0,
      periodStart: null as string | null, periodEnd: null as string | null,
    }
  );

  return {
    entity,
    label:                ENTITY_LABELS[entity] ?? entity,
    accounts,
    ...sum,
    operationalNetCash:   sum.operationalRevenue - sum.operationalExpenses,
    documentCount:        accounts.length,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function buildFinancialQuery(): Promise<FinancialQueryResult> {
  const allDocs  = await getAllDocuments();
  const doneDocs = allDocs.filter((d) => d.status === "done");
  const allTxns  = await getAllTransactions();

  const empty: FinancialQueryResult = {
    hasData: false,
    accounts: [],
    entities: [],
    consolidated: {
      totalRevenue: 0, totalExpenses: 0, operationalNetCash: 0,
      totalCashBalance: 0, intercompanyEliminated: 0,
      partnerWithdrawals: 0, personalExpenses: 0, financialMovements: 0,
      ambiguousAmount: 0, documentCount: 0, transactionCount: 0,
      confirmedTransactions: 0, ambiguousTransactions: 0,
      periodStart: null, periodEnd: null, lastUpdated: null,
    },
    monthlyBridge: [],
    revenueByCounterparty: [],
    expensesByCategory: [],
    dataQuality: {
      totalDocuments: allDocs.length,
      doneDocuments: 0,
      totalTransactions: allTxns.length,
      confirmedCount: 0,
      ambiguousCount: 0,
      intercompanyPairs: 0,
      coverageGaps: allDocs.length === 0
        ? ["Nenhum extrato ingerido. Acesse /awq/ingest para iniciar."]
        : [`${allDocs.length} documento(s) pendente(s) de processamento.`],
    },
  };

  if (doneDocs.length === 0) return empty;

  // ── Build txn index by documentId ─────────────────────────────────────────
  const txnsByDoc = new Map<string, BankTransaction[]>();
  for (const t of allTxns) {
    if (!txnsByDoc.has(t.documentId)) txnsByDoc.set(t.documentId, []);
    txnsByDoc.get(t.documentId)!.push(t);
  }

  // ── Build CashAccount per document ────────────────────────────────────────
  const accounts: CashAccount[] = doneDocs.map((doc) =>
    buildCashAccount(doc, txnsByDoc.get(doc.id) ?? [])
  );

  // ── Group accounts by entity ──────────────────────────────────────────────
  const entityMap = new Map<EntityLayer, CashAccount[]>();
  for (const acc of accounts) {
    if (!entityMap.has(acc.entity)) entityMap.set(acc.entity, []);
    entityMap.get(acc.entity)!.push(acc);
  }

  const entities: EntitySummary[] = Array.from(entityMap.entries()).map(([entity, accs]) =>
    buildEntitySummary(entity, accs)
  );

  // ── Consolidated (operational BUs, intercompany eliminated) ───────────────
  // Only include AWQ_Holding, JACQES, Caza_Vision in operational consolidated.
  // Intercompany and Socio_PF are shown separately but excluded from totals.
  const operationalEntities = entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  const intercompanyEliminated = entities
    .flatMap((e) => e.accounts)
    .filter((a) => a.intercompanyIn > 0 || a.intercompanyOut > 0)
    .reduce((sum, a) => sum + a.intercompanyIn + a.intercompanyOut, 0) / 2; // pairs counted twice

  const consolidated: HoldingConsolidation = {
    totalRevenue:          operationalEntities.reduce((s, e) => s + e.operationalRevenue, 0),
    totalExpenses:         operationalEntities.reduce((s, e) => s + e.operationalExpenses, 0),
    operationalNetCash:    operationalEntities.reduce((s, e) => s + e.operationalNetCash, 0),
    totalCashBalance:      accounts.reduce((s, a) => s + a.closingBalance, 0),
    intercompanyEliminated,
    partnerWithdrawals:    operationalEntities.reduce((s, e) => s + e.partnerWithdrawals, 0),
    personalExpenses:      operationalEntities.reduce((s, e) => s + e.personalExpenses, 0),
    financialMovements:    entities.reduce((s, e) => s + e.financialMovements, 0),
    ambiguousAmount:       entities.reduce((s, e) => s + e.ambiguousAmount, 0),
    documentCount:         doneDocs.length,
    transactionCount:      allTxns.length,
    confirmedTransactions: allTxns.filter((t) =>
      t.classificationConfidence === "confirmed" || t.classificationConfidence === "probable"
    ).length,
    ambiguousTransactions: allTxns.filter((t) =>
      t.classificationConfidence === "ambiguous" || t.classificationConfidence === "unclassifiable"
    ).length,
    periodStart: doneDocs.reduce((min, d) => minDate(min, d.periodStart), null as string | null),
    periodEnd:   doneDocs.reduce((max, d) => maxDate(max, d.periodEnd),   null as string | null),
    lastUpdated: allTxns.length > 0
      ? allTxns.reduce((max, t) => t.extractedAt > max ? t.extractedAt : max, "")
      : null,
  };

  // ── Monthly bridge ────────────────────────────────────────────────────────
  const monthlyMap = new Map<string, MonthlyEntry>();

  for (const t of allTxns) {
    if (!t.transactionDate) continue;
    const month = t.transactionDate.slice(0, 7);
    const key   = `${t.entity}__${month}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        month,
        entity:                  t.entity,
        revenue:                 0,
        expenses:                0,
        netCash:                 0,
        intercompanyEliminated:  0,
      });
    }
    const entry = monthlyMap.get(key)!;
    const amt   = Math.abs(t.amount);

    if (t.excludedFromConsolidated && t.isIntercompany) {
      entry.intercompanyEliminated += amt;
    } else if (!t.excludedFromConsolidated) {
      if (REVENUE_CATS.has(t.managerialCategory) && t.direction === "credit") {
        entry.revenue += amt;
      } else if (OPERATIONAL_EXPENSE_CATS.has(t.managerialCategory) && t.direction === "debit") {
        entry.expenses += amt;
      }
    }
  }

  for (const entry of Array.from(monthlyMap.values())) {
    entry.netCash = entry.revenue - entry.expenses;
  }

  const monthlyBridge = Array.from(monthlyMap.values()).sort(
    (a, b) => `${a.month}${a.entity}`.localeCompare(`${b.month}${b.entity}`)
  );

  // ── Revenue by counterparty ───────────────────────────────────────────────
  const counterpartyMap = new Map<string, CounterpartyRevenue>();

  for (const t of allTxns) {
    if (!REVENUE_CATS.has(t.managerialCategory) || t.direction !== "credit") continue;
    if (t.excludedFromConsolidated) continue;

    const key = `${t.counterpartyName ?? t.descriptionOriginal.slice(0, 40)}__${t.entity}`;
    const name = t.counterpartyName ?? t.descriptionOriginal.slice(0, 40);

    if (!counterpartyMap.has(key)) {
      counterpartyMap.set(key, {
        counterparty:   name,
        amount:         0,
        category:       t.managerialCategory,
        categoryLabel:  CATEGORY_LABELS[t.managerialCategory],
        entity:         t.entity,
        transactionCount: 0,
      });
    }
    const entry = counterpartyMap.get(key)!;
    entry.amount           += Math.abs(t.amount);
    entry.transactionCount += 1;
  }

  const revenueByCounterparty = Array.from(counterpartyMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  // ── Expenses by category ──────────────────────────────────────────────────
  const catExpMap = new Map<string, CategoryExpense>();

  for (const t of allTxns) {
    if (t.direction !== "debit") continue;
    if (t.excludedFromConsolidated && t.isIntercompany) continue;
    if (!OPERATIONAL_EXPENSE_CATS.has(t.managerialCategory) &&
        !AMBIGUOUS_CATS.has(t.managerialCategory)) continue;

    const key = `${t.managerialCategory}__${t.entity}`;
    if (!catExpMap.has(key)) {
      catExpMap.set(key, {
        category:        t.managerialCategory,
        categoryLabel:   CATEGORY_LABELS[t.managerialCategory],
        amount:          0,
        entity:          t.entity,
        transactionCount: 0,
        isAmbiguous:     AMBIGUOUS_CATS.has(t.managerialCategory),
      });
    }
    const entry = catExpMap.get(key)!;
    entry.amount           += Math.abs(t.amount);
    entry.transactionCount += 1;
  }

  const expensesByCategory = Array.from(catExpMap.values())
    .sort((a, b) => b.amount - a.amount);

  // ── Data quality report ───────────────────────────────────────────────────
  const confirmedCount    = allTxns.filter((t) =>
    t.classificationConfidence === "confirmed" || t.classificationConfidence === "probable"
  ).length;
  const ambiguousCount    = allTxns.length - confirmedCount;
  const intercompanyPairs = allTxns.filter((t) => t.isIntercompany && t.intercompanyMatchId).length / 2;

  const coverageGaps: string[] = [];
  const entityCoverage = new Set(doneDocs.map((d) => d.entity));

  // Coverage gaps derived from bank-account-registry — not hardcoded
  for (const requiredEntity of REQUIRED_COVERAGE_ENTITIES) {
    if (!entityCoverage.has(requiredEntity)) {
      // Find the expected bank/account for this entity from the registry
      const expectedAccounts = KNOWN_ACCOUNTS.filter(
        (a) => a.entity === requiredEntity && a.usage === "operating_cash" && a.closedAt === null
      );
      const acctDesc = expectedAccounts
        .map((a) => `${a.bank} (${a.accountName})`)
        .join(" ou ");
      const label = requiredEntity.replace("_", " ").replace("AWQ Holding", "AWQ Holding");
      coverageGaps.push(
        `${label}: sem extrato ingerido${acctDesc ? ` — esperado: ${acctDesc}` : ""}`
      );
    }
  }
  if (ambiguousCount > 0) coverageGaps.push(`${ambiguousCount} transações ambíguas pendentes de revisão`);

  return {
    hasData: true,
    accounts,
    entities,
    consolidated,
    monthlyBridge,
    revenueByCounterparty,
    expensesByCategory,
    dataQuality: {
      totalDocuments: allDocs.length,
      doneDocuments:  doneDocs.length,
      totalTransactions: allTxns.length,
      confirmedCount,
      ambiguousCount,
      intercompanyPairs: Math.round(intercompanyPairs),
      coverageGaps,
    },
  };
}

// ─── Formatting helpers (server-safe) ─────────────────────────────────────────

export function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return sign + "R$" + (abs / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000)     return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)         return sign + "R$" + (abs / 1_000).toFixed(1) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(s: string | null): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
