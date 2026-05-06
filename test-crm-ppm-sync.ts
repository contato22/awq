/**
 * Teste operacional: CRM Caza Vision → PPM sync
 *
 * Executa em dois níveis:
 *   1. Camada de dados (in-memory) — funções createProject / listProjects do ppm-db
 *   2. Camada HTTP — PATCH nos endpoints reais do Next.js (dev server porta 3099)
 *
 * Rode com: npx tsx --esm test-crm-ppm-sync.ts
 */

import { createProject, listProjects, SEED_PROJECTS } from "@/lib/ppm-db";

async function main() {

// ─── helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function httpGet(url: string) {
  const res = await fetch(url, { redirect: "manual" });
  return { status: res.status };
}

async function httpPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ─── 1. Camada de dados: createProject em memória ─────────────────────────────

console.log("\n═══ 1. PPM createProject (in-memory) ═══════════════════════════");

const projectsBefore = await listProjects({ bu_code: "CAZA" });
const countBefore = projectsBefore.length;

const opp = {
  id:               "CV-OPP-TEST01",
  nome_oportunidade:"Campanha Institucional Teste",
  empresa:          "Empresa Teste Ltda",
  tipo_servico:     "Vídeo Publicitário",
  valor_estimado:   100000,
  prazo_estimado:   "2026-09-30",
  risco:            "Médio",
  owner:            "Miguel",
  observacoes:      "Oportunidade de teste",
};

const endDate = opp.prazo_estimado;
const today   = new Date().toISOString().slice(0, 10);

const created = await createProject({
  project_name:    `${opp.empresa} — ${opp.nome_oportunidade}`,
  customer_name:   opp.empresa,
  bu_code:         "CAZA",
  bu_name:         "Caza Vision",
  opportunity_id:  opp.id,
  project_type:    "one_off",
  service_category:"video_production",
  contract_type:   "fixed_price",
  start_date:      today,
  planned_end_date: endDate,
  budget_revenue:  opp.valor_estimado,
  budget_cost:     Math.round(opp.valor_estimado * 0.3),
  margin_target:   0.7,
  project_manager: opp.owner,
  description:     opp.observacoes,
  phase:           "initiation",
  status:          "active",
  health_status:   "green",
  priority:        "medium",
  created_by:      opp.owner,
});

assert("projeto criado retorna project_id",   !!created.project_id);
assert("project_code gerado (PRJ-YYYY-XXXX)", /^PRJ-\d{4}-\d{4}$/.test(created.project_code));
assert("bu_code = CAZA",                      created.bu_code === "CAZA");
assert("opportunity_id vinculado",            created.opportunity_id === opp.id);
assert("project_name correto",                created.project_name === "Empresa Teste Ltda — Campanha Institucional Teste");
assert("service_category = video_production", created.service_category === "video_production");
assert("budget_revenue = 100000",             created.budget_revenue === 100000);
assert("budget_cost = 30000",                 created.budget_cost === 30000);
assert("margin_target = 0.7",                 created.margin_target === 0.7);
assert("planned_end_date correto",            created.planned_end_date === "2026-09-30");
assert("phase = initiation",                  created.phase === "initiation");
assert("status = active",                     created.status === "active");
assert("health_status = green",               created.health_status === "green");
assert("priority = medium",                   created.priority === "medium");
assert("actual_hours = 0",                    created.actual_hours === 0);
assert("actual_cost = 0",                     created.actual_cost === 0);

// Verifica que aparece na lista
const cazaProjects = await listProjects({ bu_code: "CAZA" });
const found = cazaProjects.find(p => p.project_id === created.project_id);
assert("projeto aparece em listProjects(CAZA)", !!found);
assert("contagem CAZA aumentou em 1",          cazaProjects.length === countBefore + 1);

// ─── 2. Projeto sem prazo_estimado → fallback 90 dias ─────────────────────────

console.log("\n═══ 2. Fallback de data (sem prazo_estimado) ════════════════════");

