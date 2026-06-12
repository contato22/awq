/**
 * test-recon-integration.ts — motor de conciliação contra Postgres REAL.
 *
 * Diferente de test-recon-engine.ts (fake in-memory), este roda reconcile()
 * com ReconcileDeps lastreadas em SQL real (cliente `postgres`), validando as
 * invariantes de integridade direto no banco (Check E do /verify-real):
 *   • Σ applied_amount == abs(amount) para toda tx 'matched'
 *   • nenhuma tx em > 1 grupo ativo (unicidade)
 *
 * Requer um Postgres com a migration 003 aplicada, apontado por:
 *   RECON_TEST_DB_URL='postgres://user@host:port/db'   (ou opções via env)
 * Sem essa var → SKIP (não falha em CI sem banco).
 *
 * Uso: RECON_TEST_DB_URL='...' npx tsx scripts/test-recon-integration.ts
 */

import postgres from "postgres";
import { reconcile, type ReconcileDeps } from "../lib/recon-engine";
import type { BU } from "../lib/recon-types";

const url = process.env.RECON_TEST_DB_URL;
if (!url) {
  console.log("SKIP — RECON_TEST_DB_URL não definido (integração precisa de Postgres real).");
  process.exit(0);
}

const sql = postgres(url, { onnotice: () => {} });
let pass = 0, fail = 0;
const check = (n: string, c: boolean, e = "") => {
  if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗ FAIL", n, e); }
};

// PostgREST (caminho real do app) entrega date como 'YYYY-MM-DD' e numeric como
// número JS. postgres.js entrega Date/string — normalizamos para o MESMO shape
// que o motor espera (senão a matemática de data/valor diverge do real).
const d = (v: any): string | null => (v == null ? null : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)));
const n = (v: any): number => Number(v);

function makeDeps(bu: BU): ReconcileDeps {
  return {
    async getUnmatchedBankTx() {
      const rows = await sql`select id,bu,amount,value_date,direction,counterparty,counter_doc,e2e_id,txid,raw_descr,recon_status
                       from bank_transaction where bu=${bu} and recon_status='unmatched' order by value_date`;
      return rows.map((r: any) => ({ ...r, amount: n(r.amount), value_date: d(r.value_date) })) as any;
    },
    async getOpenLedgerEntries() {
      const rows = await sql`select id,bu,kind,due_date,amount,open_amount,categoria,conta_contabil,counterparty,counter_doc,doc_ref,status
                       from ledger_entry where bu=${bu} and status in ('aberto','parcial') and open_amount>0`;
      return rows.map((r: any) => ({ ...r, amount: n(r.amount), open_amount: n(r.open_amount), due_date: d(r.due_date) })) as any;
    },
    async getMemory() {
      const rows = await sql`select counterparty_key,kind,categoria,conta_contabil from recon_payee_memory where bu=${bu}`;
      return new Map(rows.map((r: any) => [r.counterparty_key, { kind: r.kind, categoria: r.categoria, conta_contabil: r.conta_contabil }]));
    },
    async getActivelyMatchedTxIds() {
      const rows = await sql`select rm.bank_tx_id from recon_match rm join recon_group g on g.id=rm.group_id
                             where g.bu=${bu} and g.state<>'reverted' and rm.bank_tx_id is not null`;
      return new Set(rows.map((r: any) => r.bank_tx_id));
    },
    async getRules() {
      return await sql`select * from recon_rule where (bu=${bu} or bu is null) order by priority` as any;
    },
    async createGroupWithMatches(group, matches) {
      const [g] = await sql`insert into recon_group ${sql(group as any)} returning id`;
      for (const m of matches) await sql`insert into recon_match ${sql({ group_id: g.id, ...m } as any)}`;
      return g.id;
    },
    async insertLedgerEntry(input) {
      const [r] = await sql`insert into ledger_entry ${sql({ origem: "banco", ...input } as any)} returning id`;
      return r.id;
    },
    async setBankTxStatus(id, status) {
      await sql`update bank_transaction set recon_status=${status} where id=${id}`;
    },
    async updateLedgerOpen(id, openAmount, status) {
      await sql`update ledger_entry set open_amount=${openAmount}, status=${status} where id=${id}`;
    },
  };
}

