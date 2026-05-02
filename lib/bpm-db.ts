// ─── BPM Database Layer — Neon Serverless Postgres ───────────────────────────
//
// SERVER-ONLY. Do not import in client components.
// Mirrors the localStorage layer in bpm-local.ts for static/dev mode.

import { sql, USE_DB } from "./db";
import {
  ProcessDefinition,
  ProcessInstance,
  ProcessTask,
  ProcessHistoryEntry,
  BpmNotification,
  ProcessPerformance,
  BottleneckStep,
  WorkflowStep,
  ProcessCode,
  Priority,
  TaskDecision,
  InstanceStatus,
} from "./bpm-types";
import { PROCESS_DEFINITIONS } from "./bpm-process-definitions";

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────

export async function initBpmDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS bpm_process_instances (
      instance_id        TEXT PRIMARY KEY,
      instance_code      TEXT UNIQUE NOT NULL,
      process_def_id     TEXT NOT NULL,
      process_code       TEXT NOT NULL,
      process_name       TEXT NOT NULL,
      related_entity_type TEXT NOT NULL,
      related_entity_id   TEXT NOT NULL,
      request_data       JSONB NOT NULL DEFAULT '{}',
      initiated_by       TEXT NOT NULL,
      current_step_id    TEXT,
      current_step_name  TEXT,
      status             TEXT NOT NULL DEFAULT 'in_progress',
      priority           TEXT NOT NULL DEFAULT 'normal',
      started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at       TIMESTAMPTZ,
      sla_due_date       TIMESTAMPTZ NOT NULL,
      sla_breached       BOOLEAN NOT NULL DEFAULT FALSE,
      final_decision     TEXT,
      rejection_reason   TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bpm_process_tasks (
      task_id           TEXT PRIMARY KEY,
      instance_id       TEXT NOT NULL REFERENCES bpm_process_instances(instance_id) ON DELETE CASCADE,
      step_id           TEXT NOT NULL,
      step_name         TEXT NOT NULL,
      task_type         TEXT NOT NULL DEFAULT 'approval',
      assigned_to       TEXT NOT NULL,
      assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status            TEXT NOT NULL DEFAULT 'pending',
      decision          TEXT,
      decision_notes    TEXT,
      decided_by        TEXT,
      decided_at        TIMESTAMPTZ,
      sla_hours         INTEGER NOT NULL,
      sla_due_date      TIMESTAMPTZ NOT NULL,
      sla_breached      BOOLEAN NOT NULL DEFAULT FALSE,
      escalated         BOOLEAN NOT NULL DEFAULT FALSE,
      escalated_to      TEXT,
      escalated_at      TIMESTAMPTZ,
      task_data         JSONB NOT NULL DEFAULT '{}',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bpm_process_history (
      history_id        TEXT PRIMARY KEY,
      instance_id       TEXT NOT NULL REFERENCES bpm_process_instances(instance_id) ON DELETE CASCADE,
      action            TEXT NOT NULL,
      action_description TEXT NOT NULL,
      step_id           TEXT,
      step_name         TEXT,
      performed_by      TEXT NOT NULL,
      performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action_data       JSONB
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bpm_notifications (
      notification_id   TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      related_entity_type TEXT NOT NULL,
      related_entity_id   TEXT NOT NULL,
      title             TEXT NOT NULL,
      message           TEXT NOT NULL,
      action_url        TEXT,
      is_read           BOOLEAN NOT NULL DEFAULT FALSE,
      read_at           TIMESTAMPTZ,
      priority          TEXT NOT NULL DEFAULT 'normal',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bpm_instances_status ON bpm_process_instances(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bpm_instances_entity ON bpm_process_instances(related_entity_type, related_entity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bpm_tasks_assigned ON bpm_process_tasks(assigned_to)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bpm_tasks_status ON bpm_process_tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bpm_history_instance ON bpm_process_history(instance_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bpm_notif_user ON bpm_notifications(user_id, is_read)`;
}

// ─── Instance CRUD ────────────────────────────────────────────────────────────

export async function dbCreateInstance(
  inst: Omit<ProcessInstance, "created_at" | "updated_at">
): Promise<ProcessInstance> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO bpm_process_instances (
      instance_id, instance_code, process_def_id, process_code, process_name,
      related_entity_type, related_entity_id, request_data, initiated_by,
      current_step_id, current_step_name, status, priority,
      started_at, sla_due_date, sla_breached
    ) VALUES (
      ${inst.instance_id}, ${inst.instance_code}, ${inst.process_def_id},
      ${inst.process_code}, ${inst.process_name}, ${inst.related_entity_type},
      ${inst.related_entity_id}, ${JSON.stringify(inst.request_data)},
      ${inst.initiated_by}, ${inst.current_step_id}, ${inst.current_step_name},
      ${inst.status}, ${inst.priority}, ${inst.started_at}, ${inst.sla_due_date},
      ${inst.sla_breached}
    )
    RETURNING *
  `;
  return rowToInstance(rows[0]);
}

export async function dbGetInstance(instanceId: string): Promise<ProcessInstance | null> {
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM bpm_process_instances WHERE instance_id = ${instanceId}
  `;
  return rows[0] ? rowToInstance(rows[0]) : null;
}

export async function dbListInstances(filter?: {
  status?: InstanceStatus;
  process_code?: ProcessCode;
  limit?: number;
}): Promise<ProcessInstance[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM bpm_process_instances
    ORDER BY created_at DESC
    LIMIT ${filter?.limit ?? 200}
  `;
  return rows.map(rowToInstance);
}

export async function dbUpdateInstance(
  instanceId: string,
  updates: Partial<ProcessInstance>
): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE bpm_process_instances SET
      current_step_id   = COALESCE(${updates.current_step_id ?? null}, current_step_id),
      current_step_name = COALESCE(${updates.current_step_name ?? null}, current_step_name),
      status            = COALESCE(${updates.status ?? null}, status),
      final_decision    = COALESCE(${updates.final_decision ?? null}, final_decision),
      rejection_reason  = COALESCE(${updates.rejection_reason ?? null}, rejection_reason),
      completed_at      = COALESCE(${updates.completed_at ?? null}, completed_at),
      sla_breached      = COALESCE(${updates.sla_breached ?? null}, sla_breached),
      updated_at        = NOW()
    WHERE instance_id = ${instanceId}
  `;
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export async function dbCreateTask(
  task: Omit<ProcessTask, "created_at" | "updated_at">
): Promise<ProcessTask> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO bpm_process_tasks (
      task_id, instance_id, step_id, step_name, task_type, assigned_to,
      assigned_at, status, sla_hours, sla_due_date, sla_breached,
      escalated, task_data
    ) VALUES (
      ${task.task_id}, ${task.instance_id}, ${task.step_id}, ${task.step_name},
      ${task.task_type}, ${task.assigned_to}, ${task.assigned_at}, ${task.status},
      ${task.sla_hours}, ${task.sla_due_date}, ${task.sla_breached},
      ${task.escalated}, ${JSON.stringify(task.task_data)}
    )
    RETURNING *
  `;
  return rowToTask(rows[0]);
}

export async function dbGetTask(taskId: string): Promise<ProcessTask | null> {
  if (!sql) return null;
  const rows = await sql`
    SELECT t.*, i.process_name, i.process_code, i.instance_code,
           i.related_entity_type, i.related_entity_id, i.request_data,
           i.initiated_by, i.priority, i.process_def_id
    FROM bpm_process_tasks t
    JOIN bpm_process_instances i ON t.instance_id = i.instance_id
    WHERE t.task_id = ${taskId}
  `;
  if (!rows[0]) return null;
  const task = rowToTask(rows[0]);
  task.instance = rowToInstance(rows[0]);
  return task;
}

export async function dbListPendingTasksForUser(userId: string): Promise<ProcessTask[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT t.*, i.process_name, i.process_code, i.instance_code,
           i.related_entity_type, i.related_entity_id, i.request_data,
           i.initiated_by, i.priority
    FROM bpm_process_tasks t
    JOIN bpm_process_instances i ON t.instance_id = i.instance_id
    WHERE t.assigned_to = ${userId} AND t.status = 'pending'
    ORDER BY
      CASE WHEN t.sla_breached THEN 0 ELSE 1 END,
      t.sla_due_date ASC NULLS LAST,
      t.assigned_at ASC
  `;
  return rows.map((r) => {
    const task = rowToTask(r);
    task.instance = rowToInstance(r);
    return task;
  });
}

export async function dbUpdateTask(
  taskId: string,
  updates: Partial<ProcessTask>
): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE bpm_process_tasks SET
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
  `;
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function dbAddHistory(entry: ProcessHistoryEntry): Promise<void> {
  if (!sql) return;
  await sql`
    INSERT INTO bpm_process_history (
      history_id, instance_id, action, action_description,
      step_id, step_name, performed_by, performed_at, action_data
    ) VALUES (
      ${entry.history_id}, ${entry.instance_id}, ${entry.action},
      ${entry.action_description}, ${entry.step_id ?? null}, ${entry.step_name ?? null},
      ${entry.performed_by}, ${entry.performed_at},
      ${entry.action_data ? JSON.stringify(entry.action_data) : null}
    )
  `;
}

export async function dbGetHistory(instanceId: string): Promise<ProcessHistoryEntry[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM bpm_process_history
    WHERE instance_id = ${instanceId}
    ORDER BY performed_at ASC
  `;
  return rows.map(rowToHistory);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function dbCreateNotification(n: BpmNotification): Promise<void> {
  if (!sql) return;
  await sql`
    INSERT INTO bpm_notifications (
      notification_id, user_id, notification_type, related_entity_type,
      related_entity_id, title, message, action_url, is_read, priority, created_at
    ) VALUES (
      ${n.notification_id}, ${n.user_id}, ${n.notification_type},
      ${n.related_entity_type}, ${n.related_entity_id}, ${n.title},
      ${n.message}, ${n.action_url ?? null}, ${n.is_read}, ${n.priority}, ${n.created_at}
    )
  `;
}

export async function dbListNotifications(userId: string, unreadOnly = false): Promise<BpmNotification[]> {
  if (!sql) return [];
  const rows = unreadOnly
    ? await sql`SELECT * FROM bpm_notifications WHERE user_id = ${userId} AND is_read = FALSE ORDER BY created_at DESC LIMIT 50`
    : await sql`SELECT * FROM bpm_notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
  return rows.map(rowToNotification);
}

export async function dbMarkNotificationRead(notificationId: string): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE bpm_notifications SET is_read = TRUE, read_at = NOW()
    WHERE notification_id = ${notificationId}
  `;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function dbGetPerformance(): Promise<ProcessPerformance[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT
      process_code,
      process_name,
      COUNT(*) AS total_instances,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
      COUNT(*) FILTER (WHERE status IN ('pending','in_progress')) AS in_progress_count,
      COUNT(*) FILTER (WHERE sla_breached) AS sla_breaches
    FROM bpm_process_instances
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY process_code, process_name
  `;
  return rows.map((r) => ({
    process_code: r.process_code as ProcessCode,
    process_name: r.process_name,
    total_instances: Number(r.total_instances),
    approved_count: Number(r.approved_count),
    rejected_count: Number(r.rejected_count),
    in_progress_count: Number(r.in_progress_count),
    sla_breaches: Number(r.sla_breaches),
    approval_rate:
      Number(r.approved_count) + Number(r.rejected_count) > 0
        ? (Number(r.approved_count) / (Number(r.approved_count) + Number(r.rejected_count))) * 100
        : 0,
    avg_cycle_time_days: null,
    sla_compliance_rate:
      Number(r.total_instances) > 0
        ? ((Number(r.total_instances) - Number(r.sla_breaches)) / Number(r.total_instances)) * 100
        : 100,
  }));
}

export async function dbGetBottlenecks(): Promise<BottleneckStep[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT
      i.process_code,
      t.step_name,
      COUNT(t.task_id) AS task_count,
      COUNT(t.task_id) FILTER (WHERE t.sla_breached) AS breach_count
    FROM bpm_process_tasks t
    JOIN bpm_process_instances i ON t.instance_id = i.instance_id
    WHERE i.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY i.process_code, t.step_name
    ORDER BY task_count DESC
  `;
  return rows.map((r) => ({
    process_code: r.process_code,
    step_name: r.step_name,
    task_count: Number(r.task_count),
    breach_count: Number(r.breach_count),
    avg_time_hours: null,
    median_time_hours: null,
  }));
}

// ─── SLA Check ────────────────────────────────────────────────────────────────

export async function dbCheckAndUpdateSlaBreaches(): Promise<number> {
  if (!sql) return 0;
  const res1 = await sql`
    UPDATE bpm_process_instances
    SET sla_breached = TRUE, updated_at = NOW()
    WHERE status IN ('pending','in_progress')
      AND sla_due_date < NOW()
      AND sla_breached = FALSE
  `;
  const res2 = await sql`
    UPDATE bpm_process_tasks
    SET sla_breached = TRUE, updated_at = NOW()
    WHERE status = 'pending'
      AND sla_due_date < NOW()
      AND sla_breached = FALSE
  `;
  return (res1.length ?? 0) + (res2.length ?? 0);
}

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function rowToInstance(r: Record<string, unknown>): ProcessInstance {
  return {
    instance_id: r.instance_id as string,
    instance_code: r.instance_code as string,
    process_def_id: r.process_def_id as string,
    process_code: r.process_code as ProcessCode,
    process_name: r.process_name as string,
    related_entity_type: r.related_entity_type as string,
    related_entity_id: r.related_entity_id as string,
    request_data: (typeof r.request_data === "string"
      ? JSON.parse(r.request_data)
      : r.request_data) as Record<string, unknown>,
    initiated_by: r.initiated_by as string,
    current_step_id: (r.current_step_id ?? null) as string | null,
    current_step_name: (r.current_step_name ?? null) as string | null,
    status: r.status as ProcessInstance["status"],
    priority: (r.priority ?? "normal") as Priority,
    started_at: r.started_at as string,
    completed_at: (r.completed_at ?? undefined) as string | undefined,
    sla_due_date: r.sla_due_date as string,
    sla_breached: Boolean(r.sla_breached),
    final_decision: (r.final_decision ?? undefined) as TaskDecision | undefined,
    rejection_reason: (r.rejection_reason ?? undefined) as string | undefined,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function rowToTask(r: Record<string, unknown>): ProcessTask {
  return {
    task_id: r.task_id as string,
    instance_id: r.instance_id as string,
    step_id: r.step_id as string,
    step_name: r.step_name as string,
    task_type: (r.task_type ?? "approval") as ProcessTask["task_type"],
    assigned_to: r.assigned_to as string,
    assigned_at: r.assigned_at as string,
    status: r.status as ProcessTask["status"],
    decision: (r.decision ?? undefined) as TaskDecision | undefined,
    decision_notes: (r.decision_notes ?? undefined) as string | undefined,
    decided_by: (r.decided_by ?? undefined) as string | undefined,
    decided_at: (r.decided_at ?? undefined) as string | undefined,
    sla_hours: Number(r.sla_hours),
    sla_due_date: r.sla_due_date as string,
    sla_breached: Boolean(r.sla_breached),
    escalated: Boolean(r.escalated),
    escalated_to: (r.escalated_to ?? undefined) as string | undefined,
    escalated_at: (r.escalated_at ?? undefined) as string | undefined,
    task_data: (typeof r.task_data === "string"
      ? JSON.parse(r.task_data)
      : (r.task_data ?? {})) as Record<string, unknown>,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function rowToHistory(r: Record<string, unknown>): ProcessHistoryEntry {
  return {
    history_id: r.history_id as string,
    instance_id: r.instance_id as string,
    action: r.action as string,
    action_description: r.action_description as string,
    step_id: (r.step_id ?? undefined) as string | undefined,
    step_name: (r.step_name ?? undefined) as string | undefined,
    performed_by: r.performed_by as string,
    performed_at: r.performed_at as string,
    action_data: r.action_data
      ? typeof r.action_data === "string"
        ? JSON.parse(r.action_data)
        : (r.action_data as Record<string, unknown>)
      : undefined,
  };
}

function rowToNotification(r: Record<string, unknown>): BpmNotification {
  return {
    notification_id: r.notification_id as string,
    user_id: r.user_id as string,
    notification_type: r.notification_type as BpmNotification["notification_type"],
    related_entity_type: r.related_entity_type as BpmNotification["related_entity_type"],
    related_entity_id: r.related_entity_id as string,
    title: r.title as string,
    message: r.message as string,
    action_url: (r.action_url ?? undefined) as string | undefined,
    is_read: Boolean(r.is_read),
    read_at: (r.read_at ?? undefined) as string | undefined,
    priority: (r.priority ?? "normal") as Priority,
    created_at: r.created_at as string,
  };
}

// Re-export process definitions for server use
export { PROCESS_DEFINITIONS };
export type { ProcessDefinition, WorkflowStep };
