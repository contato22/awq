// ─── BPM localStorage layer — browser-only ───────────────────────────────────
//
// Used when DATABASE_URL is not set (static/dev mode).
// Mirrors bpm-db.ts API — same function signatures.

import type {
  ProcessInstance,
  ProcessTask,
  ProcessHistoryEntry,
  BpmNotification,
  InstanceStatus,
  TaskDecision,
  Priority,
  WorkQueueItem,
} from "./bpm-types";
import type { ProcessCode } from "./bpm-types";

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  instances:     "awq_bpm_instances",
  tasks:         "awq_bpm_tasks",
  history:       "awq_bpm_history",
  notifications: "awq_bpm_notifications",
} as const;

// ─── Raw LS helpers ───────────────────────────────────────────────────────────

function lsRead<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function lsWrite<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ─── Instances ────────────────────────────────────────────────────────────────

export function localCreateInstance(inst: ProcessInstance): ProcessInstance {
  const all = lsRead<ProcessInstance>(KEYS.instances);
  all.push({ ...inst, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  lsWrite(KEYS.instances, all);
  return inst;
}

export function localGetInstance(instanceId: string): ProcessInstance | null {
  return lsRead<ProcessInstance>(KEYS.instances).find((i) => i.instance_id === instanceId) ?? null;
}

export function localListInstances(filter?: {
  status?: InstanceStatus;
  process_code?: ProcessCode;
}): ProcessInstance[] {
  let all = lsRead<ProcessInstance>(KEYS.instances);
  if (filter?.status) all = all.filter((i) => i.status === filter.status);
  if (filter?.process_code) all = all.filter((i) => i.process_code === filter.process_code);
  return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localUpdateInstance(instanceId: string, updates: Partial<ProcessInstance>): void {
  const all = lsRead<ProcessInstance>(KEYS.instances).map((i) =>
    i.instance_id === instanceId ? { ...i, ...updates, updated_at: new Date().toISOString() } : i
  );
  lsWrite(KEYS.instances, all);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function localCreateTask(task: ProcessTask): ProcessTask {
  const all = lsRead<ProcessTask>(KEYS.tasks);
  all.push({ ...task, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  lsWrite(KEYS.tasks, all);
  return task;
}

export function localGetTask(taskId: string): ProcessTask | null {
  const task = lsRead<ProcessTask>(KEYS.tasks).find((t) => t.task_id === taskId) ?? null;
  if (!task) return null;
  // Join instance data
  const instance = localGetInstance(task.instance_id);
  if (instance) task.instance = instance;
  return task;
}

export function localListPendingTasksForUser(userId: string): ProcessTask[] {
  const tasks = lsRead<ProcessTask>(KEYS.tasks).filter(
    (t) => t.assigned_to === userId && t.status === "pending"
  );
  return tasks
    .map((t) => {
      const instance = localGetInstance(t.instance_id);
      if (instance) t.instance = instance;
      return t;
    })
    .sort((a, b) => {
      // Breached first
      if (a.sla_breached !== b.sla_breached) return a.sla_breached ? -1 : 1;
      // Then by SLA due date
      return new Date(a.sla_due_date).getTime() - new Date(b.sla_due_date).getTime();
    });
}

export function localUpdateTask(taskId: string, updates: Partial<ProcessTask>): void {
  const all = lsRead<ProcessTask>(KEYS.tasks).map((t) =>
    t.task_id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
  );
  lsWrite(KEYS.tasks, all);
}

export function localListTasksForInstance(instanceId: string): ProcessTask[] {
  return lsRead<ProcessTask>(KEYS.tasks).filter((t) => t.instance_id === instanceId);
}

// ─── History ──────────────────────────────────────────────────────────────────

export function localAddHistory(entry: ProcessHistoryEntry): void {
  const all = lsRead<ProcessHistoryEntry>(KEYS.history);
  all.push(entry);
  lsWrite(KEYS.history, all);
}

export function localGetHistory(instanceId: string): ProcessHistoryEntry[] {
  return lsRead<ProcessHistoryEntry>(KEYS.history)
    .filter((h) => h.instance_id === instanceId)
    .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function localCreateNotification(n: BpmNotification): void {
  const all = lsRead<BpmNotification>(KEYS.notifications);
  all.unshift(n);
  lsWrite(KEYS.notifications, all.slice(0, 200)); // cap at 200
}

export function localListNotifications(userId: string, unreadOnly = false): BpmNotification[] {
  let all = lsRead<BpmNotification>(KEYS.notifications).filter((n) => n.user_id === userId);
  if (unreadOnly) all = all.filter((n) => !n.is_read);
  return all.slice(0, 50);
}

export function localMarkNotificationRead(notificationId: string): void {
  const all = lsRead<BpmNotification>(KEYS.notifications).map((n) =>
    n.notification_id === notificationId
      ? { ...n, is_read: true, read_at: new Date().toISOString() }
      : n
  );
  lsWrite(KEYS.notifications, all);
}

// ─── SLA check ────────────────────────────────────────────────────────────────

export function localCheckSlaBreaches(): number {
  const now = new Date();
  let count = 0;

  const instances = lsRead<ProcessInstance>(KEYS.instances).map((i) => {
    if (["pending", "in_progress"].includes(i.status) && !i.sla_breached && new Date(i.sla_due_date) < now) {
      count++;
      return { ...i, sla_breached: true };
    }
    return i;
  });
  lsWrite(KEYS.instances, instances);

  const tasks = lsRead<ProcessTask>(KEYS.tasks).map((t) => {
    if (t.status === "pending" && !t.sla_breached && new Date(t.sla_due_date) < now) {
      count++;
      return { ...t, sla_breached: true };
    }
    return t;
  });
  lsWrite(KEYS.tasks, tasks);

  return count;
}

// ─── Analytics (client-side computed) ────────────────────────────────────────

export function localGetPerformance() {
  const instances = lsRead<ProcessInstance>(KEYS.instances);
  const ninety = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const recent = instances.filter((i) => new Date(i.created_at) > ninety);
  const grouped: Record<string, ProcessInstance[]> = {};
  recent.forEach((i) => {
    if (!grouped[i.process_code]) grouped[i.process_code] = [];
    grouped[i.process_code].push(i);
  });

  return Object.entries(grouped).map(([code, items]) => {
    const approved  = items.filter((i) => i.status === "approved").length;
    const rejected  = items.filter((i) => i.status === "rejected").length;
    const inProgress = items.filter((i) => ["pending", "in_progress"].includes(i.status)).length;
    const breached  = items.filter((i) => i.sla_breached).length;
    return {
      process_code: code as ProcessCode,
      process_name: items[0].process_name,
      total_instances: items.length,
      approved_count: approved,
      rejected_count: rejected,
      in_progress_count: inProgress,
      sla_breaches: breached,
      approval_rate: approved + rejected > 0 ? (approved / (approved + rejected)) * 100 : 0,
      avg_cycle_time_days: null as number | null,
      sla_compliance_rate: items.length > 0 ? ((items.length - breached) / items.length) * 100 : 100,
    };
  });
}

export function localGetBottlenecks() {
  const tasks = lsRead<ProcessTask>(KEYS.tasks);
  const instances = lsRead<ProcessInstance>(KEYS.instances);
  const ninety = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const instanceMap = new Map(instances.map((i) => [i.instance_id, i]));
  const recentTasks = tasks.filter((t) => {
    const inst = instanceMap.get(t.instance_id);
    return inst && new Date(inst.created_at) > ninety;
  });

  const grouped: Record<string, ProcessTask[]> = {};
  recentTasks.forEach((t) => {
    const inst = instanceMap.get(t.instance_id);
    const key = `${inst?.process_code ?? "?"}::${t.step_name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  return Object.entries(grouped).map(([key, items]) => {
    const [code, stepName] = key.split("::");
    return {
      process_code: code,
      step_name: stepName,
      task_count: items.length,
      breach_count: items.filter((t) => t.sla_breached).length,
      avg_time_hours: null as number | null,
      median_time_hours: null as number | null,
    };
  });
}

// ─── Work Queue helper (full join) ────────────────────────────────────────────

export function localBuildWorkQueue(userId: string): WorkQueueItem[] {
  const tasks = localListPendingTasksForUser(userId);
  const now = Date.now();

  return tasks.map((t) => {
    const inst = t.instance!;
    const assignedAt = new Date(t.assigned_at).getTime();
    const slaDue = new Date(t.sla_due_date).getTime();

    return {
      ...t,
      instance_code:      inst.instance_code,
      process_name:       inst.process_name,
      process_code:       inst.process_code,
      related_entity_type: inst.related_entity_type,
      related_entity_id:   inst.related_entity_id,
      request_data:        inst.request_data,
      initiated_by:        inst.initiated_by,
      initiated_by_name:   inst.initiated_by === "miguel" ? "Miguel (CEO)" : inst.initiated_by === "danilo" ? "Danilo" : inst.initiated_by,
      priority:            inst.priority,
      days_pending:        Math.floor((now - assignedAt) / (1000 * 60 * 60 * 24)),
      sla_hours_remaining: (slaDue - now) / (1000 * 60 * 60),
    };
  });
}
