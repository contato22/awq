// ─── AWQ BPM — Database Layer ─────────────────────────────────────────────────
//
// Persistence adapter for the BPM Workflow Engine.
//
// STORAGE:
//   DATABASE_URL set  → Neon (Postgres) via @neondatabase/serverless
//   DATABASE_URL unset → In-memory JSON store (local dev / GitHub Pages build)
//
// SERVER-ONLY — do not import in client components.

import { sql, USE_DB } from "@/lib/db";
import type {
  ProcessDefinition,
  ProcessInstance,
  ProcessTask,
  ProcessHistoryEntry,
  BpmNotification,
  WorkQueueItem,
  ProcessPerformance,
  SlaDashboardRow,
  BottleneckRow,
  WorkQueueStats,
  InstanceStatus,
  ProcessPriority,
  EntityType,
  TaskStatus,
  HistoryAction,
  NotificationType,
} from "@/lib/bpm-types";

// ─── In-memory store (fallback when no DATABASE_URL) ─────────────────────────

const _store = {
  instances: [] as ProcessInstance[],
  tasks: [] as ProcessTask[],
  history: [] as ProcessHistoryEntry[],
  notifications: [] as BpmNotification[],
};

let _instanceSeq = 1;
function nextInstanceCode() {
  const year = new Date().getFullYear();
  return `PI-${year}-${String(_instanceSeq++).padStart(4, "0")}`;
}

// ─── Schema bootstrap (Neon only) ────────────────────────────────────────────

export async function initBpmDB(): Promise<void> {
  if (!sql) return;

  // Process definitions table + seed
  await sql`
    CREATE TABLE IF NOT EXISTS process_definitions (
      process_def_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      process_code      TEXT        NOT NULL UNIQUE,
      process_name      TEXT        NOT NULL,
      process_category  TEXT        NOT NULL,
      description       TEXT,
      process_owner     TEXT,
      workflow_steps    JSONB       NOT NULL,
      routing_rules     JSONB,
      default_sla_hours INTEGER     NOT NULL DEFAULT 48,
      escalation_enabled BOOLEAN    NOT NULL DEFAULT TRUE,
      escalation_hours  INTEGER     NOT NULL DEFAULT 72,
      notification_config JSONB,
      is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
      version           INTEGER     NOT NULL DEFAULT 1,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by        TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS process_instances (
      instance_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      instance_code       TEXT        NOT NULL UNIQUE,
      process_def_id      UUID        REFERENCES process_definitions(process_def_id),
      process_code        TEXT        NOT NULL,
      process_name        TEXT        NOT NULL,
      related_entity_type TEXT        NOT NULL,
      related_entity_id   TEXT        NOT NULL,
      request_data        JSONB       NOT NULL DEFAULT '{}',
      initiated_by        TEXT        NOT NULL,
      initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      current_step_id     TEXT,
      current_step_name   TEXT,
      status              TEXT        NOT NULL DEFAULT 'in_progress',
      started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at        TIMESTAMPTZ,
      sla_due_date        TIMESTAMPTZ,
      sla_breached        BOOLEAN     NOT NULL DEFAULT FALSE,
      final_decision      TEXT,
      rejection_reason    TEXT,
      priority            TEXT        NOT NULL DEFAULT 'normal',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS process_tasks (
      task_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      instance_id     UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,
      step_id         TEXT        NOT NULL,
      step_name       TEXT        NOT NULL,
      assigned_to     TEXT        NOT NULL,
      assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      task_type       TEXT        NOT NULL DEFAULT 'approval',
      status          TEXT        NOT NULL DEFAULT 'pending',
      decision        TEXT,
      decision_notes  TEXT,
      decided_by      TEXT,
      decided_at      TIMESTAMPTZ,
      sla_hours       INTEGER,
      sla_due_date    TIMESTAMPTZ,
      sla_breached    BOOLEAN     NOT NULL DEFAULT FALSE,
      escalated       BOOLEAN     NOT NULL DEFAULT FALSE,
      escalated_to    TEXT,
      escalated_at    TIMESTAMPTZ,
      task_data       JSONB,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS process_history (
      history_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      instance_id         UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,
      action              TEXT        NOT NULL,
      action_description  TEXT,
      step_id             TEXT,
      step_name           TEXT,
      performed_by        TEXT,
      performed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action_data         JSONB,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bpm_notifications (
      notification_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             TEXT        NOT NULL,
      notification_type   TEXT        NOT NULL,
      related_entity_type TEXT,
      related_entity_id   UUID,
      title               TEXT        NOT NULL,
      message             TEXT        NOT NULL,
      action_url          TEXT,
      is_read             BOOLEAN     NOT NULL DEFAULT FALSE,
      read_at             TIMESTAMPTZ,
      send_email          BOOLEAN     NOT NULL DEFAULT TRUE,
      email_sent          BOOLEAN     NOT NULL DEFAULT FALSE,
      email_sent_at       TIMESTAMPTZ,
      priority            TEXT        NOT NULL DEFAULT 'normal',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_pi_status       ON process_instances(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pi_entity       ON process_instances(related_entity_type, related_entity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pt_assigned     ON process_tasks(assigned_to)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pt_status       ON process_tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ph_instance     ON process_history(instance_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bn_user_unread  ON bpm_notifications(user_id, is_read)`;

  // Seed process definitions
  await _seedProcessDefinitions();
}

