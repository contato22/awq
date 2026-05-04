// ─── AWQ CRM — Shared TypeScript Types ────────────────────────────────────────

export const PIPELINE_STAGES = [
  "discovery", "qualification", "proposal", "negotiation",
  "closed_won", "closed_lost",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  discovery:     25,
  qualification: 40,
  proposal:      60,
  negotiation:   75,
  closed_won:    100,
  closed_lost:   0,
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  discovery:     "Discovery",
  qualification: "Qualificação",
  proposal:      "Proposta",
  negotiation:   "Negociação",
  closed_won:    "Ganho",
  closed_lost:   "Perdido",
};

export const BU_OPTIONS = ["JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
export type BuCode = typeof BU_OPTIONS[number];

export const OWNER_OPTIONS = ["Miguel", "Danilo"] as const;
export type Owner = typeof OWNER_OPTIONS[number];

export const CLOSED_STAGES = ["closed_won", "closed_lost"] as const satisfies PipelineStage[];
export const isOpenStage  = (s: string): boolean => s !== "closed_won" && s !== "closed_lost";
export const isClosedStage = (s: string): boolean => !isOpenStage(s);

// ─── Account ─────────────────────────────────────────────────────────────────

export type CrmAccount = {
  account_id: string;
  account_code: string;
  account_name: string;
  trade_name: string | null;
  document_number: string | null;
  industry: string | null;
  company_size: string | null;
  annual_revenue_estimate: number | null;
  website: string | null;
  linkedin_url: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  account_type: "prospect" | "customer" | "partner" | "former_customer";
  bu: string;
  owner: string;
  health_score: number;
  churn_risk: "low" | "medium" | "high";
  renewal_date: string | null;
  epm_customer_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // joined
  open_opportunities?: number;
  last_activity_at?: string | null;
};

// ─── Contact ─────────────────────────────────────────────────────────────────

export type CrmContact = {
  contact_id: string;
  account_id: string;
  account_name?: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  job_title: string | null;
  department: string | null;
  seniority: "c_level" | "director" | "manager" | "ic";
  linkedin_url: string | null;
  is_primary_contact: boolean;
  contact_preferences: string[];
  created_at: string;
  updated_at: string;
};

// ─── Lead ─────────────────────────────────────────────────────────────────────

export type CrmLead = {
  lead_id: string;
  lead_source: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  bu: string;
  lead_score: number;
  status: "new" | "contacted" | "qualified" | "unqualified" | "converted";
  qualification_notes: string | null;
  bant_budget: number | null;
  bant_authority: boolean;
  bant_need: "low" | "medium" | "high" | null;
  bant_timeline: string | null;
  assigned_to: string;
  converted_to_opportunity_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

// ─── Opportunity ──────────────────────────────────────────────────────────────

export type CrmOpportunity = {
  opportunity_id: string;
  opportunity_code: string;
  opportunity_name: string;
  account_id: string | null;
  account_name?: string;
  contact_id: string | null;
  contact_name?: string | null;
  bu: string;
  stage: PipelineStage;
  deal_value: number;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  lost_reason: string | null;
  lost_to_competitor: string | null;
  win_reason: string | null;
  owner: string;
  proposal_sent_date: string | null;
  proposal_viewed: boolean;
  proposal_accepted: boolean;
  synced_to_epm: boolean;
  epm_customer_id: string | null;
  epm_ar_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

// ─── Stage History ────────────────────────────────────────────────────────────

export type CrmStageHistory = {
  history_id: string;
  opportunity_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  changed_at: string;
};

// ─── Activity ─────────────────────────────────────────────────────────────────

export type CrmActivity = {
  activity_id: string;
  activity_type: "call" | "email" | "meeting" | "task" | "note";
  related_to_type: "lead" | "opportunity" | "account" | "contact";
  related_to_id: string;
  related_name?: string;
  subject: string;
  description: string | null;
  outcome: "successful" | "unsuccessful" | "no_answer" | null;
  duration_minutes: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  status: "scheduled" | "completed" | "cancelled";
  created_by: string;
  created_at: string;
  updated_at: string;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export type CrmPipelineMetrics = {
  byStage: Record<string, { count: number; value: number; weighted: number }>;
  totalPipeline: number;
  weightedForecast: number;
  openDeals: number;
};

export type CrmDashboardMetrics = {
  leadsNew: number;
  openOpportunities: number;
  pipelineValue: number;
  weightedForecast: number;
  closedWonThisMonth: number;
  revenueThisMonth: number;
  winRate: number;
  tasksToday: CrmActivity[];
};

// ─── API Response ─────────────────────────────────────────────────────────────

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
