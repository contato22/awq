// ─── AWQ M&A & Portfolio Management — Type Definitions ───────────────────────

// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type MaDealStage =
  | 'sourcing'
  | 'screening'
  | 'due_diligence'
  | 'structuring'
  | 'ic_review'
  | 'closed_won'
  | 'closed_lost';

export type MaDealType = 'm4e' | 'equity_investment' | 'acquisition';

export type MaPortcoStatus = 'active' | 'exited' | 'written_off';

export type MaDdStatus = 'not_started' | 'in_progress' | 'completed';

export type MaDdCategory = 'financial' | 'legal' | 'commercial' | 'technical' | 'esg';

export type MaIcDecision = 'approved' | 'rejected' | 'deferred';

export type MaSynergyType =
  | 'cross_selling'
  | 'shared_resource'
  | 'knowledge_sharing'
  | 'cost_reduction';

export type MaSynergyStatus = 'identified' | 'in_progress' | 'realized' | 'abandoned';

export type MaDeliverableType =
  | 'social_media'
  | 'video_production'
  | 'branding'
  | 'campaign'
  | 'event'
  | 'other';

export type MaDeliverableStatus = 'planned' | 'in_progress' | 'delivered' | 'approved';

export type MaShareClass = 'common' | 'preferred' | 'options';

export type MaShareholderType = 'founder' | 'investor' | 'employee' | 'advisor';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface MaDeal {
  deal_id: string;
  deal_code: string;
  deal_name: string;
  company_name: string;
  company_website?: string | null;
  industry?: string | null;
  company_stage?: string | null;
  deal_type: MaDealType;
  pipeline_stage: MaDealStage;
  lead_source?: string | null;
  lead_source_detail?: string | null;
  market_score: number;
  team_score: number;
  product_score: number;
  traction_score: number;
  total_score: number;
  screening_decision?: string | null;
  screening_notes?: string | null;
  dd_status?: MaDdStatus | null;
  dd_completion_pct: number;
  dd_start_date?: string | null;
  dd_end_date?: string | null;
  proposed_valuation?: number | null;
  proposed_investment_amount?: number | null;
  proposed_equity_pct?: number | null;
  media_commitment_value?: number | null;
  media_delivery_period_months?: number | null;
  board_seat: boolean;
  observer_rights: boolean;
  vesting_period_years?: number | null;
  vesting_cliff_months?: number | null;
  ic_memo_url?: string | null;
  ic_presentation_url?: string | null;
  ic_meeting_date?: string | null;
  ic_decision?: MaIcDecision | null;
  ic_decision_date?: string | null;
  ic_decision_notes?: string | null;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  close_reason?: string | null;
  close_notes?: string | null;
  portco_id?: string | null;
  deal_lead?: string | null;
  tags?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // from view
  dd_total_items?: number;
  dd_completed_items?: number;
}

