// ─── AWQ Auto-Match Engine — similarity-based transaction classification ────────
//
// PURPOSE:
//   For each new/pending bank entry, find the most similar already-classified
//   transaction in the historical ledger and suggest its classification.
//
// SIMILARITY DIMENSIONS:
//   description  (55%) — Jaccard token overlap on normalised word sets
//   amount       (30%) — relative-difference decay (step-function)
//   date         (15%) — same calendar day → likely recurring payment
//
// CONFIDENCE THRESHOLDS:
//   alta  → score ≥ 0.65 (show green badge, auto-apply allowed)
//   media → score ≥ 0.45 (show amber badge, suggest with "Aceitar")
//   baixa → score ≥ 0.35 (show gray badge, informational only)
//   null  → score < 0.35 (no suggestion shown)
//
// CLIENT-SAFE: no Node.js imports — safe to use in browser components.

import type { BankTransaction, ManagerialCategory } from "./financial-db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchReason {
  label: string;
  weight: "forte" | "moderado" | "fraco";
}

export interface AutoMatchResult {
  score: number;
  matchedTxId: string;
  suggestedCounterparty: string | null;
  suggestedCategory: ManagerialCategory;
  suggestedNote: string | null;
  matchReasons: MatchReason[];
  confidence: "alta" | "media" | "baixa";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCORE = 0.35;

// Common words that add noise to token matching — stripped before comparison
const STOPWORDS = new Set([
  "pix", "ted", "doc", "de", "da", "do", "em", "para", "por", "com",
  "via", "ref", "nro", "num", "nf", "nota", "pgto", "pag", "pagto",
  "transferencia", "transf", "dep", "deposito", "cred", "deb",
]);

// ─── Text normalisation ───────────────────────────────────────────────────────

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^\w\s]/g, " ");
}

function tokenize(desc: string): Set<string> {
  return new Set(
    normalise(desc)
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

// ─── Dimension scorers ────────────────────────────────────────────────────────

function descriptionSim(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function amountSim(a: number, b: number): number {
  const max = Math.max(a, b, 1);
  const rel = Math.abs(a - b) / max;
  if (rel === 0)    return 1.00;
  if (rel < 0.01)  return 0.95;
  if (rel < 0.05)  return 0.70;
  if (rel < 0.15)  return 0.40;
  if (rel < 0.30)  return 0.15;
  return 0.00;
}

function dateSim(newDate: string, histDate: string): number {
  const newDay  = parseInt(newDate.split("-")[2], 10);
  const histDay = parseInt(histDate.split("-")[2], 10);
  const diff    = Math.abs(newDay - histDay);
  if (diff === 0) return 1.00; // same calendar day every month → recurring
  if (diff <= 2)  return 0.80;
  if (diff <= 5)  return 0.50;
  if (diff <= 10) return 0.25;
  return 0.00;
}

// ─── Build reasons list ───────────────────────────────────────────────────────

function buildReasons(
  descScore: number,
  amtScore: number,
  dateScore: number,
  counterparty: string | null,
  histCounterparty: string | null,
): MatchReason[] {
  const out: MatchReason[] = [];

  // Same known counterparty → very strong signal
  if (
    counterparty &&
    histCounterparty &&
    normalise(counterparty) === normalise(histCounterparty)
  ) {
    out.push({ label: `Mesma contraparte: ${histCounterparty}`, weight: "forte" });
  }

  if (descScore >= 0.60)      out.push({ label: "Descrição muito similar",         weight: "forte"    });
  else if (descScore >= 0.30) out.push({ label: "Descrição parcialmente similar",   weight: "moderado" });

  if (amtScore >= 0.95)       out.push({ label: "Valor idêntico",                  weight: "forte"    });
  else if (amtScore >= 0.70)  out.push({ label: "Valor próximo",                   weight: "moderado" });
  else if (amtScore >= 0.40)  out.push({ label: "Valor aproximado",                weight: "fraco"    });

  if (dateScore >= 0.90)      out.push({ label: "Data recorrente (mesmo dia)",      weight: "forte"    });
  else if (dateScore >= 0.50) out.push({ label: "Data próxima",                     weight: "moderado" });

  return out;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Returns the best match from `historicalTxs` for `newTx`, or `null` if no
 * candidate reaches MIN_SCORE.
 *
 * `historicalTxs` should be pre-filtered to transactions whose classification
 * confidence is "confirmed" or "probable" (good signal quality). Cap at ~300
 * entries for performance.
 */
export function computeAutoMatch(
  newTx: BankTransaction,
  historicalTxs: BankTransaction[],
): AutoMatchResult | null {
  const newTokens = tokenize(newTx.descriptionOriginal);
  const newAmt    = Math.abs(newTx.amount);

  let bestScore = 0;
  let bestMatch: AutoMatchResult | null = null;

  for (const hist of historicalTxs) {
    if (hist.id === newTx.id)              continue; // skip self
    if (hist.direction !== newTx.direction) continue; // must be same direction

    const descScore = descriptionSim(newTokens, tokenize(hist.descriptionOriginal));
    const amtScore  = amountSim(newAmt, Math.abs(hist.amount));
    const dateScore = dateSim(newTx.transactionDate, hist.transactionDate);

    // Same known counterparty → jump-start score
    let cpBonus = 0;
    if (
      newTx.counterpartyName &&
      hist.counterpartyName &&
      normalise(newTx.counterpartyName) === normalise(hist.counterpartyName)
    ) {
      cpBonus = 0.15;
    }

    const score = Math.min(
      1,
      descScore * 0.55 + amtScore * 0.30 + dateScore * 0.15 + cpBonus,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        score,
        matchedTxId:          hist.id,
        suggestedCounterparty: hist.counterpartyName,
        suggestedCategory:    hist.managerialCategory,
        suggestedNote:        hist.classificationNote,
        matchReasons:         buildReasons(
          descScore, amtScore, dateScore,
          newTx.counterpartyName ?? null,
          hist.counterpartyName ?? null,
        ),
        confidence:
          score >= 0.65 ? "alta" :
          score >= 0.45 ? "media" :
                          "baixa",
      };
    }
  }

  if (!bestMatch || bestScore < MIN_SCORE) return null;
  return bestMatch;
}

// ─── Batch helper ─────────────────────────────────────────────────────────────

/**
 * Compute auto-match for multiple transactions at once.
 * Returns a Map<txId, AutoMatchResult | null>.
 *
 * Uses confirmed/probable historical transactions as the knowledge base.
 * Caps the base at 300 most-recent entries for O(n) performance.
 */
export function batchAutoMatch(
  pending: BankTransaction[],
  allTxs: BankTransaction[],
): Map<string, AutoMatchResult | null> {
  const pendingIds = new Set(pending.map((t) => t.id));

  // Knowledge base: classified transactions outside the pending set
  const base = allTxs
    .filter(
      (t) =>
        !pendingIds.has(t.id) &&
        (t.classificationConfidence === "confirmed" ||
          t.classificationConfidence === "probable"),
    )
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, 300);

  const result = new Map<string, AutoMatchResult | null>();
  for (const tx of pending) {
    result.set(tx.id, computeAutoMatch(tx, base));
  }
  return result;
}
