// Teste operacional: conectividade Supabase + leitura/escrita PPM
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local manually
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch { /* env already set */ }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${label}${result !== undefined ? ": " + JSON.stringify(result) : ""}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${label}: ${e.message}`);
    failed++;
  }
}

console.log("\n=== Teste Operacional Supabase PPM ===\n");

// 1. Conectividade básica
await test("Conexão com Supabase", async () => {
  const { error } = await supabase.from("ppm_projects").select("count", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return "OK";
});

// 2. Leitura da tabela ppm_projects
let existingCount = 0;
await test("Leitura ppm_projects", async () => {
  const { data, error, count } = await supabase.from("ppm_projects").select("*", { count: "exact" });
  if (error) throw new Error(error.message);
  existingCount = count ?? 0;
  return `${existingCount} projetos encontrados`;
});

// 3. Escrita: inserir projeto de teste
const testId = `test-${Date.now()}`;
const testCode = `PRJ-TEST-${Date.now()}`;
await test("Inserção em ppm_projects", async () => {
  const { error } = await supabase.from("ppm_projects").insert({
    project_id:      testId,
    project_code:    testCode,
    project_name:    "[TESTE OPERACIONAL] Projeto Supabase",
    bu_code:         "AWQ",
    project_type:    "internal",
    contract_type:   "fixed_price",
    start_date:      new Date().toISOString().slice(0, 10),
    planned_end_date:new Date().toISOString().slice(0, 10),
    budget_cost:     0,
    budget_revenue:  0,
    phase:           "initiation",
    status:          "active",
    health_status:   "green",
    priority:        "low",
    created_at:      new Date().toISOString(),
    updated_at:      new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return `project_id=${testId}`;
});

// 4. Leitura do registro inserido
await test("Leitura do registro inserido", async () => {
  const { data, error } = await supabase.from("ppm_projects").select("*").eq("project_id", testId).single();
  if (error) throw new Error(error.message);
  if (data.project_name !== "[TESTE OPERACIONAL] Projeto Supabase") throw new Error("Nome não confere");
  return data.project_name;
});

// 5. Update
await test("Update do registro", async () => {
  const { error } = await supabase.from("ppm_projects")
    .update({ health_status: "yellow", updated_at: new Date().toISOString() })
    .eq("project_id", testId);
  if (error) throw new Error(error.message);
  return "health_status → yellow";
});

// 6. Delete (limpeza)
await test("Deleção do registro de teste", async () => {
  const { error } = await supabase.from("ppm_projects").delete().eq("project_id", testId);
  if (error) throw new Error(error.message);
  return "removido";
});

// 7. Verificar outras tabelas PPM
for (const table of ["ppm_tasks", "ppm_milestones", "ppm_allocations", "ppm_risks", "ppm_issues"]) {
  await test(`Tabela ${table} acessível`, async () => {
    const { error, count } = await supabase.from(table).select("count", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return `${count ?? 0} registros`;
  });
}

console.log(`\n=== Resultado: ${passed} passou · ${failed} falhou ===\n`);
process.exit(failed > 0 ? 1 : 0);
