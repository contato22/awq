// ─── AWQ Financial Reconciler — Intercompany detection and elimination ─────────
//
// MANDATE:
//   No internal transfer between AWQ-owned accounts may inflate consolidated
//   revenue OR consolidated expenses. Every intercompany match must be:
//   1. Identified (by amount, proximity, direction pattern)
//   2. Tagged on BOTH sides (intercompanyMatchId)
//   3. Marked excludedFromConsolidated = true
//   4. Logged with a reconciliation note
//
// KNOWN ACCOUNT TOPOLOGY (Q1 2026):
//   Cora  → AWQ Holding / JACQES operating cash
//   Itaú  → Caza Vision operating cash
//
//   Intercompany flows:
//   Cora → Itaú  = AWQ Holding transfer to Caza Vision
//   Itaú → Cora  = Caza Vision transfer to AWQ Holding
//
// ALGORITHM:
//   For each debit in one account, find a credit in another AWQ account
//   with matching amount and date within TOLERANCE_DAYS.
//   Confidence is inversely proportional to date gap and directly proportional
//   to amount match exactness.
//
// DO NOT import this module in client components.

import type { BankTransaction, ManagerialCategory } from "./financial-db";
import { isInvestmentVehicle } from "./bank-account-registry";
import crypto from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOLERANCE_DAYS = 3;      // max calendar days between debit and matching credit
const AMOUNT_TOLERANCE = 0.01; // allow R$0.01 rounding difference

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntercompanyMatch {
  matchId: string;
  type: "pix_entre_contas" | "ted_doc" | "transferencia_automatica" | "aporte_retirada";
  debitTxnId: string;
  creditTxnId: string;
  amount: number;
  debitDate: string;
  creditDate: string;
  debitBank: string;
  creditBank: string;
  debitEntity: string;
  creditEntity: string;
  confidence: "high" | "medium" | "low";
  note: string;
  impactOnConsolidated: "eliminado" | "parcialmente_eliminado" | "pendente_revisao";
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(Math.round((da - db) / (1000 * 60 * 60 * 24)));
}

// ─── Transfer type detection ──────────────────────────────────────────────────

function detectTransferType(desc: string): IntercompanyMatch["type"] {
  const d = desc.toLowerCase();
  if (/\bpix\b/.test(d)) return "pix_entre_contas";
  if (/\bted\b|\bdoc\b/.test(d)) return "ted_doc";
  if (/automatica|automatico|auto/.test(d)) return "transferencia_automatica";
  return "pix_entre_contas"; // most common in Brazilian banks today
}

// ─── Core reconciler ─────────────────────────────────────────────────────────

