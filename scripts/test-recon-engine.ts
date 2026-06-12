/**
 * test-recon-engine.ts — Conciliação Inteligente, motor Vias 1–2 + DIFF (PR-3).
 *
 * Testa reconcile() contra um fake in-memory que espelha a semântica do schema
 * 003 (sem precisar de Supabase/Postgres). Cobre os critérios de aceite:
 *   • Teste 2  — idempotência (rodar 2× não duplica grupos)
 *   • Teste 3  — trava determinística (txid/e2e → deterministic/100/auto)
 *   • Teste 6  — tarifa/IOF → match + ledger_entry(DIFF), razão fecha
 *
 * Uso: npx tsx scripts/test-recon-engine.ts
 */

import { reconcile, type ReconcileDeps } from "../lib/recon-engine";
import type {
  EngineBankTx, EngineLedger, NewLedgerInput, NewGroupInput, NewMatchInput, MemRecord, RuleRow,
} from "../lib/recon-db";

// ── Fake store espelhando a semântica do schema 003 ──────────────────────────
function makeStore(
  txs: EngineBankTx[],
  ledgers: EngineLedger[],
  memory: Map<string, MemRecord> = new Map(),
  rules: RuleRow[] = [],
) {
  const tx = new Map(txs.map((t) => [t.id, { ...t }]));
  const led = new Map(ledgers.map((l) => [l.id, { ...l }]));
  const groups: (NewGroupInput & { id: string })[] = [];
  const matches: (NewMatchInput & { group_id: string })[] = [];
  let gseq = 0, lseq = 100;

  const deps: ReconcileDeps = {
    async getUnmatchedBankTx(bu) {
      return [...tx.values()].filter((t) => t.bu === bu && t.recon_status === "unmatched");
    },
    async getOpenLedgerEntries(bu) {
      return [...led.values()].filter(
        (l) => l.bu === bu && (l.status === "aberto" || l.status === "parcial") && l.open_amount > 0,
      );
    },
    async getMemory() { return memory; },
    async getRules() { return rules; },
    async getActivelyMatchedTxIds(bu) {
      const active = new Set(groups.filter((g) => g.bu === bu && g.state !== "reverted").map((g) => g.id));
      return new Set(
        matches.filter((m) => m.bank_tx_id && active.has(m.group_id)).map((m) => m.bank_tx_id as string),
      );
    },
    async createGroupWithMatches(g, ms) {
      const id = "g" + (++gseq);
      groups.push({ ...g, id });
      for (const m of ms) matches.push({ ...m, group_id: id });
      return id;
    },
    async insertLedgerEntry(i: NewLedgerInput) {
      const id = "L" + (++lseq);
      led.set(id, {
        id, bu: i.bu, kind: i.kind, due_date: i.due_date ?? null, amount: i.amount,
        open_amount: i.open_amount, categoria: i.categoria, conta_contabil: i.conta_contabil,
        counterparty: i.counterparty ?? null, counter_doc: i.counter_doc ?? null,
        doc_ref: i.doc_ref ?? null, status: i.status ?? "aberto",
      });
      return id;
    },
    async setBankTxStatus(id, s) { tx.get(id)!.recon_status = s; },
    async updateLedgerOpen(id, open, s) { const l = led.get(id)!; l.open_amount = open; l.status = s; },
  };
  return { deps, tx, led, groups, matches };
}

function mkTx(p: Partial<EngineBankTx> & { id: string; amount: number; value_date: string }): EngineBankTx {
  return {
    bu: "AWQ", direction: p.amount >= 0 ? "IN" : "OUT", counterparty: null, counter_doc: null,
    e2e_id: null, txid: null, raw_descr: null, recon_status: "unmatched", ...p,
  } as EngineBankTx;
}
function mkLed(p: Partial<EngineLedger> & { id: string; kind: string; amount: number; open_amount: number }): EngineLedger {
  return {
    bu: "AWQ", due_date: null, categoria: "x", conta_contabil: "1.x", counterparty: null,
    counter_doc: null, doc_ref: null, status: "aberto", ...p,
  } as EngineLedger;
}

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL", name, extra); }
}