async function _seedProcessDefinitions(): Promise<void> {
  if (!sql) return;

  const seeds = [
    {
      code: "PO_APPROVAL",
      name: "Purchase Order Approval",
      category: "procurement",
      desc: "Aprovação de ordens de compra. >R$1K: Manager. >R$5K: Finance. >R$10K: CEO.",
      sla: 72,
      steps: [
        { step_id: "1", step_name: "Manager Review", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: ">=", value: 1000 } } },
        { step_id: "2", step_name: "Finance Approval", step_type: "approval", approver_role: "finance_manager", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } },
        { step_id: "3", step_name: "CEO Approval", step_type: "approval", approver_role: "ceo", sla_hours: 72, conditions: { amount: { operator: ">=", value: 10000 } } },
      ],
    },
    {
      code: "EXPENSE_APPROVAL",
      name: "Expense Approval",
      category: "finance",
      desc: "Aprovação de despesas operacionais. <R$1K: Manager. ≥R$1K: CFO.",
      sla: 48,
      steps: [
        { step_id: "1", step_name: "Manager Approval", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: "<", value: 1000 } } },
        { step_id: "2", step_name: "CFO Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { amount: { operator: ">=", value: 1000 } } },
      ],
    },
    {
      code: "AP_APPROVAL",
      name: "Accounts Payable Approval",
      category: "finance",
      desc: "Aprovação de contas a pagar. Sempre Finance; ≥R$5K também CFO.",
      sla: 48,
      steps: [
        { step_id: "1", step_name: "Finance Manager Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 },
        { step_id: "2", step_name: "CFO Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } },
      ],
    },
    {
      code: "BUDGET_APPROVAL",
      name: "Budget Approval",
      category: "finance",
      desc: "Aprovação do orçamento anual/trimestral. BU Lead → CFO → CEO → Locked.",
      sla: 240,
      steps: [
        { step_id: "1", step_name: "BU Lead Review", step_type: "approval", approver_role: "bu_lead", sla_hours: 72 },
        { step_id: "2", step_name: "CFO Review", step_type: "approval", approver_role: "cfo", sla_hours: 96 },
        { step_id: "3", step_name: "CEO Final Approval", step_type: "approval", approver_role: "ceo", sla_hours: 120 },
      ],
    },
    {
      code: "CONTRACT_APPROVAL",
      name: "Contract Approval",
      category: "legal",
      desc: "Aprovação de contratos. Legal → Finance → CEO.",
      sla: 168,
      steps: [
        { step_id: "1", step_name: "Legal Review", step_type: "approval", approver_role: "legal", sla_hours: 96 },
        { step_id: "2", step_name: "Finance Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 },
        { step_id: "3", step_name: "CEO Signature", step_type: "approval", approver_role: "ceo", sla_hours: 72 },
      ],
    },
    {
      code: "PROJECT_KICKOFF",
      name: "Project Kickoff Approval",
      category: "project_management",
      desc: "Aprovação para iniciar novo projeto. PM Review → CFO (budget ≥R$50K).",
      sla: 72,
      steps: [
        { step_id: "1", step_name: "PM Review", step_type: "approval", approver_role: "pm", sla_hours: 24 },
        { step_id: "2", step_name: "CFO Budget Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { budget: { operator: ">=", value: 50000 } } },
      ],
    },
  ];

  for (const s of seeds) {
    await sql!`
      INSERT INTO process_definitions
        (process_code, process_name, process_category, description, workflow_steps, default_sla_hours)
      VALUES (${s.code}, ${s.name}, ${s.category}, ${s.desc}, ${JSON.stringify(s.steps)}, ${s.sla})
      ON CONFLICT (process_code) DO NOTHING
    `;
  }
}

// ─── Process Definitions ──────────────────────────────────────────────────────

// In-memory seed for non-DB mode
const PROCESS_DEFS_SEED: ProcessDefinition[] = [
  { process_def_id: "pd-po", process_code: "PO_APPROVAL", process_name: "Purchase Order Approval", process_category: "procurement", description: "Aprovação de ordens de compra", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Manager Review", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: ">=", value: 1000 } } }, { step_id: "2", step_name: "Finance Approval", step_type: "approval", approver_role: "finance_manager", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } }, { step_id: "3", step_name: "CEO Approval", step_type: "approval", approver_role: "ceo", sla_hours: 72, conditions: { amount: { operator: ">=", value: 10000 } } }], routing_rules: null, default_sla_hours: 72, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: "5" },
  { process_def_id: "pd-exp", process_code: "EXPENSE_APPROVAL", process_name: "Expense Approval", process_category: "finance", description: "Aprovação de despesas", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Manager Approval", step_type: "approval", approver_role: "manager", sla_hours: 24, conditions: { amount: { operator: "<", value: 1000 } } }, { step_id: "2", step_name: "CFO Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { amount: { operator: ">=", value: 1000 } } }], routing_rules: null, default_sla_hours: 48, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: "5" },
  { process_def_id: "pd-ap", process_code: "AP_APPROVAL", process_name: "Accounts Payable Approval", process_category: "finance", description: "Aprovação de contas a pagar", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Finance Manager Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 }, { step_id: "2", step_name: "CFO Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { amount: { operator: ">=", value: 5000 } } }], routing_rules: null, default_sla_hours: 48, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: "5" },
  { process_def_id: "pd-bud", process_code: "BUDGET_APPROVAL", process_name: "Budget Approval", process_category: "finance", description: "Aprovação do orçamento", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "BU Lead Review", step_type: "approval", approver_role: "bu_lead", sla_hours: 72 }, { step_id: "2", step_name: "CFO Review", step_type: "approval", approver_role: "cfo", sla_hours: 96 }, { step_id: "3", step_name: "CEO Final Approval", step_type: "approval", approver_role: "ceo", sla_hours: 120 }], routing_rules: null, default_sla_hours: 240, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: "5" },
  { process_def_id: "pd-con", process_code: "CONTRACT_APPROVAL", process_name: "Contract Approval", process_category: "legal", description: "Aprovação de contratos", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "Legal Review", step_type: "approval", approver_role: "legal", sla_hours: 96 }, { step_id: "2", step_name: "Finance Review", step_type: "approval", approver_role: "finance_manager", sla_hours: 48 }, { step_id: "3", step_name: "CEO Signature", step_type: "approval", approver_role: "ceo", sla_hours: 72 }], routing_rules: null, default_sla_hours: 168, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: "5" },
  { process_def_id: "pd-prj", process_code: "PROJECT_KICKOFF", process_name: "Project Kickoff Approval", process_category: "project_management", description: "Aprovação para iniciar projeto", process_owner: "5", workflow_steps: [{ step_id: "1", step_name: "PM Review", step_type: "approval", approver_role: "pm", sla_hours: 24 }, { step_id: "2", step_name: "CFO Budget Approval", step_type: "approval", approver_role: "cfo", sla_hours: 48, conditions: { budget: { operator: ">=", value: 50000 } } }], routing_rules: null, default_sla_hours: 72, escalation_enabled: true, escalation_hours: 72, notification_config: null, is_active: true, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: "5" },
];

