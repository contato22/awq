// ─── Supabase BPM Adapter ─────────────────────────────────────────────────────
//
// Implements the same interface as the Neon path in bpm-db.ts, but using
// the Supabase JS client. Active when USE_SUPABASE is true.
//
// Schema must be deployed to Supabase beforehand via awq_bpm_full_schema.sql.
// SERVER-ONLY — do not import in client components.

import { supabaseAdmin } from "@/lib/supabase";
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
  InstanceStatus,
  ProcessPriority,
  EntityType,
  TaskStatus,
} from "@/lib/bpm-types";

function sb() {
  if (!supabaseAdmin) throw new Error("Supabase admin client not initialised — check env vars");
  return supabaseAdmin;
}

// ─── Process Definitions ──────────────────────────────────────────────────────

export async function sbGetAllProcessDefinitions(): Promise<ProcessDefinition[]> {
  const { data, error } = await sb()
    .from("process_definitions")
    .select("*")
    .eq("is_active", true)
    .order("process_category")
    .order("process_name");
  if (error) throw error;
  return (data ?? []) as ProcessDefinition[];
}

export async function sbGetProcessDefinitionByCode(code: string): Promise<ProcessDefinition | null> {
  const { data, error } = await sb()
    .from("process_definitions")
    .select("*")
    .eq("process_code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as ProcessDefinition | null;
}

// ─── Process Instances ────────────────────────────────────────────────────────

export async function sbCreateProcessInstance(
  data: Omit<ProcessInstance, "instance_id" | "created_at" | "updated_at">
): Promise<ProcessInstance> {
  const { data: row, error } = await sb()
    .from("process_instances")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as ProcessInstance;
}

export async function sbGetProcessInstance(instanceId: string): Promise<ProcessInstance | null> {
  const { data, error } = await sb()
    .from("process_instances")
    .select("*")
    .eq("instance_id", instanceId)
    .maybeSingle();
  if (error) throw error;
  return data as ProcessInstance | null;
}

export async function sbUpdateProcessInstance(
  instanceId: string,
  updates: Partial<ProcessInstance>
): Promise<ProcessInstance | null> {
  const { data, error } = await sb()
    .from("process_instances")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("instance_id", instanceId)
    .select()
    .single();
  if (error) throw error;
  return data as ProcessInstance | null;
}

export async function sbGetAllInstances(filter?: {
  status?: InstanceStatus;
  process_code?: string;
  initiated_by?: string;
}): Promise<ProcessInstance[]> {
  let q = sb().from("process_instances").select("*");
  if (filter?.status) q = q.eq("status", filter.status);
  if (filter?.process_code) q = q.eq("process_code", filter.process_code);
  if (filter?.initiated_by) q = q.eq("initiated_by", filter.initiated_by);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProcessInstance[];
}

// ─── Process Tasks ────────────────────────────────────────────────────────────

export async function sbCreateProcessTask(
  data: Omit<ProcessTask, "task_id" | "created_at" | "updated_at">
): Promise<ProcessTask> {
  const { data: row, error } = await sb()
    .from("process_tasks")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as ProcessTask;
}

export async function sbGetProcessTask(taskId: string): Promise<ProcessTask | null> {
  const { data, error } = await sb()
    .from("process_tasks")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();
  if (error) throw error;
  return data as ProcessTask | null;
}

export async function sbUpdateProcessTask(
  taskId: string,
  updates: Partial<ProcessTask>
): Promise<ProcessTask | null> {
  const { data, error } = await sb()
    .from("process_tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data as ProcessTask | null;
}

export async function sbGetPendingTasksForUser(userId: string): Promise<WorkQueueItem[]> {
  const { data, error } = await sb()
    .from("process_tasks")
    .select(`
      task_id, instance_id, step_id, step_name, task_type,
      status, assigned_to, assigned_at, sla_due_date, sla_breached,
      process_instances!inner(
        instance_code, process_code, process_name,
        related_entity_type, related_entity_id,
        request_data, initiated_by, priority
      )
    `)
    .eq("assigned_to", userId)
    .eq("status", "pending");
  if (error) throw error;

  const now = Date.now();
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const inst = row.process_instances as Record<string, unknown>;
    const assignedAt = row.assigned_at as string;
    const slaDue = row.sla_due_date as string | null;
    return {
      task_id: String(row.task_id),
      instance_id: String(row.instance_id),
      step_id: String(row.step_id),
      step_name: String(row.step_name),
      task_type: String(row.task_type),
      task_status: row.status as TaskStatus,
      assigned_to: String(row.assigned_to),
      assigned_at: assignedAt,
      sla_due_date: slaDue,
      sla_breached: Boolean(row.sla_breached),
      instance_code: String(inst.instance_code),
      process_code: String(inst.process_code),
      process_name: String(inst.process_name),
      related_entity_type: inst.related_entity_type as EntityType,
      related_entity_id: String(inst.related_entity_id),
      request_data: inst.request_data as Record<string, unknown>,
      initiated_by: String(inst.initiated_by),
      priority: inst.priority as ProcessPriority,
      hours_pending: assignedAt ? (now - new Date(assignedAt).getTime()) / 3_600_000 : null,
      sla_hours_remaining: slaDue ? (new Date(slaDue).getTime() - now) / 3_600_000 : null,
    } as WorkQueueItem;
  });
}

