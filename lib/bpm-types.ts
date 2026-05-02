// ─── AWQ BPM — TypeScript Types ───────────────────────────────────────────────
//
// Shared interfaces for the BPM workflow engine.
// User IDs are TEXT strings matching lib/auth-users.ts ("1"–"6").

// ─── Process Definitions ─────────────────────────────────────────────────────

export type ProcessCategory =
  | "approval"
  | "procurement"
  | "finance"
  | "legal"
  | "project_management";

export type ApproverRole =
  | "manager"
  | "finance_manager"
  | "cfo"
  | "ceo"
  | "legal"
  | "bu_lead"
  | "pm";

export interface WorkflowStepCondition {
  operator: "<" | "<=" | ">" | ">=" | "==";
  value: number;
}

export interface WorkflowStep {
  step_id: string;
  step_name: string;
  step_type: "approval" | "review" | "sign" | "acknowledge";
  approver_role: ApproverRole;
  sla_hours: number;
  conditions?: {
    amount?: WorkflowStepCondition;
    budget?: WorkflowStepCondition;
    [key: string]: WorkflowStepCondition | undefined;
  };
}

export interface ProcessDefinition {
  process_def_id: string;
  process_code: string;
  process_name: string;
  process_category: ProcessCategory;
  description: string | null;
  process_owner: string | null;
  workflow_steps: WorkflowStep[];
  routing_rules: Record<string, unknown> | null;
  default_sla_hours: number;
  escalation_enabled: boolean;
  escalation_hours: number;
  notification_config: Record<string, unknown> | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ─── Process Instances ────────────────────────────────────────────────────────

export type InstanceStatus = "in_progress" | "approved" | "rejected" | "cancelled";
export type ProcessPriority = "low" | "normal" | "high" | "urgent";
export type EntityType = "AP" | "PO" | "Budget" | "Contract" | "Project" | "Expense";

export interface ProcessInstance {
  instance_id: string;
  instance_code: string;
  process_def_id: string;
  process_code: string;
  process_name: string;
  related_entity_type: EntityType;
  related_entity_id: string;
  request_data: Record<string, unknown>;
  initiated_by: string;
  initiated_at: string;
  current_step_id: string | null;
  current_step_name: string | null;
  status: InstanceStatus;
  started_at: string;
  completed_at: string | null;
  sla_due_date: string | null;
  sla_breached: boolean;
  final_decision: "approved" | "rejected" | "cancelled" | null;
  rejection_reason: string | null;
  priority: ProcessPriority;
  created_at: string;
  updated_at: string;
}

// ─── Process Tasks ────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "completed" | "rejected" | "cancelled" | "escalated";

export interface ProcessTask {
  task_id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  assigned_to: string;
  assigned_at: string;
  task_type: "approval" | "review" | "sign" | "acknowledge";
  status: TaskStatus;
  decision: "approved" | "rejected" | null;
  decision_notes: string | null;
  decided_by: string | null;
  decided_at: string | null;
  sla_hours: number | null;
  sla_due_date: string | null;
  sla_breached: boolean;
  escalated: boolean;
  escalated_to: string | null;
  escalated_at: string | null;
  task_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Process History ──────────────────────────────────────────────────────────

export type HistoryAction =
  | "started"
  | "step_completed"
  | "approved"
  | "rejected"
  | "escalated"
  | "cancelled"
  | "sla_breached";

export interface ProcessHistoryEntry {
  history_id: string;
  instance_id: string;
  action: HistoryAction;
  action_description: string | null;
  step_id: string | null;
  step_name: string | null;
  performed_by: string | null;
  performed_at: string;
  action_data: Record<string, unknown> | null;
  created_at: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "task_assigned"
  | "approval_needed"
  | "approved"
  | "rejected"
  | "escalated"
  | "sla_warning"
  | "sla_breached";

export interface BpmNotification {
  notification_id: string;
  user_id: string;
  notification_type: NotificationType;
  related_entity_type: "process_instance" | "process_task" | null;
  related_entity_id: string | null;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  send_email: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  priority: ProcessPriority;
  created_at: string;
}

// ─── Work Queue View ──────────────────────────────────────────────────────────

export interface WorkQueueItem {
  task_id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  task_type: string;
  task_status: TaskStatus;
  assigned_to: string;
  assigned_at: string;
  sla_due_date: string | null;
  sla_breached: boolean;
  instance_code: string;
  process_code: string;
  process_name: string;
  related_entity_type: EntityType;
  related_entity_id: string;
  request_data: Record<string, unknown>;
  initiated_by: string;
  priority: ProcessPriority;
  hours_pending: number | null;
  sla_hours_remaining: number | null;
}

// ─── Analytics Views ──────────────────────────────────────────────────────────

export interface ProcessPerformance {
  process_def_id: string;
  process_code: string;
  process_name: string;
  process_category: ProcessCategory;
  total_instances: number;
  approved_count: number;
  rejected_count: number;
  in_progress_count: number;
  approval_rate_pct: number;
  avg_cycle_time_hours: number | null;
  sla_breaches: number;
  sla_compliance_pct: number;
}

export interface SlaDashboardRow {
  process_code: string;
  process_name: string;
  active_tasks: number;
  breached_tasks: number;
  at_risk_tasks: number;
  avg_response_hours: number | null;
}

export interface BottleneckRow {
  process_code: string;
  process_name: string;
  step_name: string;
  task_count: number;
  breach_count: number;
  avg_time_hours: number | null;
  median_time_hours: number | null;
}

// ─── API Input Types ──────────────────────────────────────────────────────────

export interface StartWorkflowInput {
  process_code: string;
  related_entity_type: EntityType;
  related_entity_id: string;
  request_data: Record<string, unknown>;
  initiated_by: string;
  priority?: ProcessPriority;
}

export interface CompleteTaskInput {
  task_id: string;
  decision: "approved" | "rejected";
  decision_notes?: string;
  decided_by: string;
}

export interface GetMyTasksInput {
  user_id: string;
  filter?: "all" | "overdue" | "today" | "upcoming";
}

export interface WorkQueueStats {
  total: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
}