async function main() {
  // Estado limpo (apenas estas tabelas; ordem respeita FKs).
  await sql`truncate recon_match, recon_group, ledger_entry, bank_transaction, recon_payee_memory, recon_rule restart identity cascade`;

  // Cenário 1: trava determinística (txid). Cenário 2: N:1 fuzzy.
  await sql`insert into bank_transaction (bu,account_id,posted_at,amount,counterparty,txid,e2e_id,source) values
    ('AWQ','a','2026-03-10 12:00-03', 1000.00,'Cliente A','TX-DET','E1','cora_api'),
    ('AWQ','a','2026-03-12 12:00-03', 1000.00,'Cliente B', null,    'E2','cora_api')`;
  await sql`insert into ledger_entry (bu,kind,due_date,amount,open_amount,categoria,conta_contabil,counterparty,doc_ref,origem,status) values
    ('AWQ','AR','2026-03-10', 1000,1000,'rec','1.1','Cliente A','TX-DET','documento','aberto'),
    ('AWQ','AR','2026-03-12', 300, 300,'rec','1.1','Cliente B', null,    'documento','aberto'),
    ('AWQ','AR','2026-03-12', 300, 300,'rec','1.1','Cliente B', null,    'documento','aberto'),
    ('AWQ','AR','2026-03-12', 400, 400,'rec','1.1','Cliente B', null,    'documento','aberto')`;

  const r = await reconcile("AWQ", makeDeps("AWQ"));
  console.log("reconcile:", JSON.stringify({ auto: r.auto, suggested: r.suggested, weak: r.weak, exceptions: r.exceptions }));

  // Estados materializados no banco.
  const grp = await sql`select method,state,confidence from recon_group order by matched_at`;
  check("grupo determinístico (auto/100)", grp.some((g: any) => g.method === "deterministic" && g.state === "auto" && g.confidence === 100), JSON.stringify(grp));
  check("grupo fuzzy (N:1)", grp.some((g: any) => g.method === "fuzzy"), JSON.stringify(grp));

  // Invariante de soma — direto no banco (a query do Check E).
  const inv = await sql`
    select bt.id, bt.amount, sum(rm.applied_amount) aplicado
    from bank_transaction bt
    join recon_match rm on rm.bank_tx_id = bt.id
    join recon_group g on g.id = rm.group_id and g.state <> 'reverted'
    where bt.recon_status='matched'
    group by bt.id, bt.amount
    having abs(sum(rm.applied_amount) - abs(bt.amount)) > 0.01`;
  check("invariante Σ applied = abs(amount) (0 violações)", inv.length === 0, JSON.stringify(inv));

  // Unicidade — nenhuma tx em > 1 grupo ativo.
  const uniq = await sql`
    select rm.bank_tx_id from recon_match rm join recon_group g on g.id=rm.group_id
    where g.state<>'reverted' and rm.bank_tx_id is not null
    group by rm.bank_tx_id having count(distinct g.id) > 1`;
  check("unicidade: nenhuma tx em >1 grupo ativo", uniq.length === 0, JSON.stringify(uniq));

  // Idempotência real: 2ª passada não cria grupos novos.
  const before = (await sql`select count(*)::int n from recon_group`)[0].n;
  await reconcile("AWQ", makeDeps("AWQ"));
  const after = (await sql`select count(*)::int n from recon_group`)[0].n;
  check("idempotente: 2ª passada não duplica grupos", before === after, `before=${before} after=${after}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  await sql.end();
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await sql.end().catch(() => {}); process.exit(1); });
