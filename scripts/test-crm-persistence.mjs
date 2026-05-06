#!/usr/bin/env node
// ─── CRM Persistence Structural Test Suite ───────────────────────────────────
// Verifica:
//   1. Funções de DB exportadas para cada entidade
//   2. Arquivos de rota existem e exportam os métodos HTTP corretos
//   3. Padrões problemáticos foram removidos do código de UI

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const pass = [];
const fail = [];

function check(label, result, detail = "") {
  if (result) {
    pass.push(label);
    console.log(`  ✅  ${label}`);
  } else {
    fail.push(label);
    console.log(`  ❌  ${label}${detail ? `\n       → ${detail}` : ""}`);
  }
}

function fileContains(rel, ...patterns) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return false;
  const src = readFileSync(abs, "utf-8");
  return patterns.every(p => src.includes(p));
}

function fileNotContains(rel, ...patterns) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return false;
  const src = readFileSync(abs, "utf-8");
  return patterns.every(p => !src.includes(p));
}

function fileExists(rel) {
  return existsSync(resolve(ROOT, rel));
}

// ─── JACQES CRM ──────────────────────────────────────────────────────────────
console.log("\n═══ JACQES CRM ═══");

check("jacqes-crm-db: updateCrmClient exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function updateCrmClient"));
check("jacqes-crm-db: deleteCrmClient exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function deleteCrmClient"));
check("jacqes-crm-db: updateLead exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function updateLead"));
check("jacqes-crm-db: deleteLead exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function deleteLead"));
check("jacqes-crm-db: updateOpportunity exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function updateOpportunity"));
check("jacqes-crm-db: deleteOpportunity exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function deleteOpportunity"));
check("jacqes-crm-db: createExpansion exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function createExpansion"));
check("jacqes-crm-db: updateExpansion exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function updateExpansion"));
check("jacqes-crm-db: deleteExpansion exportado",
  fileContains("lib/jacqes-crm-db.ts", "export async function deleteExpansion"));

check("rota clientes/[id]: PATCH e DELETE existem",
  fileExists("app/api/jacqes/crm/clientes/[id]/route.ts") &&
  fileContains("app/api/jacqes/crm/clientes/[id]/route.ts", "export async function PATCH", "export async function DELETE"));
check("rota leads/[id]: PATCH e DELETE existem",
  fileExists("app/api/jacqes/crm/leads/[id]/route.ts") &&
  fileContains("app/api/jacqes/crm/leads/[id]/route.ts", "export async function PATCH", "export async function DELETE"));
check("rota oportunidades/[id]: PATCH e DELETE existem",
  fileExists("app/api/jacqes/crm/oportunidades/[id]/route.ts") &&
  fileContains("app/api/jacqes/crm/oportunidades/[id]/route.ts", "export async function PATCH", "export async function DELETE"));
check("rota expansao/[id]: PATCH e DELETE existem",
  fileExists("app/api/jacqes/crm/expansao/[id]/route.ts") &&
  fileContains("app/api/jacqes/crm/expansao/[id]/route.ts", "export async function PATCH", "export async function DELETE"));
check("rota expansao: POST existe",
  fileContains("app/api/jacqes/crm/expansao/route.ts", "export async function POST"));

check("clientes/page.tsx: usa PATCH para editar (não localStorage)",
  fileContains("app/jacqes/crm/clientes/page.tsx", "method: \"PATCH\""));
check("clientes/page.tsx: usa DELETE para remover (não só crmDelete)",
  fileContains("app/jacqes/crm/clientes/page.tsx", "method: \"DELETE\""));
check("expansao/page.tsx: usa POST para criar",
  fileContains("app/jacqes/crm/expansao/page.tsx", "method: \"POST\""));
check("expansao/page.tsx: usa PATCH para editar",
  fileContains("app/jacqes/crm/expansao/page.tsx", "method: \"PATCH\""));
check("expansao/page.tsx: usa DELETE para remover",
  fileContains("app/jacqes/crm/expansao/page.tsx", "method: \"DELETE\""));

check("kanban: handleDrop não tem .catch(() => undefined) silencioso",
  fileNotContains("app/crm/opportunities/page.tsx", ".catch(() => undefined)"));
check("kanban: revert de estado em caso de erro de API",
  fileContains("app/crm/opportunities/page.tsx", "updateOpps(prev)"));
check("kanban: busca API sempre (não apenas se localStorage vazio)",
  fileNotContains("app/crm/opportunities/page.tsx", "return;  // API never called"));

