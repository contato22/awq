// ─── Live Shop — Plano de contas + ledger dupla-entrada — §5 ──────────────────
//
// Mini-P&L da BU Live Shop (consolida 100% na AWQ). Toda escrita é dupla-entrada
// (Σ débito = Σ crédito), valores SEMPRE inteiros em centavos (§13). Bypass do
// ledger é proibido: receita e dedução postam contrapartida.
//
// Pure module — produz journal entries balanceados; a persistência (append-only)
// fica na camada de serviço (lib/live-shop/db.ts).

import type { FeeType, Order } from "./types";
import type { OrderFeeResult } from "./fee-engine";
import { sum, type Money, ratioBps, type Bps } from "./money";

export type AccountType =
  | "revenue" | "platform_deduction" | "deduction" | "cogs"
  | "direct_cost" | "allocation" | "tax" | "asset";

export interface Account {
  code: string;
  type: AccountType;
  sign: 1 | -1; // efeito no resultado: +receita, −custo/dedução
  label: string;
}

// Plano de contas (§5). asset = contas de balanço (não entram no resultado).
export const ACCOUNTS: Record<string, Account> = {
  rev_revenue_share_gmv: { code: "rev_revenue_share_gmv", type: "revenue", sign: 1, label: "Revenue share sobre GMV" },
  rev_retainer:          { code: "rev_retainer",          type: "revenue", sign: 1, label: "Retainer / fee fixo da marca" },
  rev_production_fee:     { code: "rev_production_fee",     type: "revenue", sign: 1, label: "Produção audiovisual da live" },

  ded_tiktok_commission: { code: "ded_tiktok_commission", type: "platform_deduction", sign: -1, label: "Comissão % TikTok Shop" },
  ded_tiktok_fixed_fee:  { code: "ded_tiktok_fixed_fee",  type: "platform_deduction", sign: -1, label: "Taxa fixa por item" },
  ded_tiktok_shipping:   { code: "ded_tiktok_shipping",   type: "platform_deduction", sign: -1, label: "Taxa de serviço de frete" },
  ded_payment_fee:       { code: "ded_payment_fee",       type: "platform_deduction", sign: -1, label: "Taxa de pagamento" },
  ded_affiliate:         { code: "ded_affiliate",         type: "deduction", sign: -1, label: "Comissão creator/afiliado" },
  ded_returns_chargebacks:{ code: "ded_returns_chargebacks", type: "deduction", sign: -1, label: "Devoluções / chargebacks" },

  cogs_product:          { code: "cogs_product",          type: "cogs", sign: -1, label: "CMV do produto" },

  dc_host:               { code: "dc_host",               type: "direct_cost", sign: -1, label: "Host" },
  dc_operator:           { code: "dc_operator",           type: "direct_cost", sign: -1, label: "Operador" },
  dc_set:                { code: "dc_set",                type: "direct_cost", sign: -1, label: "Set" },
  dc_ad_spend:           { code: "dc_ad_spend",           type: "direct_cost", sign: -1, label: "Mídia" },
  dc_gmv_max_ads:        { code: "dc_gmv_max_ads",        type: "direct_cost", sign: -1, label: "GMV Max (alocação compulsória)" },

  alloc_caza_depreciation:{ code: "alloc_caza_depreciation", type: "allocation", sign: -1, label: "Depreciação Caza rateada" },
  alloc_labor:           { code: "alloc_labor",           type: "allocation", sign: -1, label: "Mão de obra rateada" },

  tax_das_simples:       { code: "tax_das_simples",       type: "tax", sign: -1, label: "DAS/Simples" },

  // contas de balanço (clearing) — equilibram a partida dobrada
  ast_settlement_receivable: { code: "ast_settlement_receivable", type: "asset", sign: 1, label: "Repasse a receber (TikTok)" },
  ast_inventory_clearing:    { code: "ast_inventory_clearing",    type: "asset", sign: 1, label: "Estoque / clearing CMV" },
  ast_cost_clearing:         { code: "ast_cost_clearing",         type: "asset", sign: 1, label: "Caixa / a pagar (clearing)" },
} as const;

// Mapa fee_type (engine) → conta de dedução do ledger.
const FEE_TYPE_ACCOUNT: Record<FeeType, string> = {
  commission: "ded_tiktok_commission",
  fixed: "ded_tiktok_fixed_fee",
  shipping: "ded_tiktok_shipping",
  payment: "ded_payment_fee",
  affiliate: "ded_affiliate",
  return: "ded_returns_chargebacks",
};

// ── Journal ──────────────────────────────────────────────────────────────────
export interface JournalLine {
  account: string;
  debit: Money;
  credit: Money;
  memo?: string;
}
export interface JournalEntry {
  ref: string;
  date: string; // YYYY-MM-DD
  source: "api" | "export" | "manual";
  lines: JournalLine[];
}

export function isBalanced(entry: JournalEntry): boolean {
  const d = sum(entry.lines.map((l) => l.debit));
  const c = sum(entry.lines.map((l) => l.credit));
  return d === c;
}

/** Invariante do razão (§12 assert 13): Σ(débito − crédito) de TODO o razão = 0. */
export function ledgerSum(entries: JournalEntry[]): Money {
  return sum(entries.flatMap((e) => e.lines.map((l) => l.debit - l.credit)));
}