export interface MaPortfolioCompany {
  portco_id: string;
  portco_code: string;
  legal_name: string;
  trade_name?: string | null;
  document_number?: string | null;
  deal_id?: string | null;
  deal_type: string;
  investment_date: string;
  awq_ownership_pct?: number | null;
  awq_shares_held?: number | null;
  total_shares_outstanding?: number | null;
  entry_valuation?: number | null;
  current_valuation?: number | null;
  valuation_date?: string | null;
  media_commitment_value?: number | null;
  media_delivered_value: number;
  media_remaining_value?: number | null;
  media_delivery_start_date?: string | null;
  media_delivery_end_date?: string | null;
  board_seat: boolean;
  observer_rights: boolean;
  board_meeting_frequency?: string | null;
  company_stage?: string | null;
  ceo_name?: string | null;
  ceo_email?: string | null;
  ceo_phone?: string | null;
  website?: string | null;
  industry?: string | null;
  sector?: string | null;
  status: MaPortcoStatus;
  exit_date?: string | null;
  exit_type?: string | null;
  exit_valuation?: number | null;
  exit_proceeds?: number | null;
  tags?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface MaPortfolioDashboardRow extends MaPortfolioCompany {
  unrealized_gain?: number | null;
  valuation_multiple?: number | null;
  media_delivery_pct: number;
  latest_mrr?: number | null;
  latest_arr?: number | null;
  latest_burn?: number | null;
  latest_runway?: number | null;
  latest_mom_growth?: number | null;
  latest_headcount?: number | null;
  kpi_as_of?: string | null;
}

export interface MaDueDiligenceItem {
  dd_item_id: string;
  deal_id: string;
  dd_category: MaDdCategory;
  item_name: string;
  item_description?: string | null;
  status: string;
  completion_pct: number;
  finding?: string | null;
  finding_notes?: string | null;
  risk_level?: string | null;
  documents?: Array<{ name: string; url: string }> | null;
  assigned_to?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaCapTableEntry {
  cap_table_id: string;
  portco_id: string;
  shareholder_name: string;
  shareholder_type?: MaShareholderType | null;
  shareholder_entity?: string | null;
  share_class: MaShareClass;
  shares_held: number;
  ownership_pct?: number | null;
  vesting_schedule?: string | null;
  vesting_start_date?: string | null;
  vesting_cliff_date?: string | null;
  vesting_end_date?: string | null;
  shares_vested: number;
  shares_unvested?: number | null;
  cost_per_share?: number | null;
  total_cost_basis?: number | null;
  acquisition_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaPortcoKpi {
  kpi_id: string;
  portco_id: string;
  reporting_date: string;
  year_month?: string | null;
  mrr?: number | null;
  arr?: number | null;
  total_revenue?: number | null;
  gross_margin_pct?: number | null;
  burn_rate?: number | null;
  cash_balance?: number | null;
  runway_months?: number | null;
  mom_growth_pct?: number | null;
  yoy_growth_pct?: number | null;
  cac?: number | null;
  ltv?: number | null;
  ltv_cac_ratio?: number | null;
  gmv?: number | null;
  active_users?: number | null;
  new_users?: number | null;
  churn_rate_pct?: number | null;
  nps?: number | null;
  headcount?: number | null;
  product_launched: boolean;
  funding_round_closed: boolean;
  notes?: string | null;
  submitted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaBoardMeeting {
  meeting_id: string;
  portco_id: string;
  meeting_date: string;
  meeting_type: string;
  agenda?: string | null;
  board_deck_url?: string | null;
  financial_report_url?: string | null;
  other_materials?: Array<{ name: string; url: string }> | null;
  attendees?: string[] | null;
  awq_representative?: string | null;
  minutes_url?: string | null;
  resolutions?: Array<{ resolution: string; vote: string }> | null;
  action_items?: Array<{ item: string; owner: string; due: string }> | null;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaMediaDeliverable {
  deliverable_id: string;
  portco_id: string;
  deliverable_type: MaDeliverableType;
  description?: string | null;
  agreed_value?: number | null;
  executing_bu?: string | null;
  project_ref?: string | null;
  scheduled_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  status: MaDeliverableStatus;
  approved_by_portco: boolean;
  approval_date?: string | null;
  approval_notes?: string | null;
  deliverable_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaIntercompanyTransaction {
  ic_transaction_id: string;
  transaction_date: string;
  transaction_type?: string | null;
  from_entity_type?: string | null;
  from_entity_id?: string | null;
  from_entity_name?: string | null;
  to_entity_type?: string | null;
  to_entity_id?: string | null;
  to_entity_name?: string | null;
  amount: number;
  debit_account_code?: string | null;
  credit_account_code?: string | null;
  description?: string | null;
  source_system?: string | null;
  elimination_status: string;
  elimination_date?: string | null;
  created_at: string;
}

export interface MaSynergyOpportunity {
  synergy_id: string;
  synergy_type?: MaSynergyType | null;
  opportunity_name?: string | null;
  description?: string | null;
  source_bu?: string | null;
  target_bu?: string | null;
  portco_id?: string | null;
  estimated_revenue_impact?: number | null;
  estimated_cost_savings?: number | null;
  status: MaSynergyStatus;
  identified_date?: string | null;
  realization_date?: string | null;
  actual_revenue_impact?: number | null;
  actual_cost_savings?: number | null;
  owner?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaIcMeeting {
  ic_meeting_id: string;
  meeting_date: string;
  meeting_type: string;
  attendees?: string[] | null;
  deals_reviewed?: string[] | null;
  minutes_url?: string | null;
  status: string;
  created_at: string;
}

export interface MaIcDecisionRecord {
  ic_decision_id: string;
  ic_meeting_id?: string | null;
  deal_id: string;
  decision: MaIcDecision;
  decision_date: string;
  votes?: Array<{ member: string; vote: string }> | null;
  vote_result?: string | null;
  decision_rationale?: string | null;
  conditions?: string | null;
  created_at: string;
}

// ─── Dashboard / Analytics ────────────────────────────────────────────────────

export interface MaPortfolioDashboardTotals {
  total_portcos: number;
  active_portcos: number;
  total_investment: number;
  total_current_value: number;
  total_unrealized_gain: number;
  weighted_avg_multiple: number;
  total_media_committed: number;
  total_media_delivered: number;
  media_delivery_pct: number;
}

export interface MaPipelineFunnelStage {
  pipeline_stage: string;
  deal_count: number;
  total_investment: number;
  avg_score: number;
}