export async function sbGetTasksForInstance(instanceId: string): Promise<ProcessTask[]> {
  const { data, error } = await sb()
    .from("process_tasks")
    .select("*")
    .eq("instance_id", instanceId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ProcessTask[];
}

// ─── Process History ──────────────────────────────────────────────────────────

export async function sbAddHistoryEntry(
  data: Omit<ProcessHistoryEntry, "history_id" | "created_at">
): Promise<ProcessHistoryEntry> {
  const { data: row, error } = await sb()
    .from("process_history")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as ProcessHistoryEntry;
}

export async function sbGetInstanceHistory(instanceId: string): Promise<ProcessHistoryEntry[]> {
  const { data, error } = await sb()
    .from("process_history")
    .select("*")
    .eq("instance_id", instanceId)
    .order("performed_at");
  if (error) throw error;
  return (data ?? []) as ProcessHistoryEntry[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function sbCreateNotification(
  data: Omit<BpmNotification, "notification_id" | "created_at">
): Promise<BpmNotification> {
  const { data: row, error } = await sb()
    .from("bpm_notifications")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as BpmNotification;
}

export async function sbGetUnreadNotifications(userId: string): Promise<BpmNotification[]> {
  const { data, error } = await sb()
    .from("bpm_notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as BpmNotification[];
}

export async function sbMarkNotificationRead(notificationId: string): Promise<void> {
  const { error } = await sb()
    .from("bpm_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("notification_id", notificationId);
  if (error) throw error;
}

// ─── Analytics (views must exist in Supabase) ─────────────────────────────────

export async function sbGetProcessPerformance(): Promise<ProcessPerformance[]> {
  const { data, error } = await sb()
    .from("v_process_performance")
    .select("*")
    .order("total_instances", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProcessPerformance[];
}

export async function sbGetSlaDashboard(): Promise<SlaDashboardRow[]> {
  const { data, error } = await sb().from("v_sla_dashboard").select("*");
  if (error) throw error;
  return (data ?? []) as SlaDashboardRow[];
}

export async function sbGetBottlenecks(): Promise<BottleneckRow[]> {
  const { data, error } = await sb()
    .from("v_process_bottlenecks")
    .select("*")
    .limit(20);
  if (error) throw error;
  return (data ?? []) as BottleneckRow[];
}

// ─── SLA maintenance ──────────────────────────────────────────────────────────

export async function sbMarkOverdueTasks(): Promise<number> {
  const now = new Date().toISOString();
  const { data: tasks, error: e1 } = await sb()
    .from("process_tasks")
    .update({ sla_breached: true, updated_at: now })
    .eq("status", "pending")
    .eq("sla_breached", false)
    .lt("sla_due_date", now)
    .select("task_id");
  if (e1) throw e1;
  const { error: e2 } = await sb()
    .from("process_instances")
    .update({ sla_breached: true, updated_at: now })
    .eq("status", "in_progress")
    .eq("sla_breached", false)
    .lt("sla_due_date", now);
  if (e2) throw e2;
  return tasks?.length ?? 0;
}

// ─── Instance code generator ──────────────────────────────────────────────────

export async function sbGenerateInstanceCode(): Promise<string> {
  const year = new Date().getFullYear();
  const { count, error } = await sb()
    .from("process_instances")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00.000Z`)
    .lt("created_at", `${year + 1}-01-01T00:00:00.000Z`);
  if (error) throw error;
  const seq = (count ?? 0) + 1;
  return `PI-${year}-${String(seq).padStart(4, "0")}`;
}
