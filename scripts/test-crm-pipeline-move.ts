/**
 * Persistência de etapa do pipeline (otimista + rollback).
 * Uso: npx tsx scripts/test-crm-pipeline-move.ts
 */

import { persistOutcome, planStageMove, rowsFromPipeline } from "../lib/crm-pipeline-move";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL", name); }
}

const opps = [
  { opportunity_id: "a", stage: "discovery", probability: 25, deal_value: 10 },
  { opportunity_id: "b", stage: "proposal", probability: 60, deal_value: 20 },
];

const plan = planStageMove(opps, "a", "negotiation");
check("move planeja a próxima lista", plan?.next[0]?.stage === "negotiation");
check("move ajusta a probabilidade da etapa", plan?.next[0]?.probability === 75);
check("move não altera o outro card", plan?.next[1]?.stage === "proposal" && plan?.next[1]?.probability === 60);
check("payload é POST de update", plan?.body.action === "update" && plan?.body.opportunity_id === "a" && plan?.body.stage === "negotiation" && plan?.body.probability === 75);
check("lista anterior permanece na etapa de origem", plan?.previous[0]?.stage === "discovery");

check("mesma etapa não gera escrita", planStageMove(opps, "a", "discovery") === null);
check("id ausente não gera escrita", planStageMove(opps, "z", "proposal") === null);

let shown = plan!.next;
if (persistOutcome(false, { success: false }) === "rollback") shown = plan!.previous;
check("HTTP sem success desfaz a etapa", shown[0]?.stage === "discovery");

shown = plan!.next;
if (persistOutcome(true, null) === "rollback") shown = plan!.previous;
check("corpo vazio desfaz a etapa", shown[0]?.stage === "discovery");

shown = plan!.next;
if (persistOutcome(true, { success: true }) === "rollback") shown = plan!.previous;
check("success mantém a etapa nova", shown[0]?.stage === "negotiation");

const loaded = rowsFromPipeline({
  success: true,
  data: {
    byStage: { discovery: [{ opportunity_id: "a" }], qualification: [] },
    closedWon: [{ opportunity_id: "w" }],
    closedLost: [{ opportunity_id: "l" }],
  },
});
check("leitura junta abertas e fechadas", loaded.error === null && loaded.rows.map((r) => r.opportunity_id).join(",") === "a,w,l");

const failed = rowsFromPipeline<{ opportunity_id: string }>({ success: false, error: "db down" });
check("erro de API não inventa cards", failed.rows.length === 0 && failed.error === "db down");

const missing = rowsFromPipeline<{ opportunity_id: string }>({ success: true });
check("success sem data vira erro", missing.rows.length === 0 && missing.error === "API error");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
