// ─── AWQ CRM — Shared TypeScript Types ────────────────────────────────────────

// ─── Generic / Fallback Pipeline ─────────────────────────────────────────────

export const PIPELINE_STAGES = [
  "discovery", "qualification", "proposal", "negotiation",
  // JACQES
  "prospecting", "briefing",
  // CAZA
  "production",
  // ADVISOR
  "diagnostic", "contract",
  // VENTURE
  "identification", "due_diligence", "term_sheet",
  // Shared closed
  "closed_won", "closed_lost",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_PROBABILITY: Record<string, number> = {
  // Generic
  discovery:       25,
  qualification:   40,
  proposal:        60,
  negotiation:     75,
  // JACQES
  prospecting:     20,
  briefing:        40,
  // CAZA
  production:      80,
  // ADVISOR
  diagnostic:      40,
  contract:        85,
  // VENTURE
  identification:  15,
  due_diligence:   35,
  term_sheet:      60,
  // Closed
  closed_won:      100,
  closed_lost:     0,
};

export const STAGE_LABELS: Record<string, string> = {
  // Generic
  discovery:       "Discovery",
  qualification:   "Qualificação",
  proposal:        "Proposta",
  negotiation:     "Negociação",
  // JACQES
  prospecting:     "Prospecção",
  briefing:        "Briefing",
  // CAZA
  production:      "Produção",
  // ADVISOR
  diagnostic:      "Diagnóstico",
  contract:        "Contrato",
  // VENTURE
  identification:  "Identificação",
  due_diligence:   "Due Diligence",
  term_sheet:      "Term Sheet",
  // Closed
  closed_won:      "Ganho",
  closed_lost:     "Perdido",
};

// ─── Per-BU Pipeline Config ───────────────────────────────────────────────────

export type BuStageConfig = {
  key: string;
  label: string;
  probability: number;
  bg: string;
  border: string;
  header: string;
  tag: string;
  bar: string;
};

export const BU_PIPELINE_STAGES: Record<string, string[]> = {
  JACQES:  ["prospecting", "briefing",    "proposal",    "negotiation"],
  CAZA:    ["discovery",   "briefing",    "proposal",    "production"],
  ADVISOR: ["discovery",   "diagnostic",  "proposal",    "contract"],
  VENTURE: ["identification", "due_diligence", "term_sheet", "negotiation"],
  Todos:   ["discovery",   "qualification", "proposal",  "negotiation"],
};

export const BU_STAGE_COLORS: Record<string, {
  bg: string; border: string; header: string; tag: string; bar: string;
}> = {
  // JACQES – blues
  prospecting:    { bg:"bg-sky-50",    border:"border-sky-200",    header:"bg-sky-500",    tag:"bg-sky-100 text-sky-700",    bar:"bg-sky-500" },
  briefing:       { bg:"bg-indigo-50", border:"border-indigo-200", header:"bg-indigo-500", tag:"bg-indigo-100 text-indigo-700", bar:"bg-indigo-500" },
  // Generic / shared
  discovery:      { bg:"bg-blue-50",   border:"border-blue-200",   header:"bg-blue-500",   tag:"bg-blue-100 text-blue-700",   bar:"bg-blue-500" },
  qualification:  { bg:"bg-violet-50", border:"border-violet-200", header:"bg-violet-500", tag:"bg-violet-100 text-violet-700", bar:"bg-violet-500" },
  proposal:       { bg:"bg-amber-50",  border:"border-amber-200",  header:"bg-amber-500",  tag:"bg-amber-100 text-amber-700",  bar:"bg-amber-500" },
  negotiation:    { bg:"bg-orange-50", border:"border-orange-200", header:"bg-orange-500", tag:"bg-orange-100 text-orange-700", bar:"bg-orange-500" },
  // CAZA
  production:     { bg:"bg-teal-50",   border:"border-teal-200",   header:"bg-teal-500",   tag:"bg-teal-100 text-teal-700",   bar:"bg-teal-500" },
  // ADVISOR
  diagnostic:     { bg:"bg-cyan-50",   border:"border-cyan-200",   header:"bg-cyan-500",   tag:"bg-cyan-100 text-cyan-700",   bar:"bg-cyan-500" },
  contract:       { bg:"bg-emerald-50",border:"border-emerald-200",header:"bg-emerald-600",tag:"bg-emerald-100 text-emerald-700",bar:"bg-emerald-500" },
  // VENTURE
  identification: { bg:"bg-purple-50", border:"border-purple-200", header:"bg-purple-500", tag:"bg-purple-100 text-purple-700", bar:"bg-purple-500" },
  due_diligence:  { bg:"bg-fuchsia-50",border:"border-fuchsia-200",header:"bg-fuchsia-500",tag:"bg-fuchsia-100 text-fuchsia-700",bar:"bg-fuchsia-500" },
  term_sheet:     { bg:"bg-rose-50",   border:"border-rose-200",   header:"bg-rose-500",   tag:"bg-rose-100 text-rose-700",   bar:"bg-rose-500" },
};

// ─── Service Categories & Payment ─────────────────────────────────────────────

export const SERVICE_CATEGORIES: Record<string, string[]> = {
  JACQES:  ["Gestão de Redes Sociais", "Produção de Conteúdo", "Tráfego Pago", "Influencer Marketing", "Social Media Strategy", "Community Management", "Outro"],
  CAZA:    ["Vídeo Institucional", "Documentário", "Motion Graphics", "Fotografia", "Produção de Eventos", "Conteúdo Digital", "Outro"],
  ADVISOR: ["Consultoria Estratégica", "Planejamento Financeiro", "M&A Advisory", "Due Diligence", "Reestruturação", "Outro"],
  VENTURE: ["Participação Societária", "Co-investimento", "Aceleração", "Mentoria Executiva", "Outro"],
  Todos:   ["Social Media", "Vídeo", "Consultoria", "Estratégia", "Produção", "Outro"],
};

export const PAYMENT_METHODS = [
  "PIX",
  "Boleto Bancário",
  "Cartão de Crédito",
  "Transferência (TED/DOC)",
  "À Negociar",
] as const;

export const PAYMENT_TERMS = [
  "À Vista",
  "30 dias",
  "60 dias",
  "90 dias",
  "Parcelado 3×",
  "Parcelado 6×",
  "Parcelado 12×",
  "Recorrência Mensal",
  "À Negociar",
] as const;

export const BU_OPTIONS = ["JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
export type BuCode = typeof BU_OPTIONS[number];

export const OWNER_OPTIONS = ["Miguel", "Danilo"] as const;
export type Owner = typeof OWNER_OPTIONS[number];

export const CLOSED_STAGES = ["closed_won", "closed_lost"] as const;
export const isOpenStage   = (s: string): boolean => s !== "closed_won" && s !== "closed_lost";
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
  stage: string;
  deal_value: number;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  lost_reason: string | null;
  lost_to_competitor: string | null;
  win_reason: string | null;
  owner: string;
  // Proposal
  proposal_sent_date: string | null;
  proposal_viewed: boolean;
  proposal_accepted: boolean;
  proposal_value?: number | null;
  proposal_notes?: string | null;
  proposal_validity_date?: string | null;
  // Service & payment
  service_category?: string | null;
  payment_method?: string | null;
  payment_terms?: string | null;
  // EPM sync
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
