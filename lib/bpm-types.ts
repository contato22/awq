// ─── BPM Types — Business Process Management ─────────────────────────────────

export type BU = "awq" | "jacqes" | "caza" | "venture" | "advisor";
export type Priority = "low" | "normal" | "high" | "urgent";

export type ProcessCode =
  | "PO_APPROVAL"
  | "EXPENSE_APPROVAL"
  | "AP_APPROVAL"
  | "BUDGET_APPROVAL"
  | "CONTRACT_APPROVAL"
  | "PROJECT_KICKOFF";

export type ProcessCategory =
  | "procurement"
  | "finance"
  | "legal"
  | "project_management";

export type InstanceStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "cancelled";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected"
  | "cancelled"
  | "escalated";

export type TaskDecision = "approved" | "rejected";

export type NotificationType =
  | "task_assigned"
  | "approved"
  | "rejected"
  | "escalated"
  | "sla_warning"
  | "cancelled";

// ─── Condition Operator ───────────────────────────────────────────────────────

export interface StepCondition {
  operator: "<" | "<=" | ">" | ">=" | "==";
  value: number;
}

// ─── Workflow Step (inside process definition) ────────────────────────────────

export interface WorkflowStep {
  step_id: string;
  step_name: string;
  step_type: "approval" | "review" | "sign";
  approver_role: string;
  approval_type?: "single" | "all" | "any";
  conditions?: {
    amount?: StepCondition;
    budget?: StepCondition;
  };
  sla_hours: number;
  escalation_hours?: number;
}

// ─── Process Definition ───────────────────────────────────────────────────────

export interface ProcessDefinition {
  process_def_id: string;
  process_code: ProcessCode;
  process_name: string;
  process_category: ProcessCategory;
  description: string;
  workflow_steps: WorkflowStep[];
  default_sla_hours: number;
  escalation_enabled: boolean;
  is_active: boolean;
}

// ─── Process Instance ─────────────────────────────────────────────────────────

export interface ProcessInstance {
  instance_id: string;
  instance_code: string;
  process_def_id: string;
  process_code: ProcessCode;
  process_name: string;
  related_entity_type: string; // "AP" | "PO" | "Budget" | "Contract" | "Project"
  related_entity_id: string;
  request_data: Record<string, unknown>;
  initiated_by: string;
  initiated_by_name?: string;
  current_step_id: string | null;
  current_step_name: string | null;
  status: InstanceStatus;
  priority: Priority;
  started_at: string;
  completed_at?: string;
  sla_due_date: string;
  sla_breached: boolean;
  final_decision?: TaskDecision;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// ─── Process Task ─────────────────────────────────────────────────────────────

export interface ProcessTask {
  task_id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  task_type: "approval" | "review" | "sign";
  assigned_to: string;
  assigned_to_name?: string;
  assigned_at: string;
  status: TaskStatus;
  decision?: TaskDecision;
  decision_notes?: string;
  decided_by?: string;
  decided_at?: string;
  sla_hours: number;
  sla_due_date: string;
  sla_breached: boolean;
  escalated: boolean;
  escalated_to?: string;
  escalated_at?: string;
  task_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // joined
  instance?: ProcessInstance;
}

// ─── Process History ──────────────────────────────────────────────────────────

export interface ProcessHistoryEntry {
  history_id: string;
  instance_id: string;
  action: string;
  action_description: string;
  step_id?: string;
  step_name?: string;
  performed_by: string;
  performed_by_name?: string;
  performed_at: string;
  action_data?: Record<string, unknown>;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface BpmNotification {
  notification_id: string;
  user_id: string;
  notification_type: NotificationType;
  related_entity_type: "process_instance" | "process_task";
  related_entity_id: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  priority: Priority;
  created_at: string;
}

// ─── Work Queue Item (joined view) ────────────────────────────────────────────

export interface WorkQueueItem extends ProcessTask {
  instance_code: string;
  process_name: string;
  process_code: ProcessCode;
  related_entity_type: string;
  related_entity_id: string;
  request_data: Record<string, unknown>;
  initiated_by: string;
  initiated_by_name: string;
  priority: Priority;
  days_pending: number;
  sla_hours_remaining: number | null;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ProcessPerformance {
  process_code: ProcessCode;
  process_name: string;
  total_instances: number;
  approved_count: number;
  rejected_count: number;
  in_progress_count: number;
  approval_rate: number;
  avg_cycle_time_days: number | null;
  sla_breaches: number;
  sla_compliance_rate: number;
}

export interface BottleneckStep {
  process_code: string;
  step_name: string;
  task_count: number;
  avg_time_hours: number | null;
  breach_count: number;
  median_time_hours: number | null;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface StartWorkflowPayload {
  process_code: ProcessCode;
  related_entity_type: string;
  related_entity_id: string;
  request_data: Record<string, unknown>;
  initiated_by: string;
  priority?: Priority;
}

export interface CompleteTaskPayload {
  task_id: string;
  decision: TaskDecision;
  decision_notes?: string;
  decided_by: string;
}

export interface GetMyTasksPayload {
  user_id: string;
  filter?: "all" | "overdue" | "today" | "upcoming";
}

export interface MyTasksResponse {
  data: WorkQueueItem[];
  stats: {
    total: number;
    overdue: number;
    due_today: number;
    due_this_week: number;
  };
}
