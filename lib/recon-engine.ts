// ─── Conciliação Inteligente — motor de matching (4 vias em cascata) ─────────
// PR-3: Via 1 (trava determinística) + Via 2 (scoring aditivo) + DIFF de tarifa.
// Vias 3 (fuzzy N:1/1:N) e 4 (memória) entram no PR-4.
//
// Idempotente: tx já agrupadas (recon_match → grupo não revertido) são puladas,
// e o motor só processa recon_status='unmatched'. Reprocessar não duplica grupos.
//
// Toda escrita em recon_* passa por lib/recon-db.ts (nada de mutation no cliente).

import {
  getUnmatchedBankTx,
  getOpenLedgerEntries,
  getMemory,
  getActivelyMatchedTxIds,
  createGroupWithMatches,
  insertLedgerEntry,
  setBankTxStatus,
  updateLedgerOpen,
  type EngineBankTx,
  type EngineLedger,
  type NewLedgerInput,
  type NewGroupInput,
  type NewMatchInput,
  type MemRecord,
  type RuleRow,
  getRules,
} from "@/lib/recon-db";
import {
  scoreCandidate,
  stateFromScore,
  normalizeKey,
  subsetSum,
  matchRule,
  TETO_TARIFA,
  type ScoreCand,
} from "@/lib/recon-scoring";
import type { BU } from "@/lib/recon-types";

export interface ReconcileResult {
  bu: BU;
  ran: boolean;
  processed: number;
  auto: number;
  suggested: number;
  weak: number;
  exceptions: number;
  note?: string;
}

const CENT = 0.01;
// Parâmetros do motor configuráveis por env (sem deploy):
const WINDOW_DAYS = Number(process.env.RECON_WINDOW_DAYS ?? 7) || 7;   // janela ±dias
const VALUE_TOL   = Number(process.env.RECON_VALUE_TOL ?? 0.03) || 0.03; // tolerância de valor (±%)

/** Dependências de DB do motor — injetáveis para teste (default = recon-db). */
export interface ReconcileDeps {
  getUnmatchedBankTx(bu: BU): Promise<EngineBankTx[]>;
  getOpenLedgerEntries(bu: BU): Promise<EngineLedger[]>;
  getMemory(bu: BU): Promise<Map<string, MemRecord>>;
  getActivelyMatchedTxIds(bu: BU): Promise<Set<string>>;
  getRules(bu: BU): Promise<RuleRow[]>;
  createGroupWithMatches(group: NewGroupInput, matches: NewMatchInput[]): Promise<string>;
  insertLedgerEntry(input: NewLedgerInput): Promise<string>;
  setBankTxStatus(id: string, status: "matched" | "partial"): Promise<void>;
  updateLedgerOpen(id: string, openAmount: number, status: string): Promise<void>;
}

const defaultDeps: ReconcileDeps = {
  getUnmatchedBankTx,
  getOpenLedgerEntries,
  getMemory,
  getActivelyMatchedTxIds,
  getRules,
  createGroupWithMatches,
  insertLedgerEntry,
  setBankTxStatus,
  updateLedgerOpen,
};

/** kind de lançamento compatível com a direção da tx. */
function compatibleKind(direction: "IN" | "OUT", kind: string): boolean {
  return direction === "IN" ? kind === "AR" : kind === "AP";
}

/**
 * Executa o motor de conciliação para uma BU. Idempotente.
 * Persiste grupos/matches e materializa recon_status / open_amount.
 */