export async function getAllProcessDefinitions(): Promise<ProcessDefinition[]> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT * FROM process_definitions WHERE is_active = TRUE ORDER BY process_category, process_name
    `;
    return rows.map(dbRowToProcessDef);
  }
  return PROCESS_DEFS_SEED.filter((d) => d.is_active);
}

export async function getProcessDefinitionByCode(code: string): Promise<ProcessDefinition | null> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT * FROM process_definitions WHERE process_code = ${code} AND is_active = TRUE LIMIT 1
    `;
    return rows[0] ? dbRowToProcessDef(rows[0]) : null;
  }
  return PROCESS_DEFS_SEED.find((d) => d.process_code === code && d.is_active) ?? null;
}

// ─── Process Instances ────────────────────────────────────────────────────────

export async function createProcessInstance(
  data: Omit<ProcessInstance, "instance_id" | "created_at" | "updated_at">
): Promise<ProcessInstance> {
  if (USE_DB && sql) {
    const rows = await sql`
      INSERT INTO process_instances
        (instance_code, process_def_id, process_code, process_name,
         related_entity_type, related_entity_id, request_data,
         initiated_by, current_step_id, current_step_name, status,
         sla_due_date, priority)
      VALUES
        (${data.instance_code}, ${data.process_def_id}, ${data.process_code}, ${data.process_name},
         ${data.related_entity_type}, ${data.related_entity_id}, ${JSON.stringify(data.request_data)},
         ${data.initiated_by}, ${data.current_step_id}, ${data.current_step_name}, ${data.status},
         ${data.sla_due_date}, ${data.priority})
      RETURNING *
    `;
    return dbRowToInstance(rows[0]);
  }
  const inst: ProcessInstance = {
    ...data,
    instance_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  _store.instances.push(inst);
  return inst;
}

export async function getProcessInstance(instanceId: string): Promise<ProcessInstance | null> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM process_instances WHERE instance_id = ${instanceId} LIMIT 1`;
    return rows[0] ? dbRowToInstance(rows[0]) : null;
  }
  return _store.instances.find((i) => i.instance_id === instanceId) ?? null;
}

export async function updateProcessInstance(
  instanceId: string,
  updates: Partial<ProcessInstance>
): Promise<ProcessInstance | null> {
  if (USE_DB && sql) {
    const rows = await sql`
      UPDATE process_instances SET
        status            = COALESCE(${updates.status ?? null}, status),
        current_step_id   = COALESCE(${updates.current_step_id ?? null}, current_step_id),
        current_step_name = COALESCE(${updates.current_step_name ?? null}, current_step_name),
        final_decision    = COALESCE(${updates.final_decision ?? null}, final_decision),
        rejection_reason  = COALESCE(${updates.rejection_reason ?? null}, rejection_reason),
        completed_at      = COALESCE(${updates.completed_at ?? null}, completed_at),
        sla_breached      = COALESCE(${updates.sla_breached ?? null}, sla_breached),
        updated_at        = NOW()
      WHERE instance_id = ${instanceId}
      RETURNING *
    `;
    return rows[0] ? dbRowToInstance(rows[0]) : null;
  }
  const idx = _store.instances.findIndex((i) => i.instance_id === instanceId);
  if (idx === -1) return null;
  _store.instances[idx] = { ..._store.instances[idx], ...updates, updated_at: new Date().toISOString() };
  return _store.instances[idx];
}

export async function getAllInstances(filter?: {
  status?: InstanceStatus;
  process_code?: string;
  initiated_by?: string;
}): Promise<ProcessInstance[]> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT * FROM process_instances
      WHERE (${filter?.status ?? null} IS NULL OR status = ${filter?.status ?? null})
        AND (${filter?.process_code ?? null} IS NULL OR process_code = ${filter?.process_code ?? null})
        AND (${filter?.initiated_by ?? null} IS NULL OR initiated_by = ${filter?.initiated_by ?? null})
      ORDER BY created_at DESC
    `;
    return rows.map(dbRowToInstance);
  }
  let list = [..._store.instances];
  if (filter?.status) list = list.filter((i) => i.status === filter.status);
  if (filter?.process_code) list = list.filter((i) => i.process_code === filter.process_code);
  if (filter?.initiated_by) list = list.filter((i) => i.initiated_by === filter.initiated_by);
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ─── Process Tasks ────────────────────────────────────────────────────────────