/**
 * Cascata de UM pedido (§5) → journal balanceado:
 *   Dr cada dedução de fee (ded_*)         = magnitude
 *   Dr repasse a receber (asset)           = GMV − Σfees
 *     Cr revenue share GMV                 = GMV
 *   ── e, se houver CMV ──
 *   Dr cogs_product = cmv  /  Cr inventory clearing = cmv
 */
export function buildOrderJournal(
  order: Order,
  fees: OrderFeeResult,
  cmv: Money,
): JournalEntry {
  const lines: JournalLine[] = [];
  const date = order.placedAt.slice(0, 10);

  // Receita bruta (GMV) creditada
  lines.push({ account: "rev_revenue_share_gmv", debit: 0, credit: order.gross, memo: `GMV pedido ${order.id}` });

  // Deduções de fee (débito) — uma linha por tipo
  for (const fl of fees.lines) {
    const acct = FEE_TYPE_ACCOUNT[fl.feeType];
    lines.push({ account: acct, debit: fl.amount, credit: 0, memo: `fee ${fl.feeType}` });
  }

  // Repasse a receber = GMV − Σfees (fecha o lado do débito)
  const receivable = order.gross - fees.totalFees;
  lines.push({ account: "ast_settlement_receivable", debit: receivable, credit: 0, memo: "repasse a receber" });

  // CMV (entrada separada, também balanceada dentro do mesmo journal)
  if (cmv > 0) {
    lines.push({ account: "cogs_product", debit: cmv, credit: 0, memo: "CMV" });
    lines.push({ account: "ast_inventory_clearing", debit: 0, credit: cmv, memo: "baixa estoque" });
  }

  const entry: JournalEntry = { ref: `order:${order.id}`, date, source: order.source, lines };
  if (!isBalanced(entry)) {
    throw new Error(`buildOrderJournal: pedido ${order.id} desbalanceado (§13)`);
  }
  return entry;
}

/** Posta um custo direto / rateio / tributo balanceado (Dr conta, Cr clearing). */
export function buildCostJournal(
  ref: string,
  date: string,
  account: string,
  amount: Money,
  source: JournalEntry["source"] = "manual",
): JournalEntry {
  if (!ACCOUNTS[account]) throw new Error(`buildCostJournal: conta desconhecida ${account}`);
  if (amount <= 0) throw new Error(`buildCostJournal: valor deve ser > 0`);
  return {
    ref, date, source,
    lines: [
      { account, debit: amount, credit: 0 },
      { account: "ast_cost_clearing", debit: 0, credit: amount },
    ],
  };
}

// ── Mini-P&L / cascata de contribuição (§5, §7.2) ─────────────────────────────
export interface CascadeInput {
  gmv: Money;
  // deduções de plataforma (magnitudes positivas)
  commission: Money;
  fixed: Money;
  shipping: Money;
  payment: Money;
  affiliate: Money;
  returns: Money;
  // receitas adicionais
  retainer: Money;
  productionFee: Money;
  // custos
  cmv: Money;
  host: Money;
  operator: Money;
  set: Money;
  adSpend: Money;
  gmvMaxAds: Money;
  cazaDepreciation: Money;
  labor: Money;
  // tributo (fora do repasse — responsabilidade do seller)
  dasSimples: Money;
}

export interface CascadeResult {
  gmv: Money;
  platformFees: Money;
  repasse: Money; // GMV − fees auto-deduzidos
  retainer: Money;
  productionFee: Money;
  cmv: Money;
  directCosts: Money;
  allocations: Money;
  contributionMargin: Money;
  dasSimples: Money;
  netToAwq: Money;
  mcBps: Bps; // MC / GMV
  takeRateBps: Bps; // Σ fees plataforma / GMV
}

export function computeCascade(i: CascadeInput): CascadeResult {
  const platformFees = i.commission + i.fixed + i.shipping + i.payment + i.affiliate + i.returns;
  const repasse = i.gmv - platformFees;
  const directCosts = i.host + i.operator + i.set + i.adSpend + i.gmvMaxAds;
  const allocations = i.cazaDepreciation + i.labor;
  const contributionMargin = repasse + i.retainer + i.productionFee - i.cmv - directCosts - allocations;
  const netToAwq = contributionMargin - i.dasSimples;
  return {
    gmv: i.gmv,
    platformFees,
    repasse,
    retainer: i.retainer,
    productionFee: i.productionFee,
    cmv: i.cmv,
    directCosts,
    allocations,
    contributionMargin,
    dasSimples: i.dasSimples,
    netToAwq,
    mcBps: ratioBps(contributionMargin, i.gmv),
    takeRateBps: ratioBps(platformFees, i.gmv),
  };
}

/** Agrega as fee lines de vários pedidos por tipo → entrada da cascata. */
export function feeBreakdown(results: OrderFeeResult[]): Pick<
  CascadeInput, "commission" | "fixed" | "shipping" | "payment" | "affiliate" | "returns"
> {
  const acc = { commission: 0, fixed: 0, shipping: 0, payment: 0, affiliate: 0, returns: 0 };
  for (const r of results) {
    for (const l of r.lines) {
      if (l.feeType === "return") acc.returns += l.amount;
      else acc[l.feeType] += l.amount;
    }
  }
  return acc;
}
