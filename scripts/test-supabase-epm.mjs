import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const URL  = "https://kkhxxsrgsewjfvnnsssyf.supabase.co";
const SKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYyNTkwMywiZXhwIjoyMDk0MjAxOTAzfQ.oxSM8vzwytxaHF7ZSh5iMEut9By11_oQnfNW7ntiE8A";

const sb = createClient(URL, SKEY, { auth: { persistSession: false } });

let ok = true;
function pass(msg) { console.log(`  ✓  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); ok = false; }

console.log("\n══════════════════════════════════════════");
console.log("  AWQ EPM — Supabase Operational Test");
console.log("══════════════════════════════════════════\n");

// ── 1. Ping / tabela existe ───────────────────────────────────────────────────
console.log("1. Conectividade + existência da tabela");
const ping = await sb.from("general_ledger").select("gl_id").limit(1);
if (ping.error) {
  fail(`Conexão/tabela: ${ping.error.message} [code=${ping.error.code}]`);
  if (ping.error.code === "42P01") {
    console.error("\n  → Tabela não existe. Execute scripts/supabase-epm-setup.sql no Supabase SQL Editor.\n");
  }
  process.exit(1);
}
pass(`Tabela general_ledger acessível (${ping.data.length} rows existentes)`);

// ── 2. INSERT ─────────────────────────────────────────────────────────────────
console.log("\n2. INSERT — lançamento de teste");
const testId = randomUUID();
const journalId = randomUUID();
const now = new Date().toISOString();

const testRows = [
  {
    gl_id: testId,
    journal_id: journalId,
    transaction_date: "2026-05-14",
    period_code: "2026-05",
    bu_code: "AWQ",
    account_code: "1.1.01",
    account_name: "Caixa e Equivalentes",
    account_type: "ASSET",
    debit_amount: 1000.00,
    credit_amount: 0,
    description: "[TEST] Lançamento operacional automático",
    reference_doc: "TEST-001",
    source_system: "manual",
    is_intercompany: false,
    created_at: now,
    created_by: "test-script",
  },
  {
    gl_id: randomUUID(),
    journal_id: journalId,
    transaction_date: "2026-05-14",
    period_code: "2026-05",
    bu_code: "AWQ",
    account_code: "3.1.01",
    account_name: "Capital Social",
    account_type: "EQUITY",
    debit_amount: 0,
    credit_amount: 1000.00,
    description: "[TEST] Lançamento operacional automático",
    reference_doc: "TEST-001",
    source_system: "manual",
    is_intercompany: false,
    created_at: now,
    created_by: "test-script",
  },
];

const ins = await sb.from("general_ledger").insert(testRows);
if (ins.error) {
  fail(`INSERT: ${ins.error.message}`);
  process.exit(1);
}
pass("INSERT de 2 legs (débito + crédito) OK");

// ── 3. SELECT ─────────────────────────────────────────────────────────────────
console.log("\n3. SELECT — leitura por journal_id");
const sel = await sb
  .from("general_ledger")
  .select("*")
  .eq("journal_id", journalId)
  .order("debit_amount", { ascending: false });

if (sel.error) {
  fail(`SELECT: ${sel.error.message}`);
} else if (sel.data.length !== 2) {
  fail(`SELECT retornou ${sel.data.length} rows (esperado 2)`);
} else {
  pass(`SELECT retornou ${sel.data.length} rows`);
  const debit  = sel.data.find(r => r.debit_amount > 0);
  const credit = sel.data.find(r => r.credit_amount > 0);
  pass(`Débito  → ${debit.account_code} ${debit.account_name}: R$ ${debit.debit_amount}`);
  pass(`Crédito → ${credit.account_code} ${credit.account_name}: R$ ${credit.credit_amount}`);
  const balanced = Math.abs(debit.debit_amount - credit.credit_amount) < 0.01;
  balanced ? pass("Balanço: D = C ✓") : fail("Balanço: D ≠ C");
}

// ── 4. Filtro por bu_code + period_code ───────────────────────────────────────
console.log("\n4. SELECT com filtros bu_code + period_code");
const filt = await sb
  .from("general_ledger")
  .select("gl_id")
  .eq("bu_code", "AWQ")
  .eq("period_code", "2026-05");

if (filt.error) {
  fail(`Filtro: ${filt.error.message}`);
} else {
  pass(`Filtro bu_code=AWQ + period_code=2026-05 → ${filt.data.length} rows`);
}

// ── 5. DELETE (limpeza) ───────────────────────────────────────────────────────
console.log("\n5. DELETE — limpeza do teste");
const del = await sb.from("general_ledger").delete().eq("journal_id", journalId);
if (del.error) {
  fail(`DELETE: ${del.error.message}`);
} else {
  pass("Rows de teste deletadas");
}

// ── Resultado ─────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════");
if (ok) {
  console.log("  RESULTADO: APROVADO ✓  Supabase EPM operacional");
} else {
  console.log("  RESULTADO: FALHOU ✗   Ver erros acima");
}
console.log("══════════════════════════════════════════\n");
process.exit(ok ? 0 : 1);
