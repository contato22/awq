/**
 * Persistência de etapa do kanban (localStorage sobrepõe a API).
 * Uso: npx tsx scripts/test-jacqes-pipeline-board.ts
 */

import { applyStageOverlay, moveCard, resolveBoardRows } from "../lib/jacqes-pipeline-board";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL", name); }
}

const api = [
  { id: "a", stage: "Novo Lead" },
  { id: "b", stage: "Proposta" },
];
const local = [
  { id: "a", stage: "Qualificação" },
  { id: "b", stage: "Proposta" },
];

const overlaid = applyStageOverlay(api, local);
check("overlay troca a etapa movida", overlaid.find((r) => r.id === "a")?.stage === "Qualificação");
check("overlay mantém etapa intacta", overlaid.find((r) => r.id === "b")?.stage === "Proposta");
check("overlay sem local devolve a API", applyStageOverlay(api, null)[0]?.stage === "Novo Lead");

const moved = moveCard(api, "a", "Diagnóstico");
check("move atualiza só o card arrastado", moved?.[0]?.stage === "Diagnóstico" && moved[1]?.stage === "Proposta");
check("move para a mesma etapa é no-op", moveCard(api, "a", "Novo Lead") === null);
check("move de id inexistente é no-op", moveCard(api, "z", "Proposta") === null);

const afterReload = resolveBoardRows({
  fromApi: null,
  local: moved,
  fromJson: [],
  fallback: [{ id: "demo", stage: "Novo Lead" }],
});
check("reload sem API lê o localStorage", afterReload.source === "local" && afterReload.rows[0]?.stage === "Diagnóstico");

const apiWinsFields = resolveBoardRows({
  fromApi: api,
  local: moved,
  fromJson: [],
  fallback: [],
});
check("API com overlay mantém a etapa local", apiWinsFields.source === "api" && apiWinsFields.rows[0]?.stage === "Diagnóstico");

const demo = resolveBoardRows({
  fromApi: null,
  local: [],
  fromJson: [],
  fallback: [{ id: "demo", stage: "Fechado Ganho" }],
});
check("sem dados cai no demo", demo.source === "demo" && demo.rows[0]?.stage === "Fechado Ganho");

const json = resolveBoardRows({
  fromApi: [],
  local: null,
  fromJson: [{ id: "j", stage: "Negociação" }],
  fallback: [{ id: "demo", stage: "Novo Lead" }],
});
check("JSON estático vem antes do demo", json.source === "json" && json.rows[0]?.id === "j");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
