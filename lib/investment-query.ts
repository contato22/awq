// ─── AWQ Investment Query Layer ──────────────────────────────────────────────
//
// THE ONLY authorised way to read investment / patrimonial data.
// Reads exclusively from financial-db.ts (canonical pipeline store).
// No mocks, no snapshots, no hardcodes.
//
// INVESTMENT SCOPE:
//   Transactions classified as aplicacao_financeira or resgate_financeiro.
//   These are EXCLUDED from operational cash flow (FCO).
//   They represent patrimonial / treasury movements, not revenue or expense.
//
// REVIEW QUEUE:
//   Internal transfers (transferencia_interna_*) that are NOT matched as
//   intercompany may be routing to/from investment accounts.
//   These surface in the review queue for human decision.
//
// WHAT THIS IS NOT:
//   - It does not report investment yields (no rendimento_financeiro category yet).
//   - It does not compute asset market value (no position data available).
//   - It does not claim a "balance in investment" — only observable cash flows.
//
// DO NOT import in client components — uses Node fs via financial-db.

import {
  getAllDocuments,
  getAllTransactions,
  type BankTransaction,
  type EntityLayer,
  type ManagerialCategory,
  type ClassificationConfidence,
} from "./financial-db";
import { ENTITY_LABELS, fmtBRL, fmtDate } from "./financial-query";

export type { EntityLayer, ManagerialCategory, ClassificationConfidence };
export { fmtBRL, fmtDate, ENTITY_LABELS };

// ─── Investment sub-taxonomy ──────────────────────────────────────────────────

export type InvestmentCategory =
  | "aplicacao"                              // confirmed: aplicacao_financeira debit
  | "resgate"                                // confirmed: resgate_financeiro credit
  | "transferencia_possivelmente_investimento" // review: unmatched internal transfer out
  | "retorno_possivelmente_investimento"      // review: unmatched internal transfer in
  | "revisao_manual";                        // low-confidence, needs human decision

export const INVESTMENT_CATEGORY_LABELS: Record<InvestmentCategory, string> = {
  aplicacao:                                    "Aplicação Financeira",
  resgate:                                      "Resgate Financeiro",
  transferencia_possivelmente_investimento:      "Transf. Possivelmente p/ Investimento",
  retorno_possivelmente_investimento:            "Retorno Possivelmente de Investimento",
  revisao_manual:                               "Revisão Manual",
};

// Managerial categories that are definitively investment
const CONFIRMED_INVESTMENT_CATS = new Set<ManagerialCategory>([
  "aplicacao_financeira",
  "resgate_financeiro",
]);

// Managerial categories that might involve investment (go into review queue)
const POSSIBLE_INVESTMENT_CATS = new Set<ManagerialCategory>([
  "transferencia_interna_enviada",
  "transferencia_interna_recebida",
]);

// ─── Output types ─────────────────────────────────────────────────────────────

export type ReconciledStatus = "conciliado" | "revisão pendente" | "não conciliável";

/** One investment-related movement from the bank ledger. */
export interface InvestmentEntry {
  // Identity (fully traceable to source)
  transactionId:              string;
  documentId:                 string;
  // Raw extraction
  bank:                       string;
  accountName:                string;
  entity:                     EntityLayer;
  transactionDate:            string;       // YYYY-MM-DD
  descriptionOriginal:        string;
  amount:                     number;       // absolute value
  direction:                  "credit" | "debit";
  counterpartyName:           string | null;
  // Classification
  managerialCategory:         ManagerialCategory;
  investmentCategory:         InvestmentCategory;
  classificationConfidence:   ClassificationConfidence;
  classificationNote:         string | null;
  // Status
  reconciledStatus:           ReconciledStatus;
  excludedFromOperational:    boolean;      // always true for investment entries
  isAmbiguous:                boolean;
  notes:                      string | null;
}

/** Per-entity investment summary (observable cash flows only). */
export interface EntityInvestmentSummary {
  entity:               EntityLayer;
  label:                string;
  totalApplications:    number;   // sum of aplicacao_financeira debits
  totalRedemptions:     number;   // sum of resgate_financeiro credits
  netInvested:          number;   // applications - redemptions (still in investment)
  confirmedCount:       number;
  ambiguousCount:       number;
  lastActivity:         string | null;
  accounts:             string[];
}

