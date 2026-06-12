/**
 * bootstrap-prod.ts — Aplica migrations + backfill na Supabase de PRODUÇÃO via
 * o Management API (api.supabase.com), que é o único caminho com DDL alcançável
 * deste ambiente (Postgres direto 5432 está bloqueado no egress).
 *
 * Requer (secret do ambiente do agente — NUNCA no chat/repo):
 *   SUPABASE_ACCESS_TOKEN   Personal Access Token (sbp_...)
 *   SUPABASE_PROJECT_REF    (opcional; default kkhxxsrgsewjfvnnssyf)
 *
 * Uso:  SUPABASE_ACCESS_TOKEN=sbp_... npx tsx scripts/bootstrap-prod.ts
 *
 * Idempotente: migrations são CREATE ... IF NOT EXISTS; backfill é INSERT ...
 * ON CONFLICT DO NOTHING. Seguro rodar mais de uma vez.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || "kkhxxsrgsewjfvnnssyf";
if (!TOKEN) {
  console.error("BLOQUEADO — defina SUPABASE_ACCESS_TOKEN (Personal Access Token) no ambiente do agente.");
  process.exit(2);
}

const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function q(sql: string): Promise<any[]> {
  const r = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Management API ${r.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return []; }
}

const MIG = (f: string) => readFileSync(join(process.cwd(), "supabase/migrations", f), "utf8");

// Backfill: legado bank_transactions → bank_transaction. BU resolvido por
// bu_bank_account (falha fechada: entity não mapeada não entra). Dedupe (bu,e2e_id).
const BACKFILL_SQL = `
insert into bank_transaction (bu, account_id, posted_at, amount, counterparty, raw_descr, e2e_id, source)
select m.bu,
       bt.entity,
       (bt.transaction_date || ' 12:00:00-03')::timestamptz,
       case when bt.direction = 'debit' then -abs(bt.amount) else abs(bt.amount) end,
       bt.counterparty_name,
       bt.description_original,
       'legacy:' || bt.id,
       'legacy'
from bank_transactions bt
join bu_bank_account m on m.account_id = bt.entity and m.active
where bt.transaction_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
on conflict (bu, e2e_id) do nothing;
`;

// Fila de classificação ENERDY (Fix 2) — ledger provisório + grupo/match por tx.
const ENERDY_SQL = `
insert into ledger_entry (bu,kind,amount,open_amount,categoria,conta_contabil,counterparty,due_date,doc_ref,origem,status,is_intercompany,legacy_label,needs_classification)
select bt.bu, case when bt.direction='IN' then 'AR' else 'AP' end, abs(bt.amount), 0,
       'a_classificar','a_classificar', bt.counterparty, bt.value_date,
       'enerdy:'||bt.id, 'banco','conciliado', false, 'ENERDY', true
from bank_transaction bt
where bt.account_id='ENERDY' and bt.bu='AWQ'
  and not exists (select 1 from recon_match m where m.bank_tx_id = bt.id);

do $do$
declare r record; gid uuid;
begin
  for r in select le.id le_id, le.amount, substring(le.doc_ref from 8)::uuid tx_id
           from ledger_entry le
           where le.legacy_label='ENERDY' and le.needs_classification and le.doc_ref like 'enerdy:%'
             and not exists (select 1 from recon_match m where m.ledger_id = le.id)
  loop
    insert into recon_group (bu,confidence,method,state,matched_by)
      values ('AWQ',0,'manual','suggested','backfill-enerdy') returning id into gid;
    insert into recon_match (group_id, bank_tx_id, ledger_id, applied_amount)
      values (gid, r.tx_id, r.le_id, r.amount);
    update bank_transaction set recon_status='matched' where id = r.tx_id;
  end loop;
end $do$;
`;

async function main() {
  console.log(`▶ projeto ${REF} via Management API`);

  // 1) Migrations (DDL) — ordem 003 → 004 → 005.
  for (const f of ["003_conciliacao_inteligente.sql", "004_recon_rls_hardening.sql", "005_bu_bank_account_enerdy.sql"]) {
    process.stdout.write(`  migration ${f} … `);
    await q(MIG(f));
    console.log("ok");
  }

  // 2) Sanidade do schema.
  const [t] = await q(`select count(*)::int as n from information_schema.tables where table_schema='public' and table_name in ('accounting_period','bank_transaction','ledger_entry','recon_group','recon_match','recon_rule','recon_payee_memory','bu_bank_account')`);
  const [v] = await q(`select count(*)::int as n from information_schema.views where table_name in ('v_saldo_conciliado','v_consolidado_grupo','v_legado_enerdy_revisao')`);
  console.log(`  schema: tabelas=${t?.n}/8  views=${v?.n}/3`);

  // 3) Backfill (idempotente).
  const [legado] = await q(`select count(*)::int as n from bank_transactions`);
  await q(BACKFILL_SQL);
  const [novo] = await q(`select count(*)::int as n from bank_transaction`);
  const semMapa = await q(`select bt.entity, count(*)::int as n from bank_transactions bt left join bu_bank_account m on m.account_id=bt.entity and m.active where m.account_id is null group by bt.entity order by 2 desc`);
  console.log(`  backfill: legado=${legado?.n}  novo(bank_transaction)=${novo?.n}`);
  if (semMapa.length) console.log(`  ⚠ entities não mapeadas (não ingeridas — falha fechada):`, semMapa.map((r: any) => `${r.entity}=${r.n}`).join(", "));

  // 3b) Fila de classificação ENERDY (Fix 2).
  await q(ENERDY_SQL);
  const [enq] = await q(`select count(*)::int as n from v_legado_enerdy_revisao`);
  console.log(`  ENERDY aguardando classificação: ${enq?.n}`);

  // 4) Estado por BU (cobertura/exceções).
  const cov = await q(`select bu, count(*)::int total, count(*) filter (where recon_status in ('matched','partial'))::int conc, count(*) filter (where recon_status='unmatched')::int exc from bank_transaction group by bu order by bu`);
  for (const r of cov as any[]) {
    const pct = r.total ? Math.round((100 * r.conc) / r.total) : 0;
    console.log(`  BU ${r.bu}: total=${r.total} conciliado=${r.conc} exceções=${r.exc} cobertura=${pct}%`);
  }

  console.log("\n✔ Bootstrap concluído. O módulo sai de 'em configuração' e passa a mostrar dados.");
  console.log("  (Razão AP/AR vazio → tx entram como exceções, conforme o N1 do spec; reconciliação evolui com ledger/memória/regras.)");
}

main().catch((e) => { console.error("ERRO:", e instanceof Error ? e.message : e); process.exit(1); });
