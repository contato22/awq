// ─── AWQ PPM — Type Definitions ───────────────────────────────────────────────

export type BuCode = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";

export type ProjectType     = "one_off" | "retainer" | "internal" | "investment";
export type ContractType    = "fixed_price" | "time_and_materials" | "retainer";
export type ProjectPhase    = "initiation" | "planning" | "execution" | "monitoring" | "closure";
export type ProjectStatus   = "active" | "on_hold" | "completed" | "cancelled";
export type HealthStatus    = "green" | "yellow" | "red";
export type Priority        = "low" | "medium" | "high" | "critical";
export type ServiceCategory = "social_media" | "video_production" | "consulting" | "m4e_deal" | "other";
export type BillingFreq     = "monthly" | "milestone" | "upon_completion";

export type TaskStatus   = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled";
export type TaskType     = "milestone" | "task" | "phase";
export type MilestoneStatus = "upcoming" | "achieved" | "missed" | "cancelled";

export type TimeEntryStatus = "draft" | "submitted" | "approved" | "rejected";
export type AllocationStatus = "active" | "completed" | "cancelled";
export type RiskImpact = "low" | "medium" | "high";
export type RiskProbability = "low" | "medium" | "high";
export type RiskStatus = "identified" | "mitigating" | "occurred" | "closed";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

// ─── Project ──────────────────────────────────────────────────────────────────

export interface PpmProject {
  project_id:           string;
  project_code:         string;
  project_name:         string;

  customer_id?:         string;
  customer_name?:       string;
  bu_code:              BuCode;
  bu_name?:             string;
  opportunity_id?:      string;

  project_type:         ProjectType;
  service_category?:    ServiceCategory;
  contract_type:        ContractType;

  start_date:           string;    // YYYY-MM-DD
  planned_end_date:     string;
  actual_end_date?:     string;
  baseline_end_date?:   string;

  budget_hours?:        number;
  actual_hours:         number;
  budget_cost:          number;
  actual_cost:          number;
  budget_revenue:       number;
  actual_revenue:       number;
  margin_target?:       number;    // 0-1

  project_manager_id?:  string;
  project_manager?:     string;
  account_manager_id?:  string;

  description?:         string;
  objectives?:          string;
  scope?:               string;
  success_criteria?:    string;

  phase:                ProjectPhase;
  status:               ProjectStatus;
  health_status:        HealthStatus;
  health_notes?:        string;

  priority:             Priority;
  strategic_alignment?: number;
  roi_estimate?:        number;

  billing_frequency?:   BillingFreq;
  next_billing_date?:   string;

  tags?:                string[];
  notes?:               string;

  // Calculated
  completion_pct?:      number;
  team_size?:           number;
  schedule_variance_days?: number;

  created_at:           string;
  updated_at:           string;
  created_by?:          string;
}

// ─── Project Task ─────────────────────────────────────────────────────────────

export interface PpmTask {
  task_id:              string;
  project_id:           string;
  project_name?:        string;
  parent_task_id?:      string;

  task_name:            string;
  description?:         string;
  task_type:            TaskType;

  wbs_code?:            string;
  sort_order:           number;

  assigned_to?:         string;
  assigned_name?:       string;

  estimated_hours?:     number;
  actual_hours:         number;

  start_date?:          string;
  due_date?:            string;
  completed_date?:      string;
  baseline_due_date?:   string;

  status:               TaskStatus;
  completion_pct:       number;

  dependencies?:        string[];
  is_deliverable:       boolean;
  blocked_reason?:      string;
  notes?:               string;

  created_at:           string;
  updated_at:           string;
}

// ─── Milestone ────────────────────────────────────────────────────────────────

export interface PpmMilestone {
  milestone_id:         string;
  project_id:           string;
  project_name?:        string;

  milestone_name:       string;
  description?:         string;

  planned_date:         string;
  actual_date?:         string;
  baseline_date?:       string;

  status:               MilestoneStatus;