/** Full investment query result. */
export interface InvestmentQueryResult {
  hasData:              boolean;  // false = no done documents
  hasInvestmentData:    boolean;  // false = no investment transactions found
  // Confirmed investment flows
  applications:         InvestmentEntry[];  // aplicacao_financeira
  redemptions:          InvestmentEntry[];  // resgate_financeiro
  // Unconfirmed / review
  reviewQueue:          InvestmentEntry[];  // possible investment, needs human decision
  // Aggregates (confirmed only, honest)
  totalApplications:    number;
  totalRedemptions:     number;
  netInvested:          number;   // applications - redemptions (positive = more out than returned)
  // Breakdown
  byEntity:             EntityInvestmentSummary[];
  // Monthly bridge (confirmed only)
  monthlyFlow:          MonthlyInvestmentEntry[];
  // Coverage
  affectedDocuments:    number;
  affectedAccounts:     string[];
  periodStart:          string | null;
  periodEnd:            string | null;
  // Quality
  confirmedCount:       number;
  ambiguousCount:       number;
  coverageGaps:         string[];
  // Separation reference (for Investment vs Operational display)
  operationalReference: {
    totalRevenue:    number;
    totalExpenses:   number;
    operationalNet:  number;
  };
}

export interface MonthlyInvestmentEntry {
  month:          string;  // "YYYY-MM"
  entity:         EntityLayer;
  applications:   number;
  redemptions:    number;
  netFlow:        number;  // applications - redemptions
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deriveReconciledStatus(confidence: ClassificationConfidence): ReconciledStatus {
  if (confidence === "confirmed" || confidence === "probable") return "conciliado";
  if (confidence === "ambiguous") return "revisão pendente";
  return "não conciliável";
}

function deriveInvestmentCategory(txn: BankTransaction): InvestmentCategory {
  if (txn.managerialCategory === "aplicacao_financeira") return "aplicacao";
  if (txn.managerialCategory === "resgate_financeiro")   return "resgate";
  if (txn.managerialCategory === "transferencia_interna_enviada")   return "transferencia_possivelmente_investimento";
  if (txn.managerialCategory === "transferencia_interna_recebida")  return "retorno_possivelmente_investimento";
  return "revisao_manual";
}

function txnToEntry(txn: BankTransaction, isAmbiguous: boolean): InvestmentEntry {
  const invCat   = deriveInvestmentCategory(txn);
  const status   = deriveReconciledStatus(txn.classificationConfidence);
  return {
    transactionId:           txn.id,
    documentId:              txn.documentId,
    bank:                    txn.bank,
    accountName:             txn.accountName,
    entity:                  txn.entity,
    transactionDate:         txn.transactionDate,
    descriptionOriginal:     txn.descriptionOriginal,
    amount:                  Math.abs(txn.amount),
    direction:               txn.direction,
    counterpartyName:        txn.counterpartyName,
    managerialCategory:      txn.managerialCategory,
    investmentCategory:      invCat,
    classificationConfidence: txn.classificationConfidence,
    classificationNote:      txn.classificationNote,
    reconciledStatus:        status,
    excludedFromOperational: txn.excludedFromConsolidated,
    isAmbiguous,
    notes: isAmbiguous
      ? "Item na fila de revisão — possível movimentação de investimento não confirmada."
      : txn.classificationNote,
  };
}

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

// ─── Main export ──────────────────────────────────────────────────────────────

export async function buildInvestmentQuery(): Promise<InvestmentQueryResult> {
  const allDocs  = await getAllDocuments();
  const doneDocs = allDocs.filter((d) => d.status === "done");
  const allTxns  = await getAllTransactions();

  // Compute operational reference for separation display
  // (lightweight — avoid importing buildFinancialQuery to prevent circular deps)
  const REVENUE_CATS = new Set<ManagerialCategory>([
    "receita_recorrente", "receita_projeto", "receita_eventual",
  ]);
  const EXPENSE_CATS = new Set<ManagerialCategory>([
    "fornecedor_operacional", "freelancer_terceiro", "folha_remuneracao",
    "prolabore_retirada", "imposto_tributo", "tarifa_bancaria",
    "software_assinatura", "marketing_midia", "deslocamento_combustivel",
    "alimentacao_representacao", "despesa_pessoal_misturada", "despesa_ambigua",
  ]);
  let opRevenue = 0, opExpenses = 0;
  for (const t of allTxns) {
    if (t.excludedFromConsolidated) continue;
    const amt = Math.abs(t.amount);
    if (REVENUE_CATS.has(t.managerialCategory) && t.direction === "credit") opRevenue += amt;
    if (EXPENSE_CATS.has(t.managerialCategory) && t.direction === "debit")  opExpenses += amt;
  }

  const empty: InvestmentQueryResult = {
    hasData: false,
    hasInvestmentData: false,
    applications: [], redemptions: [], reviewQueue: [],
    totalApplications: 0, totalRedemptions: 0, netInvested: 0,
    byEntity: [], monthlyFlow: [],
    affectedDocuments: 0, affectedAccounts: [],
    periodStart: null, periodEnd: null,
    confirmedCount: 0, ambiguousCount: 0,
    coverageGaps: allDocs.length === 0
      ? ["Nenhum extrato ingerido. Acesse /awq/ingest para iniciar."]
      : [`${allDocs.length} documento(s) aguardando processamento.`],
    operationalReference: { totalRevenue: opRevenue, totalExpenses: opExpenses, operationalNet: opRevenue - opExpenses },
  };

  if (doneDocs.length === 0) return empty;

  const docIds = new Set(doneDocs.map((d) => d.id));
  const relevantTxns = allTxns.filter((t) => docIds.has(t.documentId));

  // ── Partition transactions ────────────────────────────────────────────────
  const confirmedInvestment: BankTransaction[] = [];
  const reviewCandidates:    BankTransaction[] = [];

  for (const t of relevantTxns) {
    if (CONFIRMED_INVESTMENT_CATS.has(t.managerialCategory)) {
      confirmedInvestment.push(t);
    } else if (
      POSSIBLE_INVESTMENT_CATS.has(t.managerialCategory) &&
      t.excludedFromConsolidated &&
      !t.isIntercompany   // not a matched intercompany pair — could be investment
    ) {
      reviewCandidates.push(t);
    }
  }

  const hasInvestmentData = confirmedInvestment.length > 0 || reviewCandidates.length > 0;
  if (!hasInvestmentData) {
    return {
      ...empty,
      hasData: true,
      hasInvestmentData: false,
      coverageGaps: [
        "Nenhuma transação de aplicação ou resgate identificada nos extratos processados.",
        "Classifique transações como 'aplicacao_financeira' ou 'resgate_financeiro' para ativar esta área.",
      ],
    };
  }

  // ── Build entries ─────────────────────────────────────────────────────────
  const applications = confirmedInvestment
    .filter((t) => t.managerialCategory === "aplicacao_financeira" && t.direction === "debit")
    .map((t) => txnToEntry(t, false))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  const redemptions = confirmedInvestment
    .filter((t) => t.managerialCategory === "resgate_financeiro" && t.direction === "credit")
    .map((t) => txnToEntry(t, false))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  const reviewQueue = reviewCandidates
    .map((t) => txnToEntry(t, true))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalApplications = applications.reduce((s, e) => s + e.amount, 0);
  const totalRedemptions  = redemptions.reduce((s, e) => s + e.amount, 0);
  const netInvested       = totalApplications - totalRedemptions;

  // ── By entity ─────────────────────────────────────────────────────────────
  const entityMap = new Map<EntityLayer, {
    apps: number; red: number; confirmed: number; ambiguous: number;
    last: string | null; accounts: Set<string>;
  }>();

  const initEntity = () => ({ apps: 0, red: 0, confirmed: 0, ambiguous: 0, last: null as string | null, accounts: new Set<string>() });

  for (const e of applications) {
    if (!entityMap.has(e.entity)) entityMap.set(e.entity, initEntity());
    const rec = entityMap.get(e.entity)!;
    rec.apps += e.amount;
    rec.confirmed++;
    rec.last = maxDate(rec.last, e.transactionDate);
    rec.accounts.add(e.accountName);
  }
  for (const e of redemptions) {
    if (!entityMap.has(e.entity)) entityMap.set(e.entity, initEntity());
    const rec = entityMap.get(e.entity)!;
    rec.red += e.amount;
    rec.confirmed++;
    rec.last = maxDate(rec.last, e.transactionDate);
    rec.accounts.add(e.accountName);
  }
  for (const e of reviewQueue) {
    if (!entityMap.has(e.entity)) entityMap.set(e.entity, initEntity());
    const rec = entityMap.get(e.entity)!;
    rec.ambiguous++;
    rec.accounts.add(e.accountName);
  }

  const byEntity: EntityInvestmentSummary[] = Array.from(entityMap.entries()).map(([entity, rec]) => ({
    entity,
    label:            ENTITY_LABELS[entity] ?? entity,
    totalApplications: rec.apps,
    totalRedemptions:  rec.red,
    netInvested:       rec.apps - rec.red,
    confirmedCount:    rec.confirmed,
    ambiguousCount:    rec.ambiguous,
    lastActivity:      rec.last,
    accounts:          Array.from(rec.accounts),
  }));

  // ── Monthly flow ──────────────────────────────────────────────────────────
  const monthlyMap = new Map<string, MonthlyInvestmentEntry>();

  for (const e of applications) {
    const month = e.transactionDate.slice(0, 7);
    const key   = `${e.entity}__${month}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { month, entity: e.entity, applications: 0, redemptions: 0, netFlow: 0 });
    monthlyMap.get(key)!.applications += e.amount;
  }
  for (const e of redemptions) {
    const month = e.transactionDate.slice(0, 7);
    const key   = `${e.entity}__${month}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { month, entity: e.entity, applications: 0, redemptions: 0, netFlow: 0 });
    monthlyMap.get(key)!.redemptions += e.amount;
  }
  for (const entry of Array.from(monthlyMap.values())) {
    entry.netFlow = entry.applications - entry.redemptions;
  }

