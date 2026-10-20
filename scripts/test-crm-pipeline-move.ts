/**
 * Persistência de etapa do pipeline (otimista + rollback).
 * Uso: npx tsx scripts/test-crm-pipeline-move.ts
 */

import {
  applyAccountLink,
  persistOutcome,
  planStageMove,
  resolveAccountLink,
  rollbackItem,
  rowsFromPipeline,
} from "../lib/crm-pipeline-move";

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

const concurrent = plan!.next.map((row) =>
  row.opportunity_id === "b" ? { ...row, stage: "qualification", probability: 40, deal_value: 99 } : row,
);
const rolledMove = rollbackItem(concurrent, "a", opps[0]);
check("rollback devolve só o card movido", rolledMove[0]?.stage === "discovery" && rolledMove[0]?.probability === 25);
check(
  "rollback preserva a edição concorrente",
  rolledMove[1]?.stage === "qualification" && rolledMove[1]?.probability === 40 && rolledMove[1]?.deal_value === 99,
);

const removed = concurrent.filter((row) => row.opportunity_id !== "a");
const rolledDelete = rollbackItem(removed, "a", opps[0], 0);
check("rollback de exclusão reinsere o card na posição", rolledDelete[0]?.opportunity_id === "a" && rolledDelete[0]?.stage === "discovery");
check("rollback de exclusão preserva o outro card", rolledDelete[1]?.deal_value === 99 && rolledDelete.length === 2);

const edited = rollbackItem(
  [
    { ...opps[0], stage: "proposal", probability: 60 },
    { ...opps[1], deal_value: 50 },
  ],
  "a",
  opps[0],
);
check("rollback de edição restaura só aquele card", edited[0]?.stage === "discovery" && edited[1]?.deal_value === 50);

const linked = applyAccountLink(
  [
    { ...opps[0], account_id: null, account_name: undefined },
    { ...opps[1], account_id: null, account_name: "Outra" },
  ],
  "a",
  { account_id: "acc-1", account_name: "Acme" },
);
check("vínculo grava account_id só na oportunidade", linked[0]?.account_id === "acc-1" && linked[0]?.account_name === "Acme" && linked[1]?.account_name === "Outra");

const already = resolveAccountLink({
  existingAccountId: "acc-9",
  requestedName: "Nova",
  accounts: [],
});
check("oportunidade já ligada não cria outra conta", already.kind === "already-linked" && already.account_id === "acc-9");

const reuse = resolveAccountLink({
  existingAccountId: null,
  requestedName: "  acme  ",
  accounts: [
    { account_id: "x", account_name: "Acme Norte" },
    { account_id: "y", account_name: "ACME" },
  ],
});
check("nome igual reaproveita a conta", reuse.kind === "reuse" && reuse.account_id === "y");

const created = resolveAccountLink({
  existingAccountId: null,
  requestedName: "Acme Sul",
  accounts: [{ account_id: "x", account_name: "Acme Norte" }],
});
check("nome apenas parecido segue para criação", created.kind === "create" && created.account_name === "Acme Sul");

const blank = resolveAccountLink({ existingAccountId: null, requestedName: "   ", accounts: [] });
check("nome vazio não cria conta", blank.kind === "invalid");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