export async function createProcessTask(
  data: Omit<ProcessTask, "task_id" | "created_at" | "updated_at">
): Promise<ProcessTask> {
  if (USE_DB && sql) {
    const rows = await sql`
      INSERT INTO process_tasks
        (instance_id, step_id, step_name, assigned_to, task_type,
         status, sla_hours, sla_due_date, task_data)
      VALUES
        (${data.instance_id}, ${data.step_id}, ${data.step_name}, ${data.assigned_to},
         ${data.task_type}, ${data.status}, ${data.sla_hours}, ${data.sla_due_date},
         ${data.task_data ? JSON.stringify(data.task_data) : null})
      RETURNING *
    `;
    return dbRowToTask(rows[0]);
  }
  const task: ProcessTask = {
    ...data,
    task_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  _store.tasks.push(task);
  return task;
}

export async function getProcessTask(taskId: string): Promise<ProcessTask | null> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM process_tasks WHERE task_id = ${taskId} LIMIT 1`;
    return rows[0] ? dbRowToTask(rows[0]) : null;
  }
  return _store.tasks.find((t) => t.task_id === taskId) ?? null;
}

export async function updateProcessTask(
  taskId: string,
  updates: Partial<ProcessTask>
): Promise<ProcessTask | null> {
  if (USE_DB && sql) {
    const rows = await sql`
      UPDATE process_tasks SET
        status         = COALESCE(${updates.status ?? null}, status),
        decision       = COALESCE(${updates.decision ?? null}, decision),
        decision_notes = COALESCE(${updates.decision_notes ?? null}, decision_notes),
        decided_by     = COALESCE(${updates.decided_by ?? null}, decided_by),
        decided_at     = COALESCE(${updates.decided_at ?? null}, decided_at),
        sla_breached   = COALESCE(${updates.sla_breached ?? null}, sla_breached),
        escalated      = COALESCE(${updates.escalated ?? null}, escalated),
        escalated_to   = COALESCE(${updates.escalated_to ?? null}, escalated_to),
        escalated_at   = COALESCE(${updates.escalated_at ?? null}, escalated_at),
        updated_at     = NOW()
      WHERE task_id = ${taskId}
      RETURNING *
    `;
    return rows[0] ? dbRowToTask(rows[0]) : null;
  }
  const idx = _store.tasks.findIndex((t) => t.task_id === taskId);
  if (idx === -1) return null;
  _store.tasks[idx] = { ..._store.tasks[idx], ...updates, updated_at: new Date().toISOString() };
  return _store.tasks[idx];
}

export async function getPendingTasksForUser(userId: string): Promise<WorkQueueItem[]> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT
        t.task_id, t.instance_id, t.step_id, t.step_name, t.task_type,
        t.status AS task_status, t.assigned_to, t.assigned_at,
        t.sla_due_date, t.sla_breached,
        i.instance_code, i.process_code, i.process_name,
        i.related_entity_type, i.related_entity_id,
        i.request_data, i.initiated_by, i.priority,
        EXTRACT(EPOCH FROM (NOW() - t.assigned_at)) / 3600 AS hours_pending,
        EXTRACT(EPOCH FROM (t.sla_due_date - NOW())) / 3600 AS sla_hours_remaining
      FROM process_tasks t
      JOIN process_instances i ON t.instance_id = i.instance_id
      WHERE t.assigned_to = ${userId} AND t.status = 'pending'
      ORDER BY
        CASE WHEN t.sla_breached THEN 0 ELSE 1 END,
        CASE WHEN i.priority = 'urgent' THEN 0 WHEN i.priority = 'high' THEN 1
             WHEN i.priority = 'normal' THEN 2 ELSE 3 END,
        t.sla_due_date ASC NULLS LAST
    `;
    return rows.map(dbRowToWorkQueueItem);
  }
  const pendingTasks = _store.tasks.filter((t) => t.assigned_to === userId && t.status === "pending");
  return pendingTasks.map((t) => {
    const inst = _store.instances.find((i) => i.instance_id === t.instance_id);
    if (!inst) return null;
    const now = Date.now();
    const hoursP = t.assigned_at ? (now - new Date(t.assigned_at).getTime()) / 3_600_000 : null;
    const slaTR = t.sla_due_date ? (new Date(t.sla_due_date).getTime() - now) / 3_600_000 : null;
    return {
      task_id: t.task_id, instance_id: t.instance_id, step_id: t.step_id,
      step_name: t.step_name, task_type: t.task_type, task_status: t.status,
      assigned_to: t.assigned_to, assigned_at: t.assigned_at,
      sla_due_date: t.sla_due_date, sla_breached: t.sla_breached,
      instance_code: inst.instance_code, process_code: inst.process_code,
      process_name: inst.process_name, related_entity_type: inst.related_entity_type,
      related_entity_id: inst.related_entity_id, request_data: inst.request_data,
      initiated_by: inst.initiated_by, priority: inst.priority,
      hours_pending: hoursP, sla_hours_remaining: slaTR,
    } as WorkQueueItem;
  }).filter(Boolean) as WorkQueueItem[];
}

