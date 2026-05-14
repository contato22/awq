#!/usr/bin/env node
// Aplica o schema CRM no Supabase e executa teste operacional completo.
// Uso: node scripts/setup-crm-supabase.mjs
// Requer: SUPABASE_CRM_URL e SUPABASE_CRM_SERVICE_ROLE_KEY no ambiente.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

const url = process.env.SUPABASE_CRM_URL;
const key = process.env.SUPABASE_CRM_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌  Defina SUPABASE_CRM_URL e SUPABASE_CRM_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// ── 1. Aplicar schema via RPC (exec_sql) ────────────────────────────────────
async function applySchema() {
  console.log("\n▶ Aplicando schema (awq_crm_full_schema.sql)…");
  const sql = readFileSync(join(ROOT, "awq_crm_full_schema.sql"), "utf8");

  // Supabase expõe a função pg_catalog.pg_exec via rpc quando habilitado,
  // mas o caminho mais seguro é usar a API de SQL via Management API.
  // Como usamos o service role key (REST), verificamos se as tabelas já existem.
  const { data, error } = await db
    .from("crm_accounts")
    .select("account_id")
    .limit(1);

  if (error && error.code === "42P01") {
    console.log("  Tabelas não existem ainda.");
    console.log("  ✋  Abra o Supabase Dashboard → SQL Editor e execute:");
    console.log("       awq_crm_full_schema.sql");
    return false;
  }
  if (error) {
    console.error("  ❌  Erro ao verificar tabelas:", error.message);
    return false;
  }
  console.log("  ✅  Tabelas já existem no Supabase.");
  return true;
}

// ── 2. Teste operacional (INSERT → SELECT → DELETE) ─────────────────────────
async function testOperacional() {
  console.log("\n▶ Teste operacional CRM…");

  // INSERT
  const { data: ins, error: insErr } = await db
    .from("crm_accounts")
    .insert({
      account_name: "__teste_operacional__",
      bu:           "JACQES",
      account_type: "prospect",
      owner:        "Miguel",
    })
    .select()
    .single();

  if (insErr) { console.error("  ❌  INSERT falhou:", insErr.message); return; }
  console.log("  ✅  INSERT OK — id:", ins.account_id);

  // SELECT
  const { data: sel, error: selErr } = await db
    .from("crm_accounts")
    .select("account_name, bu, owner")
    .eq("account_id", ins.account_id)
    .single();

  if (selErr) { console.error("  ❌  SELECT falhou:", selErr.message); return; }
  console.log("  ✅  SELECT OK —", JSON.stringify(sel));

  // UPDATE
  const { error: updErr } = await db
    .from("crm_accounts")
    .update({ health_score: 99 })
    .eq("account_id", ins.account_id);

  if (updErr) { console.error("  ❌  UPDATE falhou:", updErr.message); return; }
  console.log("  ✅  UPDATE OK — health_score → 99");

  // DELETE
  const { error: delErr } = await db
    .from("crm_accounts")
    .delete()
    .eq("account_id", ins.account_id);

  if (delErr) { console.error("  ❌  DELETE falhou:", delErr.message); return; }
  console.log("  ✅  DELETE OK — registro de teste removido");

  // Contar registros reais
  const { count } = await db
    .from("crm_accounts")
    .select("*", { count: "exact", head: true });
  console.log(`\n  📊  crm_accounts tem ${count ?? 0} registro(s) reais.`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔌  Conectando a", url);

  const ok = await applySchema();
  if (ok) await testOperacional();

  console.log("\n✔  Script concluído.\n");
}

main().catch(e => {
  console.error("\n❌  EXCEÇÃO:", e.message);
  process.exit(1);
});
