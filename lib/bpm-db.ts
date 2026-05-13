// ─── AWQ BPM — Database Layer ─────────────────────────────────────────────────
//
// Persistence adapter for the BPM Workflow Engine.
//
// STORAGE:
//   SUPABASE_SERVICE_ROLE_KEY set  → Supabase (Postgres) via @supabase/supabase-js
//   SUPABASE_SERVICE_ROLE_KEY unset → In-memory JSON store (local dev / GitHub Pages build)
//
// SERVER-ONLY — do not import in client components.

import { getSupabaseAdmin } from "@/lib/supabase";
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
// Persisted on globalThis so it survives Next.js dev-mode module reloads.

type BpmMemStore = {
  instances: ProcessInstance[];
  tasks: ProcessTask[];
  history: ProcessHistoryEntry[];
  notifications: BpmNotification[];
  seq: number;
};

const _g = globalThis as typeof globalThis & { __bpmStore?: BpmMemStore };
if (!_g.__bpmStore) {
  _g.__bpmStore = { instances: [], tasks: [], history: [], notifications: [], seq: 1 };
}
const _store = _g.__bpmStore;

function nextInstanceCode() {
  const year = new Date().getFullYear();
  return `PI-${year}-${String(_store.seq++).padStart(4, "0")}`;
}

// ─── Schema bootstrap (Supabase only) ────────────────────────────────────────

export async function initBpmDB(): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;

  // Seed process definitions
  await _seedProcessDefinitions();
}

async function _seedProcessDefinitions(): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;

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
    await sb
      .from("process_definitions")
      .upsert(
        {
          process_code: s.code,
          process_name: s.name,
          process_category: s.category,
          description: s.desc,
          workflow_steps: s.steps,
          default_sla_hours: s.sla,
        },
        { onConflict: "process_code", ignoreDuplicates: true }
      );
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("process_definitions")
      .select("*")
      .eq("is_active", true)
      .order("process_category", { ascending: true })
      .order("process_name", { ascending: true });
    return (data ?? []).map(dbRowToProcessDef);
  }
  return PROCESS_DEFS_SEED.filter((d) => d.is_active);
}

export async function getProcessDefinitionByCode(code: string): Promise<ProcessDefinition | null> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("process_definitions")
      .select("*")
      .eq("process_code", code)
      .eq("is_active", true)
      .limit(1)
      .single();
    return data ? dbRowToProcessDef(data) : null;
  }
  return PROCESS_DEFS_SEED.find((d) => d.process_code === code && d.is_active) ?? null;
}

// ─── Process Instances ────────────────────────────────────────────────────────

export async function createProcessInstance(
  data: Omit<ProcessInstance, "instance_id" | "created_at" | "updated_at">
): Promise<ProcessInstance> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data: row } = await sb
      .from("process_instances")
      .insert({
        instance_code: data.instance_code,
        process_def_id: data.process_def_id,
        process_code: data.process_code,
        process_name: data.process_name,
        related_entity_type: data.related_entity_type,
        related_entity_id: data.related_entity_id,
        request_data: data.request_data,
        initiated_by: data.initiated_by,
        current_step_id: data.current_step_id,
        current_step_name: data.current_step_name,
        status: data.status,
        sla_due_date: data.sla_due_date,
        priority: data.priority,
      })
      .select("*")
      .single();
    return dbRowToInstance(row!);
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("process_instances")
      .select("*")
      .eq("instance_id", instanceId)
      .limit(1)
      .single();
    return data ? dbRowToInstance(data) : null;
  }
  return _store.instances.find((i) => i.instance_id === instanceId) ?? null;
}