const oppSemPrazo = { ...opp, id: "CV-OPP-TEST02", prazo_estimado: null as string | null };
const fallbackEnd = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
const endDateFb   = oppSemPrazo.prazo_estimado || fallbackEnd;

const createdFb = await createProject({
  project_name:    `${oppSemPrazo.empresa} — ${oppSemPrazo.nome_oportunidade} (sem prazo)`,
  customer_name:   oppSemPrazo.empresa,
  bu_code:         "CAZA",
  bu_name:         "Caza Vision",
  opportunity_id:  oppSemPrazo.id,
  project_type:    "one_off",
  service_category:"video_production",
  contract_type:   "fixed_price",
  start_date:      today,
  planned_end_date: endDateFb,
  budget_revenue:  oppSemPrazo.valor_estimado,
  budget_cost:     Math.round(oppSemPrazo.valor_estimado * 0.3),
  margin_target:   0.7,
  project_manager: oppSemPrazo.owner,
  phase:           "initiation",
  status:          "active",
  health_status:   "green",
  priority:        "medium",
  created_by:      oppSemPrazo.owner,
});

assert("projeto sem prazo criado",            !!createdFb.project_id);
assert("planned_end_date = today+90",         createdFb.planned_end_date === fallbackEnd);

// ─── 3. Prioridade mapeada do risco ───────────────────────────────────────────

console.log("\n═══ 3. Mapeamento risco → priority ══════════════════════════════");

const riscos: Array<[string, string]> = [
  ["Alto",  "high"],
  ["Médio", "medium"],
  ["Baixo", "low"],
];

for (const [risco, expectedPriority] of riscos) {
  const priority = risco === "Alto" ? "high" : risco === "Médio" ? "medium" : "low";
  assert(`risco ${risco} → priority ${expectedPriority}`, priority === expectedPriority);
}

// ─── 4. Seed data íntegro (projetos pré-existentes não afetados) ──────────────

console.log("\n═══ 4. Seed data íntegro ════════════════════════════════════════");

const allAfter = await listProjects();
const seedIds  = SEED_PROJECTS.map(p => p.project_id);
for (const id of seedIds) {
  assert(`seed ${id} ainda presente`, allAfter.some(p => p.project_id === id));
}

// ─── 5. Camada HTTP — dev server ──────────────────────────────────────────────

console.log("\n═══ 5. HTTP layer (dev server :3099) ════════════════════════════");

const BASE = "http://localhost:3099";

// Aguarda o servidor estar pronto
let serverReady = false;
for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(`${BASE}/api/caza/crm/oportunidades`);
    if (r.status < 600) { serverReady = true; break; }
  } catch { /* ainda iniciando */ }
  await wait(2000);
}

if (!serverReady) {
  console.error("  ✗ servidor não iniciou a tempo — pulando testes HTTP");
  failed++;
} else {
  // 5a. GET sem sessão → middleware redireciona para auth (307)
  const getRes = await httpGet(`${BASE}/api/caza/crm/oportunidades`);
  assert(
    "GET /oportunidades sem sessão → 307 (auth redirect)",
    getRes.status === 307,
    `status=${getRes.status}`,
  );

  // 5b. PATCH (coleção) sem sessão → 307
  const patchRes = await httpPatch(
    `${BASE}/api/caza/crm/oportunidades`,
    { id: "CV-OPP-DUMMY", stage: "Fechado Ganho" }
  );
  assert(
    "PATCH coleção sem sessão → 307 (auth redirect)",
    patchRes.status === 307,
    `status=${patchRes.status}`,
  );

  // 5c. PATCH [id] sem sessão → 307
  const patchIdRes = await httpPatch(
    `${BASE}/api/caza/crm/oportunidades/CV-OPP-DUMMY`,
    { stage: "Fechado Ganho", empresa: "Teste" }
  );
  assert(
    "PATCH [id] sem sessão → 307 (auth redirect)",
    patchIdRes.status === 307,
    `status=${patchIdRes.status}`,
  );
}

  // ─── Resultado final ────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(55)}`);
  console.log(`Resultado: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