export async function getTasksForInstance(instanceId: string): Promise<ProcessTask[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM process_tasks WHERE instance_id = ${instanceId} ORDER BY created_at ASC`;
    return rows.map(dbRowToTask);
  }
  return _store.tasks.filter((t) => t.instance_id === instanceId);
}

// ─── Process History ──────────────────────────────────────────────────────────

export async function addHistoryEntry(
  data: Omit<ProcessHistoryEntry, "history_id" | "created_at">
): Promise<ProcessHistoryEntry> {
  if (USE_DB && sql) {
    const rows = await sql`
      INSERT INTO process_history
        (instance_id, action, action_description, step_id, step_name, performed_by, performed_at, action_data)
      VALUES
        (${data.instance_id}, ${data.action}, ${data.action_description},
         ${data.step_id}, ${data.step_name}, ${data.performed_by},
         ${data.performed_at}, ${data.action_data ? JSON.stringify(data.action_data) : null})
      RETURNING *
    `;
    return dbRowToHistory(rows[0]);
  }
  const entry: ProcessHistoryEntry = {
    ...data,
    history_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  _store.history.push(entry);
  return entry;
}

export async function getInstanceHistory(instanceId: string): Promise<ProcessHistoryEntry[]> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT * FROM process_history WHERE instance_id = ${instanceId} ORDER BY performed_at ASC
    `;
    return rows.map(dbRowToHistory);
  }
  return _store.history
    .filter((h) => h.instance_id === instanceId)
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  data: Omit<BpmNotification, "notification_id" | "created_at">
): Promise<BpmNotification> {
  if (USE_DB && sql) {
    const rows = await sql`
      INSERT INTO bpm_notifications
        (user_id, notification_type, related_entity_type, related_entity_id,
         title, message, action_url, priority, send_email)
      VALUES
        (${data.user_id}, ${data.notification_type}, ${data.related_entity_type},
         ${data.related_entity_id}, ${data.title}, ${data.message},
         ${data.action_url}, ${data.priority}, ${data.send_email})
      RETURNING *
    `;
    return dbRowToNotification(rows[0]);
  }
  const notif: BpmNotification = {
    ...data,
    notification_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  _store.notifications.push(notif);
  return notif;
}

export async function getUnreadNotifications(userId: string): Promise<BpmNotification[]> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT * FROM bpm_notifications WHERE user_id = ${userId} AND is_read = FALSE ORDER BY created_at DESC LIMIT 50
    `;
    return rows.map(dbRowToNotification);
  }
  return _store.notifications
    .filter((n) => n.user_id === userId && !n.is_read)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (USE_DB && sql) {
    await sql`
      UPDATE bpm_notifications SET is_read = TRUE, read_at = NOW() WHERE notification_id = ${notificationId}
    `;
    return;
  }
  const n = _store.notifications.find((n) => n.notification_id === notificationId);
  if (n) { n.is_read = true; n.read_at = new Date().toISOString(); }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getProcessPerformance(): Promise<ProcessPerformance[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM v_process_performance ORDER BY total_instances DESC`;
    return rows as ProcessPerformance[];
  }
  return PROCESS_DEFS_SEED.map((d) => ({
    process_def_id: d.process_def_id, process_code: d.process_code,
    process_name: d.process_name, process_category: d.process_category,
    total_instances: _store.instances.filter((i) => i.process_code === d.process_code).length,
    approved_count: _store.instances.filter((i) => i.process_code === d.process_code && i.status === "approved").length,
    rejected_count: _store.instances.filter((i) => i.process_code === d.process_code && i.status === "rejected").length,
    in_progress_count: _store.instances.filter((i) => i.process_code === d.process_code && i.status === "in_progress").length,
    approval_rate_pct: 0, avg_cycle_time_hours: null, sla_breaches: 0, sla_compliance_pct: 100,
  }));
}