export async function updateProcessInstance(
  instanceId: string,
  updates: Partial<ProcessInstance>
): Promise<ProcessInstance | null> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.current_step_id !== undefined) patch.current_step_id = updates.current_step_id;
    if (updates.current_step_name !== undefined) patch.current_step_name = updates.current_step_name;
    if (updates.final_decision !== undefined) patch.final_decision = updates.final_decision;
    if (updates.rejection_reason !== undefined) patch.rejection_reason = updates.rejection_reason;
    if (updates.completed_at !== undefined) patch.completed_at = updates.completed_at;
    if (updates.sla_breached !== undefined) patch.sla_breached = updates.sla_breached;
    const { data } = await sb
      .from("process_instances")
      .update(patch)
      .eq("instance_id", instanceId)
      .select("*")
      .single();
    return data ? dbRowToInstance(data) : null;
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
  const sb = getSupabaseAdmin();
  if (sb) {
    let query = sb
      .from("process_instances")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter?.status) query = query.eq("status", filter.status);
    if (filter?.process_code) query = query.eq("process_code", filter.process_code);
    if (filter?.initiated_by) query = query.eq("initiated_by", filter.initiated_by);
    const { data } = await query;
    return (data ?? []).map(dbRowToInstance);
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data: row } = await sb
      .from("process_tasks")
      .insert({
        instance_id: data.instance_id,
        step_id: data.step_id,
        step_name: data.step_name,
        assigned_to: data.assigned_to,
        task_type: data.task_type,
        status: data.status,
        sla_hours: data.sla_hours,
        sla_due_date: data.sla_due_date,
        task_data: data.task_data ?? null,
      })
      .select("*")
      .single();
    return dbRowToTask(row!);
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("process_tasks")
      .select("*")
      .eq("task_id", taskId)
      .limit(1)
      .single();
    return data ? dbRowToTask(data) : null;
  }
  return _store.tasks.find((t) => t.task_id === taskId) ?? null;
}

export async function updateProcessTask(
  taskId: string,
  updates: Partial<ProcessTask>
): Promise<ProcessTask | null> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.decision !== undefined) patch.decision = updates.decision;
    if (updates.decision_notes !== undefined) patch.decision_notes = updates.decision_notes;
    if (updates.decided_by !== undefined) patch.decided_by = updates.decided_by;
    if (updates.decided_at !== undefined) patch.decided_at = updates.decided_at;
    if (updates.sla_breached !== undefined) patch.sla_breached = updates.sla_breached;
    if (updates.escalated !== undefined) patch.escalated = updates.escalated;
    if (updates.escalated_to !== undefined) patch.escalated_to = updates.escalated_to;
    if (updates.escalated_at !== undefined) patch.escalated_at = updates.escalated_at;
    const { data } = await sb
      .from("process_tasks")
      .update(patch)
      .eq("task_id", taskId)
      .select("*")
      .single();
    return data ? dbRowToTask(data) : null;
  }
  const idx = _store.tasks.findIndex((t) => t.task_id === taskId);
  if (idx === -1) return null;
  _store.tasks[idx] = { ..._store.tasks[idx], ...updates, updated_at: new Date().toISOString() };
  return _store.tasks[idx];
}

export async function getPendingTasksForUser(userId: string): Promise<WorkQueueItem[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data: tasks } = await sb
      .from("process_tasks")
      .select("*")
      .eq("assigned_to", userId)
      .eq("status", "pending");

    if (!tasks || tasks.length === 0) return [];

    const instanceIds = [...new Set(tasks.map((t) => t.instance_id as string))];
    const { data: instances } = await sb
      .from("process_instances")
      .select("*")
      .in("instance_id", instanceIds);

    const instMap = new Map((instances ?? []).map((i) => [i.instance_id as string, i]));
    const now = Date.now();

    const items: WorkQueueItem[] = tasks
      .map((t) => {
        const inst = instMap.get(t.instance_id as string);
        if (!inst) return null;
        const hoursP = t.assigned_at ? (now - new Date(t.assigned_at as string).getTime()) / 3_600_000 : null;
        const slaTR = t.sla_due_date ? (new Date(t.sla_due_date as string).getTime() - now) / 3_600_000 : null;
        return {
          task_id: String(t.task_id),
          instance_id: String(t.instance_id),
          step_id: String(t.step_id),
          step_name: String(t.step_name),
          task_type: String(t.task_type),
          task_status: t.status as TaskStatus,
          assigned_to: String(t.assigned_to),
          assigned_at: String(t.assigned_at),
          sla_due_date: t.sla_due_date as string | null,
          sla_breached: Boolean(t.sla_breached),
          instance_code: String(inst.instance_code),
          process_code: String(inst.process_code),
          process_name: String(inst.process_name),
          related_entity_type: inst.related_entity_type as EntityType,
          related_entity_id: String(inst.related_entity_id),
          request_data: (typeof inst.request_data === "string" ? JSON.parse(inst.request_data) : inst.request_data) as Record<string, unknown> ?? {},
          initiated_by: String(inst.initiated_by),
          priority: inst.priority as ProcessPriority,
          hours_pending: hoursP,
          sla_hours_remaining: slaTR,
        } as WorkQueueItem;
      })
      .filter(Boolean) as WorkQueueItem[];

    // Sort: breached first, then by priority, then by sla_due_date asc
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    items.sort((a, b) => {
      const breachDiff = (a.sla_breached ? 0 : 1) - (b.sla_breached ? 0 : 1);
      if (breachDiff !== 0) return breachDiff;
      const prioA = priorityOrder[a.priority] ?? 2;
      const prioB = priorityOrder[b.priority] ?? 2;
      if (prioA !== prioB) return prioA - prioB;
      if (!a.sla_due_date) return 1;
      if (!b.sla_due_date) return -1;
      return a.sla_due_date.localeCompare(b.sla_due_date);
    });

    return items;
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("process_tasks")
      .select("*")
      .eq("instance_id", instanceId)
      .order("created_at", { ascending: true });
    return (data ?? []).map(dbRowToTask);
  }
  return _store.tasks.filter((t) => t.instance_id === instanceId);
}