export function reconcileIntercompany(
  transactions: BankTransaction[]
): { matches: IntercompanyMatch[]; updated: BankTransaction[] } {
  const updated = transactions.map((t) => ({ ...t }));
  const matches: IntercompanyMatch[] = [];
  const matchedIds = new Set<string>();

  // Separate by direction and ensure we only reconcile across DIFFERENT accounts
  const debits  = updated.filter((t) => t.direction === "debit"  && !matchedIds.has(t.id));
  const credits = updated.filter((t) => t.direction === "credit" && !matchedIds.has(t.id));

  for (const debit of debits) {
    if (matchedIds.has(debit.id)) continue;

    for (const credit of credits) {
      if (matchedIds.has(credit.id)) continue;

      // Must be different banks/accounts (not same-account internal movement)
      if (debit.bank === credit.bank && debit.accountName === credit.accountName) continue;

      // Both must belong to AWQ-owned entities
      const bothOwned =
        isAWQOwned(debit.entity) && isAWQOwned(credit.entity);
      if (!bothOwned) continue;

      // Investment vehicle accounts must NOT be matched as intercompany.
      // Transfers to/from BTG Investimentos or other investment vehicles are
      // patrimonial movements (aplicacao_financeira / resgate_financeiro),
      // not revenue/expense eliminations. Matching them as intercompany would
      // override the correct category and hide them from investment-query.ts.
      if (
        isInvestmentVehicle(debit.bank, debit.accountName) ||
        isInvestmentVehicle(credit.bank, credit.accountName)
      ) continue;

      // Amount must match (within tolerance)
      const debitAmt  = Math.abs(debit.amount);
      const creditAmt = Math.abs(credit.amount);
      if (Math.abs(debitAmt - creditAmt) > AMOUNT_TOLERANCE) continue;

      // Date must be within tolerance
      const dayGap = daysBetween(debit.transactionDate, credit.transactionDate);
      if (dayGap > TOLERANCE_DAYS) continue;

      // ── Match found ──
      const matchId = crypto.randomBytes(6).toString("hex");
      const confidence: IntercompanyMatch["confidence"] =
        dayGap === 0 ? "high" : dayGap <= 1 ? "medium" : "low";

      const intercompanyCategory: ManagerialCategory =
        debit.direction === "debit"
          ? "transferencia_interna_enviada"
          : "transferencia_interna_recebida";

      const note =
        `Transferência intercompany reconciliada: ` +
        `${debit.bank} (${debit.entity}) → ${credit.bank} (${credit.entity}). ` +
        `R$${debitAmt.toFixed(2)} | gap ${dayGap}d | confiança ${confidence}`;

      matches.push({
        matchId,
        type: detectTransferType(debit.descriptionOriginal),
        debitTxnId:  debit.id,
        creditTxnId: credit.id,
        amount: debitAmt,
        debitDate:   debit.transactionDate,
        creditDate:  credit.transactionDate,
        debitBank:   debit.bank,
        creditBank:  credit.bank,
        debitEntity:  debit.entity,
        creditEntity: credit.entity,
        confidence,
        note,
        impactOnConsolidated: "eliminado",
      });

      // Tag debit side
      const di = updated.findIndex((t) => t.id === debit.id);
      if (di >= 0) {
        updated[di] = {
          ...updated[di],
          isIntercompany:          true,
          intercompanyMatchId:     matchId,
          excludedFromConsolidated: true,
          managerialCategory:      "transferencia_interna_enviada",
          classificationNote:      note,
        };
      }

      // Tag credit side
      const ci = updated.findIndex((t) => t.id === credit.id);
      if (ci >= 0) {
        updated[ci] = {
          ...updated[ci],
          isIntercompany:           true,
          intercompanyMatchId:      matchId,
          excludedFromConsolidated: true,
          managerialCategory:       "transferencia_interna_recebida",
          classificationNote:       note,
        };
      }

      matchedIds.add(debit.id);
      matchedIds.add(credit.id);
      break; // debit matched — move to next debit
    }
  }

  // Also auto-exclude financial applications and redemptions
  for (const txn of updated) {
    if (
      txn.managerialCategory === "aplicacao_financeira" ||
      txn.managerialCategory === "resgate_financeiro"
    ) {
      const idx = updated.findIndex((t) => t.id === txn.id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], excludedFromConsolidated: true };
      }
    }
  }

  return { matches, updated };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAWQOwned(entity: string): boolean {
  return ["AWQ_Holding", "JACQES", "Caza_Vision", "Intercompany"].includes(entity);
}

// ─── Consolidation summary ────────────────────────────────────────────────────

export interface ConsolidationSummary {
  totalTransactions: number;
  intercompanyMatches: number;
  intercompanyEliminated: number;  // count of transactions eliminated
  amountEliminated: number;        // total BRL amount eliminated
  unmatched: number;               // transactions flagged as possible intercompany but unmatched
  ambiguous: number;               // transactions with ambiguous classification
}

export function buildConsolidationSummary(
  transactions: BankTransaction[],
  matches: IntercompanyMatch[]
): ConsolidationSummary {
  const eliminated = transactions.filter((t) => t.excludedFromConsolidated);
  const amountEliminated = eliminated.reduce((s, t) => s + Math.abs(t.amount), 0);
  const ambiguous = transactions.filter(
    (t) => t.classificationConfidence === "ambiguous" && !t.excludedFromConsolidated
  );

  return {
    totalTransactions: transactions.length,
    intercompanyMatches: matches.length,
    intercompanyEliminated: eliminated.length,
    amountEliminated,
    unmatched: 0, // reserved for future heuristic pass
    ambiguous: ambiguous.length,
  };
}