export async function reconcile(bu: BU, deps: ReconcileDeps = defaultDeps): Promise<ReconcileResult> {
  const [unmatched, ledgerAll, memory, alreadyMatched, rules] = await Promise.all([
    deps.getUnmatchedBankTx(bu),
    deps.getOpenLedgerEntries(bu),
    deps.getMemory(bu),
    deps.getActivelyMatchedTxIds(bu),
    deps.getRules(bu),
  ]);
  const memoryKeys = new Set(memory.keys());

  // open_amount é mutável durante o run — trabalha numa cópia em memória.
  const ledger = ledgerAll.map((l) => ({ ...l }));
  const result: ReconcileResult = {
    bu, ran: true, processed: 0, auto: 0, suggested: 0, weak: 0, exceptions: 0,
  };

  for (const tx of unmatched) {
    if (alreadyMatched.has(tx.id)) continue;  // idempotência
    result.processed++;
    const absTx = Math.abs(tx.amount);

    // ── VIA 1 — TRAVA DETERMINÍSTICA (bypassa o scoring) ──
    const det = ledger.find(
      (c) =>
        c.open_amount > 0 &&
        c.doc_ref != null &&
        (c.doc_ref === tx.txid || c.doc_ref === tx.e2e_id) &&
        Math.abs(c.open_amount - absTx) <= CENT,
    );
    if (det) {
      await applyMatch(tx, det, absTx, "deterministic", 100, "auto");
      result.auto++;
      continue;
    }

    // ── VIA 2 — SCORING ADITIVO ──
    const cands = ledger.filter(
      (c) =>
        c.open_amount > 0 &&
        compatibleKind(tx.direction, c.kind) &&
        (c.due_date == null || calWithin(tx.value_date, c.due_date, WINDOW_DAYS)) &&
        absTx >= c.open_amount * (1 - VALUE_TOL) - TETO_TARIFA &&
        absTx <= c.open_amount * (1 + VALUE_TOL) + TETO_TARIFA,
    );

    let best: EngineLedger | null = null;
    let bestScore = -1;
    let bestDiff = 0;
    for (const c of cands) {
      const sc: ScoreCand = {
        openAmount: c.open_amount,
        dueDate: c.due_date,
        counterparty: c.counterparty,
        counterDoc: c.counter_doc,
        memoryKnown: tx.counterparty != null && memoryKeys.has(normalizeKey(tx.counterparty)),
      };
      const br = scoreCandidate(
        { absAmount: absTx, valueDate: tx.value_date, counterparty: tx.counterparty, counterDoc: tx.counter_doc },
        sc,
      );
      if (br.total > bestScore) { bestScore = br.total; best = c; bestDiff = br.diff; }
    }

    const state = best ? stateFromScore(bestScore) : "exception";
    if (best && state !== "exception") {
      const matches: { bank_tx_id: string | null; ledger_id: string | null; applied_amount: number }[] = [];
      const absDiff = Math.abs(bestDiff);
      let newLedgerOpen: number;
      let txStatus: "matched" | "partial";

      if (absDiff > CENT && absDiff <= TETO_TARIFA) {
        // Diferença dentro do teto → tarifa/IOF/juros. O DIFF absorve a sobra e
        // o lançamento FECHA (razão fecha — teste 6). Classifica o DIFF por
        // recon_rule quando alguma casar (ex.: "Tarifa Cora", "IOF").
        const rule = matchRule(
          { counterparty: tx.counterparty, raw_descr: tx.raw_descr, counter_doc: tx.counter_doc },
          rules,
        );
        const diffLedgerId = await deps.insertLedgerEntry({
          bu,
          kind: "DIFF",
          amount: round2(bestDiff),
          open_amount: 0,
          categoria: rule?.set_categoria ?? "despesa_financeira",
          conta_contabil: rule?.set_conta ?? "4.x despesa_financeira",
          is_intercompany: rule?.set_intercompany ?? false,
          counterparty: tx.counterparty,
          doc_ref: tx.e2e_id ?? tx.txid,
          origem: "banco",
          status: "conciliado",
        });
        if (bestDiff >= 0) {
          // tx > esperado: aplica o aberto ao lançamento + a sobra ao DIFF.
          matches.push({ bank_tx_id: tx.id, ledger_id: best.id, applied_amount: round2(best.open_amount) });
          matches.push({ bank_tx_id: tx.id, ledger_id: diffLedgerId, applied_amount: round2(bestDiff) });
        } else {
          // tx < esperado (tarifa retida): aplica toda a tx ao lançamento e
          // o DIFF (write-off) fecha o residual do lançamento.
          matches.push({ bank_tx_id: tx.id, ledger_id: best.id, applied_amount: round2(absTx) });
          matches.push({ bank_tx_id: null, ledger_id: best.id, applied_amount: round2(absDiff) });
        }
        newLedgerOpen = 0;
        txStatus = "matched"; // Σ applied da tx == absTx em ambos os casos
      } else {
        // Sem tarifa: aplica o mínimo entre tx e aberto.
        const applied = round2(Math.min(absTx, best.open_amount));
        matches.push({ bank_tx_id: tx.id, ledger_id: best.id, applied_amount: applied });
        newLedgerOpen = round2(Math.max(0, best.open_amount - applied));
        txStatus = applied >= absTx - CENT ? "matched" : "partial";
      }

      const groupState = state === "auto" ? "auto" : state === "suggested" ? "suggested" : "weak";
      await deps.createGroupWithMatches(
        { bu, confidence: Math.round(bestScore), method: "heuristic", state: groupState },
        matches,
      );

      best.open_amount = newLedgerOpen;
      await deps.updateLedgerOpen(best.id, newLedgerOpen, newLedgerOpen <= CENT ? "conciliado" : "parcial");
      await deps.setBankTxStatus(tx.id, txStatus);

      if (state === "auto") result.auto++;
      else if (state === "suggested") result.suggested++;
      else result.weak++;
      continue;
    }

    // ── VIA 3 — FUZZY N:1 / 1:N (subset-sum por contraparte) ──
    const cpKey = tx.counterparty ? normalizeKey(tx.counterparty) : "";
    if (cpKey) {
      const pool = ledger.filter(
        (c) =>
          c.open_amount > 0 &&
          compatibleKind(tx.direction, c.kind) &&
          normalizeKey(c.counterparty) === cpKey &&
          (c.due_date == null || calWithin(tx.value_date, c.due_date, WINDOW_DAYS)),
      );
      // Pool grande → abortar subset-sum (não travar o run); cai p/ exceção.
      if (pool.length > 0 && pool.length <= 30) {
        const idx = subsetSum(pool.map((p) => p.open_amount), absTx, 5, CENT);
        // N:1 exige ≥2 itens (1 item exato já seria pego pela Via 2).
        if (idx && idx.length >= 2) {
          const picked = idx.map((i) => pool[i]);
          await applyFuzzy(tx, picked, 75, "matched");
          result.suggested++;
          continue;
        }
        // Adiantamento: tx cobre todo o pool e ainda sobra (excedente = advance).
        const poolSum = round2(pool.reduce((a, c) => a + c.open_amount, 0));
        if (poolSum > CENT && poolSum < absTx - CENT) {
          await applyFuzzy(tx, pool, 70, "partial");
          result.suggested++;
          continue;
        }
      }
    }

    // ── VIA 4 — MEMÓRIA (cria lançamento provisório do banco) ──
    const mem = cpKey ? memory.get(cpKey) : undefined;
    if (mem) {
      const leId = await deps.insertLedgerEntry({
        bu,
        kind: mem.kind ?? "AR",
        amount: round2(absTx),
        open_amount: 0,
        categoria: mem.categoria ?? "memoria",
        conta_contabil: mem.conta_contabil ?? "x",
        counterparty: tx.counterparty,
        doc_ref: tx.e2e_id ?? tx.txid,
        origem: "banco",
        status: "conciliado",
      });
      await deps.createGroupWithMatches(
        { bu, confidence: 60, method: "memory", state: "suggested" },
        [{ bank_tx_id: tx.id, ledger_id: leId, applied_amount: round2(absTx) }],
      );
      await deps.setBankTxStatus(tx.id, "matched");
      result.suggested++;
      continue;
    }

    // ── SEM MATCH — permanece 'unmatched' (fila de Exceções). A pré-classificação
    //    por recon_rule é aplicada na resolução (UI/PR-5); não persistimos um
    //    lançamento provisório aqui para manter o run idempotente.
    result.exceptions++;
  }

  return result;

  // ── helper local: aplica match determinístico 1:1 ──
  async function applyMatch(
    tx: EngineBankTx,
    cand: EngineLedger,
    absTx: number,
    method: "deterministic",
    confidence: number,
    state: "auto",
  ) {
    const applied = round2(Math.min(absTx, cand.open_amount));
    await deps.createGroupWithMatches(
      { bu, confidence, method, state },
      [{ bank_tx_id: tx.id, ledger_id: cand.id, applied_amount: applied }],
    );
    const newOpen = round2(Math.max(0, cand.open_amount - applied));
    cand.open_amount = newOpen;
    await deps.updateLedgerOpen(cand.id, newOpen, newOpen <= CENT ? "conciliado" : "parcial");
    await deps.setBankTxStatus(tx.id, applied >= absTx - CENT ? "matched" : "partial");
  }

  // ── helper local: aplica match fuzzy N:1 (fecha cada lançamento do subset) ──
  async function applyFuzzy(
    tx: EngineBankTx,
    picked: EngineLedger[],
    confidence: number,
    txStatus: "matched" | "partial",
  ) {
    const matches = picked.map((c) => ({
      bank_tx_id: tx.id,
      ledger_id: c.id,
      applied_amount: round2(c.open_amount),
    }));
    await deps.createGroupWithMatches(
      { bu, confidence, method: "fuzzy", state: "suggested" },
      matches,
    );
    for (const c of picked) {
      await deps.updateLedgerOpen(c.id, 0, "conciliado");
      c.open_amount = 0;
    }
    await deps.setBankTxStatus(tx.id, txStatus);
  }
}

function calWithin(a: string, b: string, days: number): boolean {
  const diff = Math.abs(new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime());
  return diff <= days * 86_400_000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
