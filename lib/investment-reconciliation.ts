// ─── AWQ Investment Reconciliation — Canonical Camada 4 ──────────────────────
//
// THE canonical interface for the investment position of AWQ Holding.
//
// CAMADA 4 — Query Patrimonial Canônica (as specified by PAPEL directive):
//   totalInvestedReal         — confirmed position balance (CDB, LCI, etc.)
//   investmentCashAccountBalance — operating cash in investment-vehicle account (NOT invested)
//   investmentApplications    — sum of aplicacao_financeira debits
//   investmentRedemptions     — sum of resgate_financeiro credits
//   investmentFees            — sum of tarifa_bancaria from investment accounts
//   investmentConfidence      — data quality signal
//   investmentSource          — audit trail of data origin
//   reconciliationStatus      — reconciliation state
//   note                      — free text / caveat
//
// ANTI-REGRESSION RULES (invioláveis):
//   ✗ saldo em conta           → NEVER enters totalInvestedReal
//   ✗ reserva de limite/cartão → NEVER enters totalInvestedReal
//   ✗ Pix intercompany         → NEVER enters investmentApplications
//   ✗ Pix para sócio/PF        → NEVER enters investmentApplications
//   ✗ tarifa bancária          → NEVER enters investmentApplications (enters investmentFees)
//   ✗ snapshot sem prova       → NEVER substitutes empirical value without explicit downgrade
//
// DATA PRIORITY:
//   1. Real pipeline (financial-db.ts via investment-query.ts) — when hasInvestmentData=true
//   2. Empirical snapshot (holdingTreasurySnapshot) — when pipeline is empty
//   3. Empty / SEM DADO CONFIÁVEL — when neither source has proof
//
// DO NOT import in client components — uses Node fs via financial-db.

import {
  buildInvestmentQuery,
  type InvestmentQueryResult,
} from "./investment-query";

import {
  holdingTreasurySnapshot,
  type HoldingTreasurySnapshot,
} from "./awq-derived-metrics";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type InvestmentConfidence =
  | "confirmed"          // pipeline or empirical print — highest trust
  | "probable"           // pipeline with ambiguous classification
  | "partial"            // partial coverage (some accounts missing)
  | "empirical_snapshot" // confirmed by bank print, not yet in pipeline
  | "no_data";           // no proof available — show "sem dado confiável"

export type InvestmentSource =
  | "pipeline"           // read from financial-db.ts (real PDF extrato)
  | "empirical_snapshot" // read from holdingTreasurySnapshot (bank print)
  | "pipeline+snapshot"  // real pipeline supplemented by empirical snapshot
  | "none";              // no data

export type ReconciliationStatus =
  | "confirmed"          // all accounts matched, no gaps
  | "partial"            // some accounts ingested, others missing
  | "empirical_only"     // only bank print — extrato not yet ingested
  | "unreconciled"       // pipeline has data but intercompany/fees not fully resolved
  | "no_data";           // nothing to reconcile

/** Canonical investment position for AWQ Holding — Camada 4. */
export interface CanonicalInvestmentPosition {
  // ── Camada 4 fields (mandatory per PAPEL directive) ────────────────────────

  /** Confirmed balance of investment instruments (CDB, LCI, etc.).
   *  NOT the operating account balance. NOT the Pix in/out flows.
   *  Source: pipeline closingBalance of investment accounts OR empirical print. */
  totalInvestedReal:           number | null;

  /** Cash held in the investment-vehicle account but NOT deployed into instruments.
   *  Example: R$1.193,58 in Itaú Empresas conta corrente ≠ R$15.762,62 CDB.
   *  This is NOT investimento. Used for liquidity reporting only. */
  investmentCashAccountBalance: number | null;

  /** Sum of aplicacao_financeira debits confirmed in pipeline or print.
   *  Transfers to self, Pix to sócio, and tarifas are EXCLUDED. */
  investmentApplications:      number;

  /** Sum of resgate_financeiro credits confirmed in pipeline or print.
   *  Partial redemptions reduce position. Full redemption closes it. */
  investmentRedemptions:       number;

  /** Sum of tarifa_bancaria transactions in investment-vehicle accounts.
   *  Tarifas REDUCE net cash but are NOT part of the investment position. */
  investmentFees:              number;

  /** Net observable investment flow = applications - redemptions.
   *  Does NOT equal totalInvestedReal (which includes prior-period balance). */
  netObservableFlow:           number;