  triggers_payment:     boolean;
  payment_amount?:      number;
  payment_percentage?:  number;

  requires_approval:    boolean;
  approved_by?:         string;
  approved_at?:         string;

  notes?:               string;

  created_at:           string;
  updated_at:           string;
}

// ─── Resource Allocation ──────────────────────────────────────────────────────

export interface PpmAllocation {
  allocation_id:        string;
  project_id:           string;
  project_name?:        string;
  user_id:              string;
  user_name?:           string;

  role:                 string;

  allocation_pct:       number;   // 0-100
  hours_per_week?:      number;

  start_date:           string;
  end_date?:            string;

  billable_rate?:       number;
  cost_rate?:           number;
  is_billable:          boolean;

  status:               AllocationStatus;
  notes?:               string;

  created_at:           string;
  updated_at:           string;
}

// ─── Time Entry ───────────────────────────────────────────────────────────────

export interface PpmTimeEntry {
  entry_id:             string;
  user_id:              string;
  user_name?:           string;
  project_id:           string;
  project_name?:        string;
  task_id?:             string;
  task_name?:           string;

  entry_date:           string;
  hours:                number;

  is_billable:          boolean;
  billing_rate?:        number;
  cost_rate?:           number;

  description?:         string;

  status:               TimeEntryStatus;
  submitted_at?:        string;
  approved_by?:         string;
  approved_at?:         string;
  rejection_reason?:    string;

  invoiced:             boolean;
  invoice_id?:          string;

  created_at:           string;
  updated_at:           string;
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export interface PpmRisk {
  risk_id:              string;
  project_id:           string;
  project_name?:        string;

  risk_description:     string;

  impact:               RiskImpact;
  probability:          RiskProbability;
  risk_score?:          number;   // 1-9

  mitigation_plan?:     string;
  contingency_plan?:    string;

  owner_id?:            string;
  owner_name?:          string;

  status:               RiskStatus;
  identified_date:      string;
  closed_date?:         string;

  notes?:               string;

  created_at:           string;
  updated_at:           string;
}

// ─── Issue ────────────────────────────────────────────────────────────────────

export interface PpmIssue {
  issue_id:             string;
  project_id:           string;
  project_name?:        string;

  issue_description:    string;

  severity:             IssueSeverity;

  reported_by?:         string;
  reported_by_name?:    string;
  assigned_to?:         string;
  assigned_name?:       string;

  status:               IssueStatus;
  resolution?:          string;

  reported_date:        string;
  resolved_date?:       string;

  notes?:               string;

  created_at:           string;
  updated_at:           string;
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface PpmPortfolioMetrics {
  total_projects:       number;
  active_projects:      number;
  total_budget_revenue: number;
  total_actual_revenue: number;
  total_budget_cost:    number;
  total_actual_cost:    number;
  avg_margin_pct:       number;
  green_count:          number;
  yellow_count:         number;
  red_count:            number;
  total_team_members:   number;
  overdue_tasks:        number;
}

export interface ResourceUtilization {
  user_id:              string;
  user_name:            string;
  email?:               string;
  total_allocation_pct: number;
  utilization_status:   "overallocated" | "fully_allocated" | "partially_allocated" | "available";
  active_projects:      number;
  project_names:        string[];
}

// ─── EVM Metrics ─────────────────────────────────────────────────────────────

export interface PpmEvm {
  project_id:           string;
  planned_value:        number;   // PV = budget_cost
  earned_value:         number;   // EV = (actual_revenue / budget_revenue) * budget_cost
  actual_cost:          number;   // AC
  cost_variance:        number;   // CV = EV - AC
  schedule_variance:    number;   // SV = EV - PV
  cpi:                  number;   // Cost Performance Index = EV / AC
  spi:                  number;   // Schedule Performance Index = EV / PV
  etc:                  number;   // Estimate to Complete = (budget_cost - EV) / CPI
  eac:                  number;   // Estimate at Completion = AC + ETC
}