export async function getSlaDashboard(): Promise<SlaDashboardRow[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM v_sla_dashboard`;
    return rows as SlaDashboardRow[];
  }
  return PROCESS_DEFS_SEED.map((d) => ({
    process_code: d.process_code, process_name: d.process_name,
    active_tasks: _store.tasks.filter((t) => {
      const inst = _store.instances.find((i) => i.instance_id === t.instance_id);
      return inst?.process_code === d.process_code && t.status === "pending";
    }).length,
    breached_tasks: 0, at_risk_tasks: 0, avg_response_hours: null,
  }));
}

export async function getBottlenecks(): Promise<BottleneckRow[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM v_process_bottlenecks LIMIT 20`;
    return rows as BottleneckRow[];
  }
  return [];
}

// ─── SLA Check (cron job logic) ───────────────────────────────────────────────

export async function markOverdueTasks(): Promise<number> {
  if (USE_DB && sql) {
    const res = await sql`
      UPDATE process_tasks
        SET sla_breached = TRUE, updated_at = NOW()
      WHERE status = 'pending'
        AND sla_due_date < NOW()
        AND sla_breached = FALSE
    `;
    await sql`
      UPDATE process_instances
        SET sla_breached = TRUE, updated_at = NOW()
      WHERE status = 'in_progress'
        AND sla_due_date < NOW()
        AND sla_breached = FALSE
    `;
    return res.length ?? 0;
  }
  const now = new Date();
  let count = 0;
  for (const t of _store.tasks) {
    if (t.status === "pending" && t.sla_due_date && new Date(t.sla_due_date) < now && !t.sla_breached) {
      t.sla_breached = true; count++;
    }
  }
  return count;
}