  // ── Quality / audit trail ──────────────────────────────────────────────────
  investmentConfidence:        InvestmentConfidence;
  investmentSource:            InvestmentSource;
  reconciliationStatus:        ReconciliationStatus;
  note:                        string | null;

  // ── Coverage metadata ──────────────────────────────────────────────────────
  asOf:                        string | null;   // YYYY-MM-DD of last observation
  periodStart:                 string | null;
  periodEnd:                   string | null;
  affectedAccounts:            string[];

  // ── Operational cash (explicitly separated — NOT investment) ───────────────
  operationalCashBalance:      number | null;   // Cora AWQ saldo operacional
  operationalCashSource:       InvestmentSource;

  // ── Anti-contamination proof ──────────────────────────────────────────────
  /** Items explicitly confirmed as NOT investment — for audit display. */
  confirmedNOT_investment:     Array<{
    label:    string;
    amount:   number;
    category: string;
    proof:    string;
  }>;

  // ── Coverage gaps ──────────────────────────────────────────────────────────
  coverageGaps:                string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the canonical position from the real pipeline result. */
function fromPipeline(q: InvestmentQueryResult): CanonicalInvestmentPosition {
  const hasGaps    = q.coverageGaps.length > 0;
  const confidence: InvestmentConfidence =
    q.confirmedCount > 0 && q.ambiguousCount === 0 ? "confirmed"
    : q.confirmedCount > 0 ? "partial"
    : "probable";

  const recon: ReconciliationStatus =
    !hasGaps                 ? "confirmed"
    : q.affectedDocuments > 0 ? "unreconciled"
    : "partial";

  // Fees: tarifa_bancaria is NOT in investment-query scope — pipeline doesn't
  // track tarifa from investment accounts. Report 0 here (evidence-based only).
  const fees = 0;

  return {
    totalInvestedReal:            null,  // pipeline tracks flows, not position balance
    investmentCashAccountBalance: null,  // pipeline doesn't capture account sub-balances
    investmentApplications:       q.totalApplications,
    investmentRedemptions:        q.totalRedemptions,
    investmentFees:               fees,
    netObservableFlow:            q.netInvested,
    investmentConfidence:         confidence,
    investmentSource:             "pipeline",
    reconciliationStatus:         recon,
    note:
      "Pipeline real activo — posição baseada em fluxos (aplicações/resgates). " +
      "totalInvestedReal indisponível: requer closingBalance da conta investimento " +
      "separado do saldo operacional nos extratos Itaú Empresas.",
    asOf:            q.periodEnd,
    periodStart:     q.periodStart,
    periodEnd:       q.periodEnd,
    affectedAccounts: q.affectedAccounts,
    // Operating cash: not available from investment pipeline
    operationalCashBalance: null,
    operationalCashSource:  "none",
    confirmedNOT_investment: [],
    coverageGaps: q.coverageGaps,
  };
}

/** Build the canonical position from the empirical print snapshot. */
function fromEmpiricalSnapshot(s: HoldingTreasurySnapshot): CanonicalInvestmentPosition {
  return {
    totalInvestedReal:            s.totalInvestedReal,
    investmentCashAccountBalance: s.investmentAccountCash,
    investmentApplications:       s.lastApplicationAmount,
    investmentRedemptions:        0,   // no redemptions in print period
    investmentFees:               s.bankFees,
    netObservableFlow:            s.lastApplicationAmount,   // only confirmed flow
    investmentConfidence:         "empirical_snapshot",
    investmentSource:             "empirical_snapshot",
    reconciliationStatus:         "empirical_only",
    note:
      `Posição empírica confirmada por print bancário (${s.source}). ` +
      "Aguardando extrato PDF para pipeline real. " +
      "totalInvestedReal = R$" + s.totalInvestedReal.toFixed(2) +
      " é o único valor de investimento com prova documental.",
    asOf:        s.asOf,
    periodStart: s.asOf,
    periodEnd:   s.asOf,
    affectedAccounts: [s.investmentBank + " — CDB DI"],
    operationalCashBalance: s.operationalCash,
    operationalCashSource:  "empirical_snapshot",
    confirmedNOT_investment: [
      { label: "Tarifas bancárias Itaú",             amount: s.bankFees,              category: "tarifa_bancaria",              proof: `print ${s.asOf}` },
      { label: "Reserva de Limite Cartão Cora",      amount: s.cardReserveDeposited,  category: "transferencia_interna_enviada", proof: `print ${s.asOf}` },
      { label: "Pix AWQ Producoes (intercompany)",   amount: s.intercompanyTotal,     category: "transferencia_interna_enviada", proof: `print ${s.asOf}` },
      { label: "Pix sócio Miguel Costa",             amount: s.partnerWithdrawals,    category: "prolabore_retirada",            proof: `print ${s.asOf}` },
      { label: "Saldo em conta Itaú (operacional)", amount: s.investmentAccountCash, category: "investmentCashAccountBalance",  proof: `print ${s.asOf}` },
      { label: "Caixa Cora AWQ (operacional)",       amount: s.operationalCash,       category: "caixa_operacional",             proof: `print ${s.asOf}` },
    ],
    coverageGaps: [
      "Extrato PDF Itaú Empresas não ingerido — ingira em /awq/ingest para pipeline real.",
      "Rendimentos CDB não rastreáveis sem extrato histórico.",
    ],
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build the canonical Camada 4 investment position for AWQ Holding.
 *
 * Priority:
 *   1. Real pipeline (PDF extrato ingested) → fromPipeline()
 *   2. Empirical print snapshot             → fromEmpiricalSnapshot()
 *   3. SEM DADO CONFIÁVEL                   → empty position
 *
 * Anti-regression: this function can NEVER:
 *   - add account balance to totalInvestedReal
 *   - add credit card reserve to investmentApplications
 *   - add intercompany Pix to investmentApplications
 *   - add socio Pix to investmentApplications
 *   - add bank fees to investmentApplications
 *
 * @returns CanonicalInvestmentPosition — fully typed, auditable Camada 4 result.
 */
export async function buildCanonicalInvestmentPosition(): Promise<CanonicalInvestmentPosition> {
  // ── Tier 1: Real pipeline ─────────────────────────────────────────────────
  const q = await buildInvestmentQuery();

  if (q.hasData && q.hasInvestmentData) {
    const position = fromPipeline(q);
    // Supplement with empirical snapshot for totalInvestedReal if pipeline
    // doesn't yet resolve position balance (pipelines track flows, not balances).
    // Only supplement if snapshot is more recent than or equal to pipeline period.
    if (position.totalInvestedReal === null) {
      const snap = holdingTreasurySnapshot;
      const snapDate  = snap.asOf;
      const pipeEnd   = position.periodEnd ?? "";
      if (snapDate >= pipeEnd) {
        return {
          ...position,
          totalInvestedReal:            snap.totalInvestedReal,
          investmentCashAccountBalance: snap.investmentAccountCash,
          investmentFees:               snap.bankFees,
          operationalCashBalance:       snap.operationalCash,
          operationalCashSource:        "empirical_snapshot",
          investmentSource:             "pipeline+snapshot",
          investmentConfidence:         "partial",
          confirmedNOT_investment:      fromEmpiricalSnapshot(snap).confirmedNOT_investment,
          note:
            "Pipeline real activo (fluxos). totalInvestedReal suplementado por print " +
            `bancário ${snap.asOf} (${snap.source}). ` +
            "Ingira extrato com closingBalance de investimento para eliminar suplemento.",
        };
      }
    }
    return position;
  }

  // ── Tier 2: Empirical snapshot ────────────────────────────────────────────
  return fromEmpiricalSnapshot(holdingTreasurySnapshot);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmtInvestmentConfidence(c: InvestmentConfidence): {
  label: string;
  color: string;
  bg:    string;
} {
  switch (c) {
    case "confirmed":          return { label: "Confirmado",          color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
    case "probable":           return { label: "Provável",            color: "text-brand-700",   bg: "bg-brand-50 border-brand-200"     };
    case "partial":            return { label: "Parcial",             color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     };
    case "empirical_snapshot": return { label: "Print Bancário",      color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     };
    case "no_data":            return { label: "Sem Dado Confiável",  color: "text-gray-500",    bg: "bg-gray-100 border-gray-200"      };
  }
}

export function fmtReconciliationStatus(s: ReconciliationStatus): {
  label: string;
  color: string;
} {
  switch (s) {
    case "confirmed":       return { label: "Conciliado",        color: "text-emerald-600" };
    case "partial":         return { label: "Parcial",           color: "text-amber-600"   };
    case "empirical_only":  return { label: "Print — sem PDF",   color: "text-amber-600"   };
    case "unreconciled":    return { label: "Não conciliado",    color: "text-red-600"      };
    case "no_data":         return { label: "Sem dados",         color: "text-gray-400"     };
  }
}