  const monthlyFlow = Array.from(monthlyMap.values()).sort(
    (a, b) => `${a.month}${a.entity}`.localeCompare(`${b.month}${b.entity}`)
  );

  // ── Coverage ──────────────────────────────────────────────────────────────
  const allEntries    = [...applications, ...redemptions, ...reviewQueue];
  const affectedDocIds = new Set(allEntries.map((e) => e.documentId));
  const affectedAccounts = Array.from(new Set(allEntries.map((e) => e.accountName)));

  const periodStart = allEntries.reduce<string | null>(
    (min, e) => minDate(min, e.transactionDate), null
  );
  const periodEnd = allEntries.reduce<string | null>(
    (max, e) => maxDate(max, e.transactionDate), null
  );

  const confirmedCount = applications.length + redemptions.length;
  const ambiguousCount = reviewQueue.length;

  const coverageGaps: string[] = [];
  if (ambiguousCount > 0) {
    coverageGaps.push(`${ambiguousCount} transação(ões) na fila de revisão — possível investimento não confirmado.`);
  }
  if (netInvested > 0 && totalRedemptions === 0) {
    coverageGaps.push("Nenhum resgate identificado. Verifique se os extratos de conta investimento foram ingeridos.");
  }
  if (applications.length === 0) {
    coverageGaps.push("Nenhuma aplicação confirmada — classifique transações como 'aplicacao_financeira'.");
  }

  return {
    hasData:           true,
    hasInvestmentData: true,
    applications,
    redemptions,
    reviewQueue,
    totalApplications,
    totalRedemptions,
    netInvested,
    byEntity,
    monthlyFlow,
    affectedDocuments: affectedDocIds.size,
    affectedAccounts,
    periodStart,
    periodEnd,
    confirmedCount,
    ambiguousCount,
    coverageGaps,
    operationalReference: {
      totalRevenue:   opRevenue,
      totalExpenses:  opExpenses,
      operationalNet: opRevenue - opExpenses,
    },
  };
}