// ─── Instance code generator ──────────────────────────────────────────────────

export async function generateInstanceCode(): Promise<string> {
  if (USE_DB && sql) {
    const rows = await sql`
      SELECT COUNT(*) AS cnt FROM process_instances
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    `;
    const seq = Number(rows[0].cnt) + 1;
    return `PI-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
  }
  return nextInstanceCode();
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function dbRowToProcessDef(row: Record<string, unknown>): ProcessDefinition {
  return {
    process_def_id: String(row.process_def_id),
    process_code: String(row.process_code),
    process_name: String(row.process_name),
    process_category: row.process_category as ProcessDefinition["process_category"],
    description: row.description as string | null,
    process_owner: row.process_owner as string | null,
    workflow_steps: typeof row.workflow_steps === "string"
      ? JSON.parse(row.workflow_steps)
      : (row.workflow_steps as ProcessDefinition["workflow_steps"]),
    routing_rules: row.routing_rules as Record<string, unknown> | null,
    default_sla_hours: Number(row.default_sla_hours),
    escalation_enabled: Boolean(row.escalation_enabled),
    escalation_hours: Number(row.escalation_hours),
    notification_config: row.notification_config as Record<string, unknown> | null,
    is_active: Boolean(row.is_active),
    version: Number(row.version),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    created_by: row.created_by as string | null,
  };
}

function dbRowToInstance(row: Record<string, unknown>): ProcessInstance {
  return {
    instance_id: String(row.instance_id),
    instance_code: String(row.instance_code),
    process_def_id: String(row.process_def_id),
    process_code: String(row.process_code),
    process_name: String(row.process_name),
    related_entity_type: row.related_entity_type as EntityType,
    related_entity_id: String(row.related_entity_id),
    request_data: typeof row.request_data === "string" ? JSON.parse(row.request_data) : (row.request_data as Record<string, unknown>) ?? {},
    initiated_by: String(row.initiated_by),
    initiated_at: String(row.initiated_at),
    current_step_id: row.current_step_id as string | null,
    current_step_name: row.current_step_name as string | null,
    status: row.status as InstanceStatus,
    started_at: String(row.started_at),
    completed_at: row.completed_at as string | null,
    sla_due_date: row.sla_due_date as string | null,
    sla_breached: Boolean(row.sla_breached),
    final_decision: row.final_decision as ProcessInstance["final_decision"],
    rejection_reason: row.rejection_reason as string | null,
    priority: row.priority as ProcessPriority,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function dbRowToTask(row: Record<string, unknown>): ProcessTask {
  return {
    task_id: String(row.task_id),
    instance_id: String(row.instance_id),
    step_id: String(row.step_id),
    step_name: String(row.step_name),
    assigned_to: String(row.assigned_to),
    assigned_at: String(row.assigned_at),
    task_type: row.task_type as ProcessTask["task_type"],
    status: row.status as TaskStatus,
    decision: row.decision as "approved" | "rejected" | null,
    decision_notes: row.decision_notes as string | null,
    decided_by: row.decided_by as string | null,
    decided_at: row.decided_at as string | null,
    sla_hours: row.sla_hours ? Number(row.sla_hours) : null,
    sla_due_date: row.sla_due_date as string | null,
    sla_breached: Boolean(row.sla_breached),
    escalated: Boolean(row.escalated),
    escalated_to: row.escalated_to as string | null,
    escalated_at: row.escalated_at as string | null,
    task_data: typeof row.task_data === "string" ? JSON.parse(row.task_data) : (row.task_data as Record<string, unknown> | null),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function dbRowToHistory(row: Record<string, unknown>): ProcessHistoryEntry {
  return {
    history_id: String(row.history_id),
    instance_id: String(row.instance_id),
    action: row.action as HistoryAction,
    action_description: row.action_description as string | null,
    step_id: row.step_id as string | null,
    step_name: row.step_name as string | null,
    performed_by: row.performed_by as string | null,
    performed_at: String(row.performed_at),
    action_data: typeof row.action_data === "string" ? JSON.parse(row.action_data) : (row.action_data as Record<string, unknown> | null),
    created_at: String(row.created_at),
  };
}

function dbRowToNotification(row: Record<string, unknown>): BpmNotification {
  return {
    notification_id: String(row.notification_id),
    user_id: String(row.user_id),
    notification_type: row.notification_type as NotificationType,
    related_entity_type: row.related_entity_type as BpmNotification["related_entity_type"],
    related_entity_id: row.related_entity_id as string | null,
    title: String(row.title),
    message: String(row.message),
    action_url: row.action_url as string | null,
    is_read: Boolean(row.is_read),
    read_at: row.read_at as string | null,
    send_email: Boolean(row.send_email),
    email_sent: Boolean(row.email_sent),
    email_sent_at: row.email_sent_at as string | null,
    priority: row.priority as ProcessPriority,
    created_at: String(row.created_at),
  };
}

function dbRowToWorkQueueItem(row: Record<string, unknown>): WorkQueueItem {
  return {
    task_id: String(row.task_id),
    instance_id: String(row.instance_id),
    step_id: String(row.step_id),
    step_name: String(row.step_name),
    task_type: String(row.task_type),
    task_status: row.task_status as TaskStatus,
    assigned_to: String(row.assigned_to),
    assigned_at: String(row.assigned_at),
    sla_due_date: row.sla_due_date as string | null,
    sla_breached: Boolean(row.sla_breached),
    instance_code: String(row.instance_code),
    process_code: String(row.process_code),
    process_name: String(row.process_name),
    related_entity_type: row.related_entity_type as EntityType,
    related_entity_id: String(row.related_entity_id),
    request_data: typeof row.request_data === "string" ? JSON.parse(row.request_data) : (row.request_data as Record<string, unknown>) ?? {},
    initiated_by: String(row.initiated_by),
    priority: row.priority as ProcessPriority,
    hours_pending: row.hours_pending ? Number(row.hours_pending) : null,
    sla_hours_remaining: row.sla_hours_remaining ? Number(row.sla_hours_remaining) : null,
  };
}
