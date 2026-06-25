// ─── Live Shop — Reconciliação fee computado × real + GMV Max — §14.5/§14.6 ───
// A engine (§6) PREVÊ os fees; a Finance API informa o que o TikTok REALMENTE
// deduziu (ls_settlement_line). Delta > tolerância ⇒ alerta. Isto valida
// empiricamente a tabela de fees (Anexo A, confirmed=false).

import type { FeeType, SettlementLineType, SettlementLine } from "./types";
import { ratioBps, type Bps, type Money } from "./money";
import type { OrderFeeResult } from "./fee-engine";

// Tolerância default: 1% (100 bps) sobre o GMV/base do período.
export const DEFAULT_TOLERANCE_BPS: Bps = 100;

// Mapa line_type do settlement (Finance API) → fee_type computado.
const SETTLEMENT_TO_FEE: Partial<Record<SettlementLineType, FeeType>> = {
  commission: "commission",
  shipping: "shipping",
  creator_commission: "affiliate",
  refund: "return",
  // platform_discount / promo_rebate / tax_adj não mapeiam 1:1 → "não modelado"
};

export interface ReconResult {
  computed: Money; // Σ ls_fee_line
  real: Money; // Σ ls_settlement_line (apenas linhas mapeáveis a fee)
  unmodeled: Money; // Σ linhas de settlement sem contrapartida na engine
  deltaAbs: Money; // |computed − real|
  deltaBps: Bps; // delta / base
  withinTolerance: boolean;
  alert: boolean; // !withinTolerance OU unmodeled > 0
}

/**
 * Reconcilia fees computados × settlement real de um período.
 * @param base GMV (ou outra base) para expressar o delta em bps.
 */
export function reconcileFees(
  computedResults: OrderFeeResult[],
  settlementLines: SettlementLine[],
  base: Money,
  toleranceBps: Bps = DEFAULT_TOLERANCE_BPS,
): ReconResult {
  const computed = computedResults
    .flatMap((r) => r.lines)
    .reduce((a, l) => a + l.amount, 0);

  let real = 0;
  let unmodeled = 0;
  for (const sl of settlementLines) {
    if (SETTLEMENT_TO_FEE[sl.lineType]) real += sl.amount;
    else unmodeled += sl.amount;
  }

  const deltaAbs = Math.abs(computed - real);
  const deltaBps = ratioBps(deltaAbs, base || 1);
  const withinTolerance = deltaBps <= toleranceBps;
  return {
    computed,
    real,
    unmodeled,
    deltaAbs,
    deltaBps,
    withinTolerance,
    alert: !withinTolerance || unmodeled > 0,
  };
}

// ── GMV Max — custo obrigatório a partir de jul/2026 (§14.6) ⟨CONFIRMAR⟩ ──────
export interface GmvMaxConfig {
  mandatoryFrom: string; // "YYYY-MM-DD"
  bps: Bps; // 1,5–5% da receita → 150..500 bps (configurável, não hardcode no cálculo)
  confirmed: boolean;
}

export const DEFAULT_GMV_MAX: GmvMaxConfig = {
  mandatoryFrom: "2026-07-01",
  bps: 300, // ponto médio 3% até confirmar regra oficial
  confirmed: false,
};

/** Alocação de GMV Max para um período: bps × receita, só se a data ≥ mandatoryFrom. */
export function gmvMaxAllocation(revenue: Money, date: string, cfg: GmvMaxConfig = DEFAULT_GMV_MAX): Money {
  if (date < cfg.mandatoryFrom) return 0;
  return Math.round((revenue * cfg.bps) / 10_000);
}