async function main() {
  // ── TEST 3 — trava determinística ──
  console.log("TEST 3 — trava determinística");
  {
    const s = makeStore(
      [mkTx({ id: "t1", amount: 1000, value_date: "2026-03-10", txid: "TX-1" })],
      [mkLed({ id: "a1", kind: "AR", amount: 1000, open_amount: 1000, doc_ref: "TX-1", due_date: "2026-03-10" })],
    );
    const r = await reconcile("AWQ", s.deps);
    check("1 grupo deterministic", s.groups.length === 1 && s.groups[0].method === "deterministic");
    check("confidence=100 state=auto", s.groups[0].confidence === 100 && s.groups[0].state === "auto");
    check("tx matched", s.tx.get("t1")!.recon_status === "matched");
    check("AR fechado (open=0)", s.led.get("a1")!.open_amount === 0 && s.led.get("a1")!.status === "conciliado");
    check("result.auto=1", r.auto === 1);
  }

  // ── TEST 6 — tarifa/DIFF ──
  console.log("TEST 6 — tarifa/DIFF");
  {
    const s = makeStore(
      [mkTx({ id: "t2", amount: 998, value_date: "2026-03-10", counter_doc: "12345678000190" })],
      [mkLed({ id: "a2", kind: "AR", amount: 1000, open_amount: 1000, due_date: "2026-03-10", counter_doc: "12345678000190" })],
    );
    const r = await reconcile("AWQ", s.deps);
    const diffLed = [...s.led.values()].find((l) => l.kind === "DIFF");
    check("DIFF criado", !!diffLed);
    check("DIFF amount = -2", !!diffLed && Math.abs(diffLed.amount - -2) < 0.001, diffLed ? String(diffLed.amount) : "");
    check("AR fechado", s.led.get("a2")!.open_amount === 0 && s.led.get("a2")!.status === "conciliado");
    check("tx matched", s.tx.get("t2")!.recon_status === "matched");
    const sumTx = s.matches.filter((m) => m.bank_tx_id === "t2").reduce((a, m) => a + m.applied_amount, 0);
    check("Σ applied(tx)=998 (invariante)", Math.abs(sumTx - 998) < 0.001, "got " + sumTx);
    check("não virou exceção", r.exceptions === 0);
  }

  // ── TEST 2 — idempotência ──
  console.log("TEST 2 — idempotência");
  {
    const s = makeStore(
      [mkTx({ id: "t3", amount: 1000, value_date: "2026-03-10", txid: "TX-3" })],
      [mkLed({ id: "a3", kind: "AR", amount: 1000, open_amount: 1000, doc_ref: "TX-3", due_date: "2026-03-10" })],
    );
    await reconcile("AWQ", s.deps);
    const after1 = s.groups.length;
    await reconcile("AWQ", s.deps); // 2ª passada
    check("grupos não duplicam", s.groups.length === after1 && after1 === 1, `after1=${after1} after2=${s.groups.length}`);
  }

  // ── TEST 4 — N:1 (subset-sum fuzzy) ──
  console.log("TEST 4 — N:1 fuzzy");
  {
    const s = makeStore(
      [mkTx({ id: "t4", amount: 1000, value_date: "2026-03-10", counterparty: "Cliente Z" })],
      [
        mkLed({ id: "b1", kind: "AR", amount: 300, open_amount: 300, due_date: "2026-03-09", counterparty: "Cliente Z" }),
        mkLed({ id: "b2", kind: "AR", amount: 300, open_amount: 300, due_date: "2026-03-10", counterparty: "Cliente Z" }),
        mkLed({ id: "b3", kind: "AR", amount: 400, open_amount: 400, due_date: "2026-03-11", counterparty: "Cliente Z" }),
      ],
    );
    const r = await reconcile("AWQ", s.deps);
    check("1 grupo fuzzy", s.groups.length === 1 && s.groups[0].method === "fuzzy");
    check("3 matches", s.matches.filter((m) => m.group_id === s.groups[0].id).length === 3);
    const sumApplied = s.matches.filter((m) => m.bank_tx_id === "t4").reduce((a, m) => a + m.applied_amount, 0);
    check("Σ applied = 1000", Math.abs(sumApplied - 1000) < 0.001, "got " + sumApplied);
    check("tx matched", s.tx.get("t4")!.recon_status === "matched");
    check("3 AR fechados", ["b1", "b2", "b3"].every((id) => s.led.get(id)!.status === "conciliado"));
    check("result.suggested=1", r.suggested === 1);
  }

  // ── TEST 5 — parcial / adiantamento ──
  console.log("TEST 5 — parcial (adiantamento)");
  {
    const s = makeStore(
      [mkTx({ id: "t5", amount: 1000, value_date: "2026-03-10", counterparty: "Cliente W" })],
      [mkLed({ id: "c1", kind: "AR", amount: 700, open_amount: 700, due_date: "2026-03-10", counterparty: "Cliente W" })],
    );
    await reconcile("AWQ", s.deps);
    check("AR fechado (open=0)", s.led.get("c1")!.open_amount === 0 && s.led.get("c1")!.status === "conciliado");
    check("tx partial (sobra=adiantamento)", s.tx.get("t5")!.recon_status === "partial");
    const applied = s.matches.filter((m) => m.bank_tx_id === "t5").reduce((a, m) => a + m.applied_amount, 0);
    check("aplicado = 700 (300 sobra)", Math.abs(applied - 700) < 0.001, "got " + applied);
  }

  // ── TEST 10 — memória (Via 4) ──
  console.log("TEST 10 — memória");
  {
    const memory = new Map<string, MemRecord>([
      ["fornecedor x", { kind: "AP", categoria: "despesa_pessoal", conta_contabil: "4.1" }],
    ]);
    const s = makeStore(
      [mkTx({ id: "t6", amount: -500, value_date: "2026-03-10", counterparty: "Fornecedor X" })],
      [], // nenhum lançamento aberto → sem Via 1/2/3
      memory,
    );
    const r = await reconcile("AWQ", s.deps);
    check("não virou exceção", r.exceptions === 0);
    check("grupo memory/60/suggested", s.groups.length === 1 && s.groups[0].method === "memory" && s.groups[0].confidence === 60 && s.groups[0].state === "suggested");
    const le = [...s.led.values()].find((l) => l.kind === "AP" && l.categoria === "despesa_pessoal");
    check("lançamento provisório criado da memória", !!le);
    check("tx matched", s.tx.get("t6")!.recon_status === "matched");
  }

  // ── PR-hardening — DIFF classificado por recon_rule ──
  console.log("PR-hardening — DIFF classificado por recon_rule");
  {
    const rules: RuleRow[] = [{
      id: "r1", bu: "AWQ", priority: 10, match_field: "raw_descr", pattern: "tarifa",
      set_kind: "DIFF", set_categoria: "tarifa_bancaria", set_conta: "4.1.tarifas",
      set_intercompany: false, active: true,
    }];
    const s = makeStore(
      [mkTx({ id: "t7", amount: 998, value_date: "2026-03-10", counter_doc: "12345678000190", raw_descr: "Tarifa Cora pacote" })],
      [mkLed({ id: "a7", kind: "AR", amount: 1000, open_amount: 1000, due_date: "2026-03-10", counter_doc: "12345678000190" })],
      new Map(), rules,
    );
    await reconcile("AWQ", s.deps);
    const diffLed = [...s.led.values()].find((l) => l.kind === "DIFF");
    check("DIFF criado", !!diffLed);
    check("DIFF categoria veio da regra", !!diffLed && diffLed.categoria === "tarifa_bancaria", diffLed?.categoria);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
