/**
 * BPM Operational HTTP Test
 * Generates a real NextAuth JWT → tests all 10 API routes via fetch.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { encode } = require("/home/user/awq/node_modules/next-auth/jwt");

// ── Config ────────────────────────────────────────────────────────────────────
const BASE    = "http://localhost:3099";
const SECRET  = "dev-test-secret-bpm-2026";
const USER_ID = "5";   // Miguel — owner

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function ok(label)   { passed++; console.log(`  ✓  ${label}`); }
function fail(label, detail = "") {
  failed++;
  console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`);
}
function section(title) {
  console.log(`\n${"─".repeat(62)}\n  ${title}\n${"─".repeat(62)}`);
}

async function makeToken() {
  return encode({
    token: {
      sub:   USER_ID,
      id:    USER_ID,
      name:  "Miguel",
      email: "contato@awq.com.br",
      role:  "owner",
      iat:   Math.floor(Date.now() / 1000),
      exp:   Math.floor(Date.now() / 1000) + 3600,
    },
    secret: SECRET,
  });
}

let TOKEN = "";
async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `next-auth.session-token=${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// State shared between tests
let instanceId = "";
let taskId     = "";
let notifId    = "";

async function testStartWorkflow() {
  section("1. POST /api/bpm/start-workflow");

  // AP_APPROVAL — amount 5000 triggers full chain
  const { status, json } = await api("POST", "/api/bpm/start-workflow", {
    process_code:        "AP_APPROVAL",
    related_entity_type: "AP",
    related_entity_id:   "ap-test-001",
    initiated_by:        USER_ID,
    request_data: {
      supplier_name: "Fornecedor Teste",
      amount:        5000,
      description:   "Compra operacional Q2 2026",
      du:            "AWQ",
    },
  });

  if (status === 200 && json?.success) {
    instanceId = json.data?.instance_id ?? "";
    taskId     = json.data?.task_id     ?? "";
    ok(`AP_APPROVAL criado → instance=${instanceId?.slice(0,8)}… task=${taskId?.slice(0,8)}…`);
    ok(`step inicial: ${json.data?.current_step}`);
    ok(`assigned_to:  ${json.data?.assigned_to}`);
  } else {
    fail("start-workflow falhou", `status=${status} json=${JSON.stringify(json)}`);
  }

  // BUDGET_APPROVAL
  const b = await api("POST", "/api/bpm/start-workflow", {
    process_code:        "BUDGET_APPROVAL",
    related_entity_type: "Budget",
    related_entity_id:   "budget-test-001",
    initiated_by:        USER_ID,
    priority:            "high",
    request_data: { budget_name: "Q2 2026", bu: "AWQ", fiscal_year: 2026, amount: 120000 },
  });
  if (b.status === 200 && b.json?.success) ok("BUDGET_APPROVAL criado OK");
  else fail("BUDGET_APPROVAL falhou", JSON.stringify(b.json));

  // PROJECT_KICKOFF
  const p = await api("POST", "/api/bpm/start-workflow", {
    process_code:        "PROJECT_KICKOFF",
    related_entity_type: "Project",
    related_entity_id:   "proj-test-001",
    initiated_by:        USER_ID,
    request_data: { project_name: "Portal Clientes v2", bu: "AWQ", budget: 80000 },
  });
  if (p.status === 200 && p.json?.success) ok("PROJECT_KICKOFF criado OK");
  else fail("PROJECT_KICKOFF falhou", JSON.stringify(p.json));

  // CONTRACT_APPROVAL
  const c = await api("POST", "/api/bpm/start-workflow", {
    process_code:        "CONTRACT_APPROVAL",
    related_entity_type: "Contract",
    related_entity_id:   "contract-test-001",
    initiated_by:        USER_ID,
    request_data: { contract_name: "SaaS Anual", client: "TechCorp", amount: 45000 },
  });
  if (c.status === 200 && c.json?.success) ok("CONTRACT_APPROVAL criado OK");
  else fail("CONTRACT_APPROVAL falhou", JSON.stringify(c.json));
}

async function testMyTasks() {
  section("2. GET /api/bpm/my-tasks");

  const { status, json } = await api("GET", `/api/bpm/my-tasks?user_id=${USER_ID}`);
  if (status === 200 && json?.success) {
    ok(`my-tasks retornou ${json.data?.length} tasks`);
    ok(`stats: total=${json.stats?.total} overdue=${json.stats?.overdue}`);
  } else {
    fail("my-tasks falhou", JSON.stringify(json));
  }

  // Filter: all
  const f = await api("GET", `/api/bpm/my-tasks?user_id=${USER_ID}&filter=all`);
  if (f.status === 200 && f.json?.success) ok("filter=all OK");
  else fail("filter=all falhou");
}

async function testProcessInstance() {
  section("3. GET /api/bpm/process-instance");

  if (!instanceId) { fail("sem instanceId — pulando"); return; }

  const { status, json } = await api("GET", `/api/bpm/process-instance?id=${instanceId}`);
  if (status === 200 && json?.success) {
    ok(`instância carregada: ${json.data?.instance?.instance_code}`);
    ok(`tasks retornados: ${json.data?.tasks?.length}`);
  } else {
    fail("process-instance falhou", JSON.stringify(json));
  }

  // List all
  const list = await api("GET", "/api/bpm/process-instance?status=in_progress");
  if (list.status === 200 && list.json?.success)
    ok(`lista in_progress: ${list.json.data?.length} instâncias`);
  else fail("list in_progress falhou", JSON.stringify(list.json));
}

async function testCompleteTask() {
  section("4. POST /api/bpm/complete-task (approve)");

  if (!taskId) { fail("sem taskId — pulando"); return; }

  const { status, json } = await api("POST", "/api/bpm/complete-task", {
    task_id:       taskId,
    decided_by:    USER_ID,
    decision:      "approved",
    decision_notes: "Aprovado no teste operacional",
  });

  if (status === 200 && json?.success) {
    ok(`decision=approved aceita`);
    ok(`workflow_completed=${json.data?.workflow_completed}`);
    ok(`next_step=${json.data?.next_step ?? "(finalizado)"}`);
    // grab new task_id if workflow continues
    if (json.data?.task_id) taskId = json.data.task_id;
  } else {
    fail("complete-task (approve) falhou", JSON.stringify(json));
  }
}

async function testCompleteTaskReject() {
  section("5. POST /api/bpm/complete-task (reject)");

  // Start a fresh PO for rejection test
  const s = await api("POST", "/api/bpm/start-workflow", {
    process_code:        "PO_APPROVAL",
    related_entity_type: "PO",
    related_entity_id:   "po-reject-001",
    initiated_by:        USER_ID,
    request_data: { supplier_name: "Rejeitar Ltda", amount: 1500, description: "Teste rejeição" },
  });

  if (!s.json?.success) { fail("setup rejeição falhou"); return; }
  const rejTaskId = s.json.data?.task_id;

  const { status, json } = await api("POST", "/api/bpm/complete-task", {
    task_id:        rejTaskId,
    decided_by:     USER_ID,
    decision:       "rejected",
    decision_notes: "Recusado por motivo de teste",
  });

  if (status === 200 && json?.success) {
    ok(`rejeição aceita`);
    ok(`workflow_completed=${json.data?.workflow_completed}`);
  } else {
    fail("complete-task (reject) falhou", JSON.stringify(json));
  }
}

async function testEscalateTask() {
  section("6. POST /api/bpm/escalate-task");

  // Start fresh EXPENSE for escalation
  const s = await api("POST", "/api/bpm/start-workflow", {
    process_code:        "EXPENSE_APPROVAL",
    related_entity_type: "Expense",
    related_entity_id:   "exp-escalate-001",
    initiated_by:        USER_ID,
    request_data: { description: "Viagem SP", amount: 3000 },
  });

  if (!s.json?.success) { fail("setup escalação falhou"); return; }
  const escTaskId = s.json.data?.task_id;

  const { status, json } = await api("POST", "/api/bpm/escalate-task", {
    task_id:     escTaskId,
    escalated_by: USER_ID,
    reason:      "Ausência do aprovador",
  });

  if (status === 200 && json?.success) {
    ok(`escalação OK — escalated_to=${json.data?.escalated_to}`);
  } else {
    fail("escalate-task falhou", JSON.stringify(json));
  }
}

async function testProcessHistory() {
  section("7. GET /api/bpm/process-history");

  if (!instanceId) { fail("sem instanceId — pulando"); return; }

  const { status, json } = await api("GET", `/api/bpm/process-history?instance_id=${instanceId}`);
  if (status === 200 && json?.success) {
    ok(`histórico: ${json.data?.length} entradas`);
    if (json.data?.length) ok(`primeira ação: "${json.data[0]?.action}"`);
  } else {
    fail("process-history falhou", JSON.stringify(json));
  }
}

async function testNotifications() {
  section("8. GET + POST /api/bpm/mark-notification-read");

  const g = await api("GET", `/api/bpm/mark-notification-read?user_id=${USER_ID}`);
  if (g.status === 200 && g.json?.success) {
    ok(`notificações não lidas: ${g.json.data?.unread_count}`);
    if (g.json.data?.notifications?.length) {
      notifId = g.json.data.notifications[0]?.notification_id;
    }
  } else {
    fail("GET notificações falhou", JSON.stringify(g.json));
  }

  if (notifId) {
    const m = await api("POST", "/api/bpm/mark-notification-read", { notification_id: notifId });
    if (m.status === 200 && m.json?.success) ok(`notificação ${notifId.slice(0,8)}… marcada como lida`);
    else fail("mark-notification-read falhou", JSON.stringify(m.json));
  }

  // Mark all
  const all = await api("POST", "/api/bpm/mark-notification-read", { user_id: USER_ID, mark_all: true });
  if (all.status === 200 && all.json?.success) ok(`mark_all OK — marcadas=${all.json.data?.marked}`);
  else fail("mark_all falhou", JSON.stringify(all.json));
}

async function testAnalytics() {
  section("9. GET /api/bpm/analytics");

  for (const view of ["performance", "sla", "bottlenecks"]) {
    const { status, json } = await api("GET", `/api/bpm/analytics?view=${view}`);
    const rows = Array.isArray(json?.data) ? json.data.length : "n/a";
    if (status === 200 && json?.success)
      ok(`analytics?view=${view} OK — ${rows} rows`);
    else
      fail(`analytics?view=${view} falhou`, JSON.stringify(json));
  }
  // Default (all views)
  const all = await api("GET", "/api/bpm/analytics");
  if (all.status === 200 && all.json?.success)
    ok(`analytics (all) OK — perf=${all.json.data?.performance?.length} sla=${all.json.data?.sla?.length} bottlenecks=${all.json.data?.bottlenecks?.length}`);
  else
    fail("analytics (all) falhou", JSON.stringify(all.json));
}

async function testSlaCheck() {
  section("10. POST /api/bpm/sla-check");

  const { status, json } = await api("POST", "/api/bpm/sla-check", {});
  if (status === 200 && json?.success)
    ok(`sla-check OK — breached=${json.data?.breached_count} notifs=${json.data?.notifications_sent}`);
  else
    fail("sla-check falhou", JSON.stringify(json));
}

async function testCancelInstance() {
  section("11. POST /api/bpm/cancel-instance");

  // Use the budget instance (still in_progress)
  const list = await api("GET", "/api/bpm/process-instance?status=in_progress");
  const toCancel = list.json?.data?.find((i) => i.process_code === "BUDGET_APPROVAL");

  if (!toCancel) { ok("nenhuma instância para cancelar (OK)"); return; }

  const { status, json } = await api("POST", "/api/bpm/cancel-instance", {
    instance_id:  toCancel.instance_id,
    cancelled_by: USER_ID,
    reason:       "Cancelado no teste operacional",
  });

  if (status === 200 && json?.success) ok(`cancelamento OK — instance=${toCancel.instance_id.slice(0,8)}…`);
  else fail("cancel-instance falhou", JSON.stringify(json));
}

async function testErrorCases() {
  section("12. Validação de erros (400 / 404)");

  const e1 = await api("POST", "/api/bpm/start-workflow", { process_code: "INVALIDO", initiated_by: "5", request_data: {} });
  if (e1.status >= 400) ok(`process_code inválido → ${e1.status}`);
  else fail("deveria retornar erro para process_code inválido");

  const e2 = await api("GET", "/api/bpm/my-tasks");
  if (e2.status === 400) ok("my-tasks sem user_id → 400");
  else fail(`my-tasks sem user_id retornou ${e2.status}`);

  const e3 = await api("POST", "/api/bpm/complete-task", { task_id: "nao-existe", decided_by: "5", decision: "approved" });
  if (e3.status >= 400) ok(`task inexistente → ${e3.status}`);
  else fail("deveria retornar erro para task inexistente");

  const e4 = await api("GET", "/api/bpm/mark-notification-read");
  if (e4.status === 400) ok("notificações sem user_id → 400");
  else fail(`notificações sem user_id retornou ${e4.status}`);
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(62)}`);
  console.log("  BPM — Teste Operacional HTTP Completo");
  console.log(`  ${BASE}  |  user=Miguel (id=${USER_ID})`);
  console.log(`${"═".repeat(62)}`);

  // Verify server is up
  try {
    const ping = await fetch(`${BASE}/api/bpm/my-tasks?user_id=5`, { method: "GET" });
    if (ping.status === 0) throw new Error("unreachable");
  } catch {
    console.error(`\n  ✗  Servidor não acessível em ${BASE}`);
    console.error("     Execute: npm run dev -- --port 3099\n");
    process.exit(1);
  }

  TOKEN = await makeToken();
  console.log(`\n  🔑  JWT gerado (${TOKEN.length} chars)`);

  await testStartWorkflow();
  await testMyTasks();
  await testProcessInstance();
  await testCompleteTask();
  await testCompleteTaskReject();
  await testEscalateTask();
  await testProcessHistory();
  await testNotifications();
  await testAnalytics();
  await testSlaCheck();
  await testCancelInstance();
  await testErrorCases();

  console.log(`\n${"═".repeat(62)}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`  RESULTADO: ${passed}/${total} passaram (100%)`);
    console.log("  🎉  TODOS OS TESTES HTTP PASSARAM");
  } else {
    console.log(`  RESULTADO: ${passed}/${total} passaram — ${failed} FALHAS`);
    process.exit(1);
  }
  console.log(`${"═".repeat(62)}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
