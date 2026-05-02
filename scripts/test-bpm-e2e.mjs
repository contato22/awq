/**
 * BPM End-to-End Test Script
 * Testa o fluxo completo do workflow engine sem HTTP
 *
 * Roda com: node scripts/test-bpm-e2e.mjs
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ─── Inline workflow engine (espelha lib/bpm-workflow-engine.ts) ─────────────

const ROLE_MAP = {
  manager:         "2",
  bu_lead:         "2",
  pm:              "2",
  finance_manager: "4",
  cfo:             "5",
  ceo:             "5",
  legal:           "5",
};

function resolveApprover(role) { return ROLE_MAP[role] ?? "5"; }

function evaluateCondition(cond, actual) {
  switch (cond.operator) {
    case "<":  return actual < cond.value;
    case "<=": return actual <= cond.value;
    case ">":  return actual > cond.value;
    case ">=": return actual >= cond.value;
    case "==": return actual === cond.value;
    default:   return true;
  }
}

function shouldExecuteStep(step, requestData) {
  if (!step.conditions) return true;
  for (const [key, cond] of Object.entries(step.conditions)) {
    if (!cond) continue;
    const actual = Number(requestData[key] ?? 0);
    if (!evaluateCondition(cond, actual)) return false;
  }
  return true;
}

function findFirstExecutable(steps, requestData) {
  return steps.find((s) => shouldExecuteStep(s, requestData)) ?? null;
}

function findNextExecutable(steps, currentStepId, requestData) {
  const idx = steps.findIndex((s) => s.step_id === currentStepId);
  for (let i = idx + 1; i < steps.length; i++) {
    if (shouldExecuteStep(steps[i], requestData)) return steps[i];
  }
  return null;
}

function computeSlaDeadline(slaHours, from = new Date()) {
  return new Date(from.getTime() + slaHours * 60 * 60 * 1000);
}

function derivePriority(amount) {
  if (!amount) return "normal";
  if (amount >= 50000) return "urgent";
  if (amount >= 10000) return "high";
  if (amount >= 5000)  return "normal";
  return "low";
}

// ─── Inline in-memory BPM store (espelha lib/bpm-db.ts sem DB) ─────────────

const store = { instances: [], tasks: [], history: [], notifications: [] };
let seq = 1;

function mkId() {
  return "test-" + (seq++).toString().padStart(4, "0") + "-" + Math.random().toString(36).slice(2, 6);
}

function createInstance(data) {
  const inst = { ...data, instance_id: mkId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  store.instances.push(inst);
  return inst;
}

function updateInstance(id, updates) {
  const idx = store.instances.findIndex((i) => i.instance_id === id);
  if (idx === -1) return null;
  store.instances[idx] = { ...store.instances[idx], ...updates, updated_at: new Date().toISOString() };
  return store.instances[idx];
}

function getInstance(id) { return store.instances.find((i) => i.instance_id === id) ?? null; }

function createTask(data) {
  const task = { ...data, task_id: mkId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  store.tasks.push(task);
  return task;
}

function updateTask(id, updates) {
  const idx = store.tasks.findIndex((t) => t.task_id === id);
  if (idx === -1) return null;
  store.tasks[idx] = { ...store.tasks[idx], ...updates, updated_at: new Date().toISOString() };
  return store.tasks[idx];
}

function getTask(id) { return store.tasks.find((t) => t.task_id === id) ?? null; }

function addHistory(data) {
  const entry = { ...data, history_id: mkId(), created_at: new Date().toISOString() };
  store.history.push(entry);
  return entry;
}

function addNotification(data) {
  const n = { ...data, notification_id: mkId(), created_at: new Date().toISOString() };
  store.notifications.push(n);
  return n;
}

// ─── Process Definitions (same as seed) ──────────────────────────────────────

const PROCESS_DEFS = {
  AP_APPROVAL: {
    process_def_id: "pd-ap",
    process_code: "AP_APPROVAL",
    process_name: "Accounts Payable Approval",
    default_sla_hours: 48,
    workflow_steps: [
      { step_id: "1", step_name: "Finance Manager Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 },
      { step_id: "2", step_name: "CFO Approval",           step_type: "approval", approver_role: "cfo",             sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } },
    ],
  },
  EXPENSE_APPROVAL: {
    process_def_id: "pd-exp",
    process_code: "EXPENSE_APPROVAL",
    process_name: "Expense Approval",
    default_sla_hours: 48,
    workflow_steps: [
      { step_id: "1", step_name: "Manager Approval", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: "<",  value: 1000 } } },
      { step_id: "2", step_name: "CFO Approval",     step_type: "approval", approver_role: "cfo",     sla_hours: 48, conditions: { amount: { operator: ">=", value: 1000 } } },
    ],
  },
  PO_APPROVAL: {
    process_def_id: "pd-po",
    process_code: "PO_APPROVAL",
    process_name: "Purchase Order Approval",
    default_sla_hours: 72,
    workflow_steps: [
      { step_id: "1", step_name: "Manager Review",    step_type: "approval", approver_role: "manager",         sla_hours: 24, conditions: { amount: { operator: ">=", value: 1000  } } },
      { step_id: "2", step_name: "Finance Approval",  step_type: "approval", approver_role: "finance_manager", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000  } } },
      { step_id: "3", step_name: "CEO Approval",      step_type: "approval", approver_role: "ceo",             sla_hours: 72, conditions: { amount: { operator: ">=", value: 10000 } } },
    ],
  },
  BUDGET_APPROVAL: {
    process_def_id: "pd-bud",
    process_code: "BUDGET_APPROVAL",
    process_name: "Budget Approval",
    default_sla_hours: 240,
    workflow_steps: [
      { step_id: "1", step_name: "BU Lead Review",       step_type: "approval", approver_role: "bu_lead", sla_hours: 72  },
      { step_id: "2", step_name: "CFO Review",           step_type: "approval", approver_role: "cfo",     sla_hours: 96  },
      { step_id: "3", step_name: "CEO Final Approval",   step_type: "approval", approver_role: "ceo",     sla_hours: 120 },
    ],
  },
  CONTRACT_APPROVAL: {
    process_def_id: "pd-con",
    process_code: "CONTRACT_APPROVAL",
    process_name: "Contract Approval",
    default_sla_hours: 168,
    workflow_steps: [
      { step_id: "1", step_name: "Legal Review",   step_type: "approval", approver_role: "legal",           sla_hours: 96 },
      { step_id: "2", step_name: "Finance Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 },
      { step_id: "3", step_name: "CEO Signature",  step_type: "approval", approver_role: "ceo",             sla_hours: 72 },
    ],
  },
  PROJECT_KICKOFF: {
    process_def_id: "pd-prj",
    process_code: "PROJECT_KICKOFF",
    process_name: "Project Kickoff Approval",
    default_sla_hours: 72,
    workflow_steps: [
      { step_id: "1", step_name: "PM Review",             step_type: "approval", approver_role: "pm",  sla_hours: 24 },
      { step_id: "2", step_name: "CFO Budget Approval",   step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { budget: { operator: ">=", value: 50000 } } },
    ],
  },
};

// ─── Core workflow engine (espelha o que as API routes fazem) ─────────────────

function startWorkflow({ process_code, related_entity_type, related_entity_id, initiated_by, request_data, priority }) {
  const def = PROCESS_DEFS[process_code];
  if (!def) throw new Error(`Process not found: ${process_code}`);

  const firstStep = findFirstExecutable(def.workflow_steps, request_data);
  if (!firstStep) throw new Error("No executable step found");

  const amount = Number(request_data?.amount ?? request_data?.budget ?? 0);
  const prio = priority ?? derivePriority(amount);
  const slaDue = computeSlaDeadline(def.default_sla_hours);
  const instanceCode = `PI-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

  const instance = createInstance({
    instance_code: instanceCode,
    process_def_id: def.process_def_id,
    process_code,
    process_name: def.process_name,
    related_entity_type,
    related_entity_id,
    request_data,
    initiated_by,
    initiated_at: new Date().toISOString(),
    current_step_id: firstStep.step_id,
    current_step_name: firstStep.step_name,
    status: "in_progress",
    started_at: new Date().toISOString(),
    completed_at: null,
    sla_due_date: slaDue.toISOString(),
    sla_breached: false,
    final_decision: null,
    rejection_reason: null,
    priority: prio,
  });

  const taskSlaDue = computeSlaDeadline(firstStep.sla_hours);
  const assignee = resolveApprover(firstStep.approver_role);

  const task = createTask({
    instance_id: instance.instance_id,
    step_id: firstStep.step_id,
    step_name: firstStep.step_name,
    assigned_to: assignee,
    assigned_at: new Date().toISOString(),
    task_type: firstStep.step_type,
    status: "pending",
    decision: null,
    decision_notes: null,
    decided_by: null,
    decided_at: null,
    sla_hours: firstStep.sla_hours,
    sla_due_date: taskSlaDue.toISOString(),
    sla_breached: false,
    escalated: false,
    escalated_to: null,
    escalated_at: null,
    task_data: request_data,
  });

  addHistory({ instance_id: instance.instance_id, action: "started", action_description: `Workflow iniciado`, step_id: firstStep.step_id, step_name: firstStep.step_name, performed_by: initiated_by, performed_at: new Date().toISOString(), action_data: {} });
  addNotification({ user_id: assignee, notification_type: "task_assigned", related_entity_type: "process_task", related_entity_id: task.task_id, title: `Nova aprovação: ${def.process_name}`, message: `Você tem uma nova tarefa: ${firstStep.step_name}`, action_url: `/awq/bpm/tasks/${task.task_id}`, is_read: false, read_at: null, send_email: true, email_sent: false, email_sent_at: null, priority: prio });

  return { instance, task, step: firstStep };
}

function completeTask({ task_id, decision, decision_notes, decided_by }) {
  const task = getTask(task_id);
  if (!task) throw new Error("Task not found");
  if (task.status !== "pending") throw new Error(`Task already ${task.status}`);

  const instance = getInstance(task.instance_id);
  if (!instance) throw new Error("Instance not found");

  const now = new Date().toISOString();

  updateTask(task_id, {
    status: decision === "approved" ? "completed" : "rejected",
    decision,
    decision_notes: decision_notes ?? null,
    decided_by,
    decided_at: now,
  });

  addHistory({ instance_id: instance.instance_id, action: decision, action_description: `Step "${task.step_name}" ${decision}`, step_id: task.step_id, step_name: task.step_name, performed_by: decided_by, performed_at: now, action_data: { decision, notes: decision_notes } });

  if (decision === "rejected") {
    updateInstance(instance.instance_id, { status: "rejected", final_decision: "rejected", rejection_reason: decision_notes, completed_at: now });
    addNotification({ user_id: instance.initiated_by, notification_type: "rejected", related_entity_type: "process_instance", related_entity_id: instance.instance_id, title: `Aprovação rejeitada`, message: `Pedido rejeitado em "${task.step_name}"`, action_url: `/awq/bpm/instances/${instance.instance_id}`, is_read: false, read_at: null, send_email: true, email_sent: false, email_sent_at: null, priority: instance.priority });
    return { status: "rejected", workflow_completed: true };
  }

  const def = PROCESS_DEFS[instance.process_code];
  const nextStep = findNextExecutable(def.workflow_steps, task.step_id, instance.request_data);

  if (!nextStep) {
    updateInstance(instance.instance_id, { status: "approved", final_decision: "approved", completed_at: now });
    addNotification({ user_id: instance.initiated_by, notification_type: "approved", related_entity_type: "process_instance", related_entity_id: instance.instance_id, title: `Aprovação concluída`, message: `Pedido aprovado com sucesso!`, action_url: `/awq/bpm/instances/${instance.instance_id}`, is_read: false, read_at: null, send_email: true, email_sent: false, email_sent_at: null, priority: instance.priority });
    addHistory({ instance_id: instance.instance_id, action: "approved", action_description: "Workflow concluído", step_id: null, step_name: null, performed_by: null, performed_at: now, action_data: { final: true } });
    return { status: "approved", workflow_completed: true };
  }

  const newTask = createTask({ instance_id: instance.instance_id, step_id: nextStep.step_id, step_name: nextStep.step_name, assigned_to: resolveApprover(nextStep.approver_role), assigned_at: now, task_type: nextStep.step_type, status: "pending", decision: null, decision_notes: null, decided_by: null, decided_at: null, sla_hours: nextStep.sla_hours, sla_due_date: computeSlaDeadline(nextStep.sla_hours).toISOString(), sla_breached: false, escalated: false, escalated_to: null, escalated_at: null, task_data: instance.request_data });
  updateInstance(instance.instance_id, { current_step_id: nextStep.step_id, current_step_name: nextStep.step_name });
  addHistory({ instance_id: instance.instance_id, action: "step_completed", action_description: `Avançado para "${nextStep.step_name}"`, step_id: nextStep.step_id, step_name: nextStep.step_name, performed_by: null, performed_at: now, action_data: {} });
  addNotification({ user_id: resolveApprover(nextStep.approver_role), notification_type: "task_assigned", related_entity_type: "process_task", related_entity_id: newTask.task_id, title: `Nova aprovação`, message: `Tarefa: ${nextStep.step_name}`, action_url: `/awq/bpm/tasks/${newTask.task_id}`, is_read: false, read_at: null, send_email: true, email_sent: false, email_sent_at: null, priority: instance.priority });

  return { status: "approved", workflow_completed: false, next_step: nextStep.step_name, next_task_id: newTask.task_id };
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTES
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n🧪  BPM End-to-End Test Suite\n");

// ─────────────────────────────────────────────────────────────────────────────
section("1. Workflow Engine — Condições e Roteamento");
// ─────────────────────────────────────────────────────────────────────────────

// evaluateCondition
assert(evaluateCondition({ operator: ">=", value: 5000 }, 6000), "6000 >= 5000 → true");
assert(!evaluateCondition({ operator: ">=", value: 5000 }, 4000), "4000 >= 5000 → false");
assert(evaluateCondition({ operator: "<", value: 1000 }, 500), "500 < 1000 → true");
assert(!evaluateCondition({ operator: "<", value: 1000 }, 1000), "1000 < 1000 → false");
assert(evaluateCondition({ operator: ">", value: 0 }, 1), "1 > 0 → true");

// shouldExecuteStep
const stepWithCond = { step_id: "2", conditions: { amount: { operator: ">=", value: 5000 } } };
assert(shouldExecuteStep(stepWithCond, { amount: 8000 }), "step com amount=8000 executa (cond >=5000)");
assert(!shouldExecuteStep(stepWithCond, { amount: 3000 }), "step com amount=3000 pula (cond >=5000)");
assert(shouldExecuteStep({ step_id: "1" }, { amount: 500 }), "step sem condição sempre executa");

// derivePriority
assert(derivePriority(60000) === "urgent", "60K → urgent");
assert(derivePriority(12000) === "high", "12K → high");
assert(derivePriority(5500) === "normal", "5.5K → normal");
assert(derivePriority(900) === "low", "900 → low");

// SLA deadline
const deadline = computeSlaDeadline(24);
const hoursFromNow = (deadline - new Date()) / 3600000;
assert(hoursFromNow > 23.9 && hoursFromNow < 24.1, `SLA 24h calculado corretamente (${hoursFromNow.toFixed(2)}h)`);

// Role mapping
assert(resolveApprover("finance_manager") === "4", "finance_manager → Danilo (4)");
assert(resolveApprover("cfo") === "5", "cfo → Miguel (5)");
assert(resolveApprover("ceo") === "5", "ceo → Miguel (5)");
assert(resolveApprover("manager") === "2", "manager → Sam (2)");
assert(resolveApprover("legal") === "5", "legal → Miguel (5) [lean org]");

// ─────────────────────────────────────────────────────────────────────────────
section("2. Workflow AP_APPROVAL — R$8.000 (Finance + CFO)");
// ─────────────────────────────────────────────────────────────────────────────

const apReq = {
  process_code: "AP_APPROVAL",
  related_entity_type: "AP",
  related_entity_id: "ap-test-001",
  initiated_by: "4",
  request_data: { supplier_name: "João Silva Freelancer", amount: 8000, description: "Edição de vídeo Q2", bu: "Caza Vision" },
};

const apStart = startWorkflow(apReq);
assert(apStart.instance.status === "in_progress", "instância criada com status in_progress");
assert(apStart.instance.process_code === "AP_APPROVAL", "process_code correto");
assert(apStart.step.step_id === "1", "primeiro step = Finance Manager Review (step 1)");
assert(apStart.task.assigned_to === "4", "step 1 atribuído a Danilo (4)");
assert(apStart.task.status === "pending", "task status = pending");
assert(apStart.instance.sla_due_date !== null, "SLA due date calculado");

// SLA para amount=8000: should be normal priority
assert(apStart.instance.priority === "normal", `prioridade para R$8K = normal (got: ${apStart.instance.priority})`);

// Danilo (4) aprova step 1
const ap1 = completeTask({ task_id: apStart.task.task_id, decision: "approved", decision_notes: "OK, confirmo", decided_by: "4" });
assert(ap1.status === "approved", "step 1 retornou approved");
assert(!ap1.workflow_completed, "workflow NÃO concluído (falta CFO)");
assert(ap1.next_step === "CFO Approval", `próximo step = CFO Approval (got: ${ap1.next_step})`);

// Verificar instância avançou
const apInst1 = getInstance(apStart.instance.instance_id);
assert(apInst1.current_step_name === "CFO Approval", `instância avançou para CFO Approval`);
assert(apInst1.status === "in_progress", "instância ainda in_progress");

// Miguel (5) aprova step 2 — workflow completo
const ap2 = completeTask({ task_id: ap1.next_task_id, decision: "approved", decision_notes: "Aprovado", decided_by: "5" });
assert(ap2.status === "approved", "step 2 approved");
assert(ap2.workflow_completed === true, "workflow CONCLUÍDO");

const apFinal = getInstance(apStart.instance.instance_id);
assert(apFinal.status === "approved", `instância final = approved (got: ${apFinal.status})`);
assert(apFinal.final_decision === "approved", "final_decision = approved");

// Histórico completo
const apHistory = store.history.filter((h) => h.instance_id === apStart.instance.instance_id);
assert(apHistory.length >= 4, `histórico tem ${apHistory.length} entradas (mín. 4: started + step1 + step_completed + final)`);
assert(apHistory.some((h) => h.action === "started"), "histórico: started");
assert(apHistory.some((h) => h.action === "approved"), "histórico: approved");

// Notificações
const apNotifs = store.notifications.filter((n) => n.related_entity_id === apStart.instance.instance_id);
assert(apNotifs.some((n) => n.notification_type === "approved"), "notificação approved enviada ao iniciador");

// ─────────────────────────────────────────────────────────────────────────────
section("3. Workflow EXPENSE_APPROVAL — R$500 (apenas Manager)");
// ─────────────────────────────────────────────────────────────────────────────

// amount=500 → step 1 (Manager, cond <1000) executa; step 2 (CFO, cond >=1000) pula

const expStart = startWorkflow({
  process_code: "EXPENSE_APPROVAL",
  related_entity_type: "Expense",
  related_entity_id: "exp-001",
  initiated_by: "2",
  request_data: { description: "Almoço cliente", amount: 500 },
});

assert(expStart.step.step_id === "1", "primeiro step correto (Manager, cond <1000)");
assert(expStart.task.assigned_to === "2", "atribuído ao manager Sam (2)");

const exp1 = completeTask({ task_id: expStart.task.task_id, decision: "approved", decided_by: "2" });
assert(exp1.workflow_completed === true, "workflow completo (step CFO foi pulado por condição)");
assert(exp1.status === "approved", "aprovado direto sem CFO");

// ─────────────────────────────────────────────────────────────────────────────
section("4. Workflow EXPENSE_APPROVAL — R$2.000 (apenas CFO)");
// ─────────────────────────────────────────────────────────────────────────────

// amount=2000 → step 1 (Manager, cond <1000) pula; step 2 (CFO, cond >=1000) executa

const exp2Start = startWorkflow({
  process_code: "EXPENSE_APPROVAL",
  related_entity_type: "Expense",
  related_entity_id: "exp-002",
  initiated_by: "2",
  request_data: { description: "Software license", amount: 2000 },
});

assert(exp2Start.step.step_id === "2", "primeiro step executado = CFO (step 2, pois amount>=1000)");
assert(exp2Start.task.assigned_to === "5", "atribuído ao CFO Miguel (5)");
assert(exp2Start.instance.priority === "low", `prioridade para R$2K = low (got: ${exp2Start.instance.priority})`);

const exp2Complete = completeTask({ task_id: exp2Start.task.task_id, decision: "approved", decided_by: "5" });
assert(exp2Complete.workflow_completed === true, "workflow completo após CFO");

// ─────────────────────────────────────────────────────────────────────────────
section("5. Workflow PO_APPROVAL — R$15.000 (Manager → Finance → CEO)");
// ─────────────────────────────────────────────────────────────────────────────

const poStart = startWorkflow({
  process_code: "PO_APPROVAL",
  related_entity_type: "PO",
  related_entity_id: "po-001",
  initiated_by: "2",
  request_data: { amount: 15000, description: "Equipamento de filmagem" },
});

assert(poStart.step.step_id === "1", "PO R$15K começa em Manager");
assert(poStart.instance.priority === "high", `prioridade para R$15K = high (got: ${poStart.instance.priority})`);

const po1 = completeTask({ task_id: poStart.task.task_id, decision: "approved", decided_by: "2" });
assert(!po1.workflow_completed, "após Manager, ainda tem Finance");
assert(po1.next_step === "Finance Approval", `próximo: Finance Approval (got: ${po1.next_step})`);

const po2 = completeTask({ task_id: po1.next_task_id, decision: "approved", decided_by: "4" });
assert(!po2.workflow_completed, "após Finance, ainda tem CEO");
assert(po2.next_step === "CEO Approval", `próximo: CEO Approval (got: ${po2.next_step})`);

const po3 = completeTask({ task_id: po2.next_task_id, decision: "approved", decided_by: "5" });
assert(po3.workflow_completed === true, "PO R$15K: todos os 3 steps concluídos");
assert(po3.status === "approved", "PO final = approved");

// ─────────────────────────────────────────────────────────────────────────────
section("6. Rejeição — BUDGET_APPROVAL (rejeição em CFO Review)");
// ─────────────────────────────────────────────────────────────────────────────

const budStart = startWorkflow({
  process_code: "BUDGET_APPROVAL",
  related_entity_type: "Budget",
  related_entity_id: "bud-001",
  initiated_by: "2",
  request_data: { budget_name: "Q3 2026 — JACQES", amount: 350000, bu: "JACQES" },
});

assert(budStart.step.step_name === "BU Lead Review", "Budget começa em BU Lead Review");
assert(budStart.instance.priority === "urgent", `prioridade R$350K = urgent (got: ${budStart.instance.priority})`);

// BU Lead aprova
const bud1 = completeTask({ task_id: budStart.task.task_id, decision: "approved", decided_by: "2" });
assert(bud1.next_step === "CFO Review", `avançou para CFO Review (got: ${bud1.next_step})`);

// CFO rejeita
const bud2 = completeTask({ task_id: bud1.next_task_id, decision: "rejected", decision_notes: "Budget acima do limite aprovado para Q3", decided_by: "5" });
assert(bud2.status === "rejected", "workflow rejeitado pelo CFO");
assert(bud2.workflow_completed === true, "workflow encerrado na rejeição");

const budFinal = getInstance(budStart.instance.instance_id);
assert(budFinal.status === "rejected", `instância = rejected (got: ${budFinal.status})`);
assert(budFinal.rejection_reason === "Budget acima do limite aprovado para Q3", "motivo da rejeição salvo");
assert(budFinal.final_decision === "rejected", "final_decision = rejected");

// ─────────────────────────────────────────────────────────────────────────────
section("7. PROJECT_KICKOFF — Budget < R$50K (step CFO pulado)");
// ─────────────────────────────────────────────────────────────────────────────

const proj1Start = startWorkflow({
  process_code: "PROJECT_KICKOFF",
  related_entity_type: "Project",
  related_entity_id: "proj-001",
  initiated_by: "2",
  request_data: { project_name: "Site JACQES", budget: 30000 },
});

assert(proj1Start.step.step_name === "PM Review", "Kickoff começa em PM Review");

const proj1 = completeTask({ task_id: proj1Start.task.task_id, decision: "approved", decided_by: "2" });
assert(proj1.workflow_completed === true, "Kickoff R$30K: completo após PM (CFO pulado por budget<50K)");

// ─────────────────────────────────────────────────────────────────────────────
section("8. PROJECT_KICKOFF — Budget ≥ R$50K (CFO obrigatório)");
// ─────────────────────────────────────────────────────────────────────────────

const proj2Start = startWorkflow({
  process_code: "PROJECT_KICKOFF",
  related_entity_type: "Project",
  related_entity_id: "proj-002",
  initiated_by: "2",
  request_data: { project_name: "App JACQES", budget: 80000 },
});

const proj2 = completeTask({ task_id: proj2Start.task.task_id, decision: "approved", decided_by: "2" });
assert(!proj2.workflow_completed, "Kickoff R$80K: PM aprovado, CFO ainda pendente");
assert(proj2.next_step === "CFO Budget Approval", `próximo step: CFO Budget Approval (got: ${proj2.next_step})`);

const proj2cfo = completeTask({ task_id: proj2.next_task_id, decision: "approved", decided_by: "5" });
assert(proj2cfo.workflow_completed === true, "Kickoff R$80K: CFO aprovou, workflow completo");

// ─────────────────────────────────────────────────────────────────────────────
section("9. CONTRACT_APPROVAL — 3 steps completos");
// ─────────────────────────────────────────────────────────────────────────────

const conStart = startWorkflow({
  process_code: "CONTRACT_APPROVAL",
  related_entity_type: "Contract",
  related_entity_id: "contract-001",
  initiated_by: "2",
  request_data: { contract_name: "Contrato Produção Caza", amount: 45000 },
});

assert(conStart.step.step_name === "Legal Review", "Contrato começa em Legal Review");
const con1 = completeTask({ task_id: conStart.task.task_id, decision: "approved", decided_by: "5" });
assert(con1.next_step === "Finance Review", `step 2 = Finance Review (got: ${con1.next_step})`);
const con2 = completeTask({ task_id: con1.next_task_id, decision: "approved", decided_by: "4" });
assert(con2.next_step === "CEO Signature", `step 3 = CEO Signature (got: ${con2.next_step})`);
const con3 = completeTask({ task_id: con2.next_task_id, decision: "approved", decided_by: "5" });
assert(con3.workflow_completed === true, "Contract: todos os 3 steps aprovados");

// ─────────────────────────────────────────────────────────────────────────────
section("10. Validações de erro e edge cases");
// ─────────────────────────────────────────────────────────────────────────────

// Task já processada não pode ser reprocessada
let errThrown = false;
try {
  completeTask({ task_id: apStart.task.task_id, decision: "approved", decided_by: "4" });
} catch (e) {
  errThrown = true;
}
assert(errThrown, "completar task já processada lança erro");

// Process code inválido
let errThrown2 = false;
try {
  startWorkflow({ process_code: "INVALID_PROCESS", related_entity_type: "AP", related_entity_id: "x", initiated_by: "4", request_data: {} });
} catch (e) {
  errThrown2 = true;
}
assert(errThrown2, "process_code inválido lança erro");

// Task não encontrada
let errThrown3 = false;
try {
  completeTask({ task_id: "task-inexistente", decision: "approved", decided_by: "5" });
} catch (e) {
  errThrown3 = true;
}
assert(errThrown3, "task_id inexistente lança erro");

// ─────────────────────────────────────────────────────────────────────────────
section("11. Store — dados finais acumulados");
// ─────────────────────────────────────────────────────────────────────────────

const totalInst = store.instances.length;
const approved  = store.instances.filter((i) => i.status === "approved").length;
const rejected  = store.instances.filter((i) => i.status === "rejected").length;
const allTasks  = store.tasks.length;
const histCount = store.history.length;
const notifCount = store.notifications.length;

console.log(`  📊  Instâncias:    ${totalInst} total  |  ${approved} approved  |  ${rejected} rejected`);
console.log(`  📋  Tasks:         ${allTasks}`);
console.log(`  📜  Histórico:     ${histCount} entradas`);
console.log(`  🔔  Notificações:  ${notifCount}`);

assert(totalInst >= 7, `7+ instâncias criadas (got: ${totalInst})`);
assert(approved >= 5, `5+ instâncias aprovadas (got: ${approved})`);
assert(rejected >= 1, `1+ instância rejeitada (got: ${rejected})`);
assert(histCount > 0, "histórico não está vazio");
assert(notifCount > 0, "notificações foram criadas");

// Verificar que todas as notificações têm campos obrigatórios
const notifValid = store.notifications.every((n) => n.user_id && n.title && n.message && n.notification_type);
assert(notifValid, "todas as notificações têm user_id, title, message, notification_type");

// ─────────────────────────────────────────────────────────────────────────────
// Resultado final
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
const total = passed + failed;
const rate = Math.round((passed / total) * 100);
console.log(`  RESULTADO: ${passed}/${total} passaram (${rate}%)`);
if (failed === 0) {
  console.log("  🎉  TODOS OS TESTES PASSARAM\n");
  process.exit(0);
} else {
  console.log(`  ❌  ${failed} FALHOU(ARAM)\n`);
  process.exit(1);
}