// ─── AWQ CRM ─────────────────────────────────────────────────────────────────
console.log("\n═══ AWQ CRM ═══");

check("crm-db: updateContact exportado",
  fileContains("lib/crm-db.ts", "export async function updateContact"));
check("crm-db: deleteContact exportado",
  fileContains("lib/crm-db.ts", "export async function deleteContact"));
check("crm-db: updateActivity exportado",
  fileContains("lib/crm-db.ts", "export async function updateActivity"));
check("crm-db: deleteActivity exportado",
  fileContains("lib/crm-db.ts", "export async function deleteActivity"));

check("rota contacts/[id]: PATCH e DELETE existem",
  fileExists("app/api/crm/contacts/[id]/route.ts") &&
  fileContains("app/api/crm/contacts/[id]/route.ts", "export async function PATCH", "export async function DELETE"));
check("rota activities/[id]: PATCH e DELETE existem",
  fileExists("app/api/crm/activities/[id]/route.ts") &&
  fileContains("app/api/crm/activities/[id]/route.ts", "export async function PATCH", "export async function DELETE"));

check("activities/page.tsx: completeActivity tem tratamento de erro",
  fileContains("app/crm/activities/page.tsx", "if (!res.ok) throw new Error"));
check("activities/page.tsx: catch não é silencioso",
  fileNotContains("app/crm/activities/page.tsx", "} finally { setCompleting(null); }"));

check("leads/add/page.tsx: sem fallback silencioso para localStorage",
  fileNotContains("app/crm/leads/add/page.tsx", "awq_local_leads"));
check("leads/add/page.tsx: erro de rede lança exceção visível",
  fileContains("app/crm/leads/add/page.tsx", "Erro de rede. Verifique sua conexão"));

check("crm-db convertLead: DELETE compensatório em caso de erro",
  fileContains("lib/crm-db.ts", "Compensating delete to avoid orphaned opportunity"));

// ─── CAZA CRM ────────────────────────────────────────────────────────────────
console.log("\n═══ CAZA CRM ═══");

check("caza-crm-db: updateInteraction exportado",
  fileContains("lib/caza-crm-db.ts", "export async function updateInteraction"));
check("caza-crm-db: deleteInteraction exportado",
  fileContains("lib/caza-crm-db.ts", "export async function deleteInteraction"));

check("rota interacoes/[id]: PATCH e DELETE existem",
  fileExists("app/api/caza/crm/interacoes/[id]/route.ts") &&
  fileContains("app/api/caza/crm/interacoes/[id]/route.ts", "export async function PATCH", "export async function DELETE"));

check("clientes/page.tsx: catch do delete não é silencioso",
  fileContains("app/caza-vision/clientes/page.tsx", "Falha ao remover cliente") &&
  fileNotContains("app/caza-vision/clientes/page.tsx", "} catch { /* ignore */ }\n  }\n\n  return ("));
check("clientes/page.tsx: delete mostra erro ao usuário",
  fileContains("app/caza-vision/clientes/page.tsx", "Falha ao remover cliente"));

check("contas/page.tsx: saveEdit usa API (não só localStorage)",
  fileContains("app/caza-vision/contas/page.tsx", "fetch(`/api/caza/clients/${selected.id}`"));
check("contas/page.tsx: saveEdit é async (não function síncrona)",
  fileContains("app/caza-vision/contas/page.tsx", "async function saveEdit"));

// ─── ADVISOR ─────────────────────────────────────────────────────────────────
console.log("\n═══ ADVISOR ═══");

check("rota advisor/clients/[id]: PATCH e DELETE existem",
  fileExists("app/api/advisor/clients/[id]/route.ts") &&
  fileContains("app/api/advisor/clients/[id]/route.ts", "export async function PATCH", "export async function DELETE"));
check("rota advisor/clients/[id]: usa updateAdvisorClient",
  fileContains("app/api/advisor/clients/[id]/route.ts", "updateAdvisorClient"));
check("rota advisor/clients/[id]: usa deleteAdvisorClient",
  fileContains("app/api/advisor/clients/[id]/route.ts", "deleteAdvisorClient"));

// ─── RESULTADO FINAL ─────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(50));
console.log(`  Total:   ${pass.length + fail.length} testes`);
console.log(`  ✅ Passou: ${pass.length}`);
console.log(`  ❌ Falhou: ${fail.length}`);
if (fail.length > 0) {
  console.log("\n  Falhas:");
  fail.forEach(f => console.log(`    • ${f}`));
  process.exit(1);
} else {
  console.log("\n  Todos os testes passaram! 🎉");
  process.exit(0);
}