// ─── Process History ──────────────────────────────────────────────────────────

export async function addHistoryEntry(
  data: Omit<ProcessHistoryEntry, "history_id" | "created_at">
): Promise<ProcessHistoryEntry> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data: row } = await sb
      .from("process_history")
      .insert({
        instance_id: data.instance_id,
        action: data.action,
        action_description: data.action_description,
        step_id: data.step_id,
        step_name: data.step_name,
        performed_by: data.performed_by,
        performed_at: data.performed_at,
        action_data: data.action_data ?? null,
      })
      .select("*")
      .single();
    return dbRowToHistory(row!);
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("process_history")
      .select("*")
      .eq("instance_id", instanceId)
      .order("performed_at", { ascending: true });
    return (data ?? []).map(dbRowToHistory);
  }
  return _store.history
    .filter((h) => h.instance_id === instanceId)
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  data: Omit<BpmNotification, "notification_id" | "created_at">
): Promise<BpmNotification> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data: row } = await sb
      .from("bpm_notifications")
      .insert({
        user_id: data.user_id,
        notification_type: data.notification_type,
        related_entity_type: data.related_entity_type,
        related_entity_id: data.related_entity_id,
        title: data.title,
        message: data.message,
        action_url: data.action_url,
        priority: data.priority,
        send_email: data.send_email,
      })
      .select("*")
      .single();
    return dbRowToNotification(row!);
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("bpm_notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []).map(dbRowToNotification);
  }
  return _store.notifications
    .filter((n) => n.user_id === userId && !n.is_read)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    await sb
      .from("bpm_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("notification_id", notificationId);
    return;
  }
  const n = _store.notifications.find((n) => n.notification_id === notificationId);
  if (n) { n.is_read = true; n.read_at = new Date().toISOString(); }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getProcessPerformance(): Promise<ProcessPerformance[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("v_process_performance")
      .select("*")
      .order("total_instances", { ascending: false });
    return (data ?? []) as ProcessPerformance[];
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb.from("v_sla_dashboard").select("*");
    return (data ?? []) as SlaDashboardRow[];
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("v_process_bottlenecks")
      .select("*")
      .limit(20);
    return (data ?? []) as BottleneckRow[];
  }
  return [];
}

// ─── SLA Check (cron job logic) ───────────────────────────────────────────────

export async function markOverdueTasks(): Promise<number> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const now = new Date().toISOString();
    const { data: updatedTasks } = await sb
      .from("process_tasks")
      .update({ sla_breached: true, updated_at: now })
      .eq("status", "pending")
      .eq("sla_breached", false)
      .lt("sla_due_date", now)
      .select("task_id");
    await sb
      .from("process_instances")
      .update({ sla_breached: true, updated_at: now })
      .eq("status", "in_progress")
      .eq("sla_breached", false)
      .lt("sla_due_date", now);
    return updatedTasks?.length ?? 0;
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
  const sb = getSupabaseAdmin();
  if (sb) {
    const year = new Date().getFullYear();
    const startOfYear = `${year}-01-01T00:00:00.000Z`;
    const { count } = await sb
      .from("process_instances")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYear);
    const seq = (count ?? 0) + 1;
    return `PI-${year}-${String(seq).padStart(4, "0")}`;
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
