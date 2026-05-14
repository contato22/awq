// ─── GET /api/setup/migrate?secret=SETUP_SECRET ───────────────────────────────
//
// One-shot migration endpoint: creates all Supabase tables for the AWQ app.
// Uses the Supabase Management API (no exec_sql RPC needed).
//
// Required env vars:
//   SETUP_SECRET        — protects this endpoint
//   NEXT_PUBLIC_SUPABASE_URL — already set
//   SUPABASE_PAT        — personal access token from app.supabase.com/account/tokens
//
// Usage (call from browser or curl after deploying to Vercel):
//   GET https://your-app.vercel.app/api/setup/migrate?secret=YOUR_SECRET

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Split the SQL into individual statements, skipping empty lines and comments
function splitStatements(sql: string): string[] {
  // Remove block comments
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  // Split by semicolons
  const stmts = sql.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));
  return stmts;
}

const MIGRATION_SQL = `
-- JACQES CRM
create table if not exists jacqes_crm_leads (
  id text primary key default gen_random_uuid()::text,
  nome text not null default '', empresa text not null default '',
  contato_principal text not null default '', telefone text not null default '',
  email text not null default '', origem text not null default '',
  segmento text not null default '', canal text not null default '',
  interesse text not null default '', status text not null default 'Novo',
  owner text not null default '', data_entrada text not null default '',
  observacoes text not null default '', created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_opportunities (
  id text primary key default gen_random_uuid()::text,
  lead_id text, cliente_id text, nome_oportunidade text not null default '',
  empresa text not null default '', segmento text not null default '',
  produto text not null default '', ticket_estimado numeric not null default 0,
  valor_potencial numeric not null default 0, stage text not null default 'Novo Lead',
  probabilidade numeric not null default 0, owner text not null default '',
  data_abertura text not null default '', proxima_acao text not null default '',
  data_proxima_acao text, risco text not null default 'Baixo',
  motivo_perda text not null default '', data_fechamento_prevista text,
  observacoes text not null default '', created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_proposals (
  id text primary key default gen_random_uuid()::text,
  opportunity_id text not null, versao integer not null default 1,
  valor_proposto numeric not null default 0, escopo text not null default '',
  status text not null default 'Em Elaboração', data_envio text,
  data_resposta text, contraproposta numeric, observacoes text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_clients (
  id text primary key default gen_random_uuid()::text,
  nome text not null default '', razao_social text not null default '',
  cnpj text not null default '', segmento text not null default '',
  produto_ativo text not null default '', ticket_mensal numeric not null default 0,
  inicio_relacao text, owner text not null default '',
  status_conta text not null default 'Ativo', health_score numeric not null default 80,
  churn_risk text not null default 'Baixo', potencial_expansao numeric not null default 0,
  observacoes text not null default '', created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_interactions (
  id text primary key default gen_random_uuid()::text,
  cliente_id text, opportunity_id text, lead_id text,
  tipo text not null default '', canal text not null default '',
  data text not null default '', resumo text not null default '',
  proximo_passo text not null default '', responsavel text not null default '',
  satisfacao_percebida text not null default '', risco_percebido text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_tasks (
  id text primary key default gen_random_uuid()::text,
  cliente_id text, opportunity_id text, lead_id text,
  titulo text not null default '', categoria text not null default '',
  prioridade text not null default 'Média', status text not null default 'Aberta',
  responsavel text not null default '', data_criacao text not null default '',
  prazo text, sla_horas numeric not null default 0, data_conclusao text,
  bloqueio text not null default '', retrabalho boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_visits (
  id text primary key default gen_random_uuid()::text,
  cliente_id text not null, data text not null default '',
  objetivo text not null default '', resultado text not null default '',
  proximo_passo text not null default '', responsavel text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_expansion (
  id text primary key default gen_random_uuid()::text,
  cliente_id text not null, tipo text not null default '',
  valor_potencial numeric not null default 0, status text not null default '',
  owner text not null default '', proxima_acao text not null default '',
  observacoes text not null default '', created_at timestamptz not null default now()
);
create table if not exists jacqes_crm_health_snapshot (
  id text primary key default gen_random_uuid()::text,
  cliente_id text not null, periodo text not null default '',
  health_score numeric not null default 80, churn_risk text not null default 'Baixo',
  ultima_interacao text, followups_em_dia boolean not null default true,
  pendencias integer not null default 0, expansao_aberta boolean not null default false,
  created_at timestamptz not null default now()
);
-- CAZA CRM
create table if not exists caza_crm_leads (
  id text primary key, nome text not null default '', cargo text not null default '',
  empresa text not null default '', cnpj text not null default '',
  contato_principal text not null default '', telefone text not null default '',
  email text not null default '', origem text not null default '',
  tipo_servico text not null default '', interesse text not null default '',
  status text not null default 'Novo', owner text not null default '',
  data_entrada text not null default '', observacoes text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists caza_crm_opportunities (
  id text primary key, lead_id text, nome_oportunidade text not null default '',
  empresa text not null default '', tipo_servico text not null default '',
  valor_estimado numeric not null default 0, stage text not null default 'Lead Captado',
  probabilidade numeric not null default 0, owner text not null default '',
  data_abertura text not null default '', prazo_estimado text,
  proxima_acao text not null default '', data_proxima_acao text,
  risco text not null default 'Baixo', motivo_perda text not null default '',
  observacoes text not null default '', created_at timestamptz not null default now()
);
create table if not exists caza_crm_proposals (
  id text primary key, opportunity_id text not null, versao integer not null default 1,
  valor_proposto numeric not null default 0, escopo text not null default '',
  status text not null default 'Em Elaboração', data_envio text, data_resposta text,
  observacoes text not null default '', created_at timestamptz not null default now()
);
create table if not exists caza_crm_interactions (
  id text primary key, entidade_tipo text not null default '',
  entidade_id text not null default '', tipo text not null default '',
  descricao text not null default '', owner text not null default '',
  data text not null default '', observacoes text not null default '',
  created_at timestamptz not null default now()
);
-- CAZA DB
create table if not exists caza_projects (
  id text primary key, titulo text not null default '', cliente text not null default '',
  tipo text not null default '', status text not null default '',
  prioridade text not null default '', diretor text not null default '',
  prazo text not null default '', inicio text not null default '',
  valor numeric not null default 0, alimentacao numeric not null default 0,
  gasolina numeric not null default 0, despesas numeric not null default 0,
  lucro numeric not null default 0, recebido boolean not null default false,
  recebimento text not null default '', imported_from_notion boolean not null default false,
  notion_page_id text, imported_at text, last_internal_update text not null default '',
  sync_status text not null default 'internal'
);
create table if not exists caza_clients (
  id text primary key, name text not null default '', email text not null default '',
  phone text not null default '', type text not null default 'Marca',
  budget_anual numeric not null default 0, status text not null default 'Ativo',
  segmento text not null default '', since text not null default '',
  cnpj text not null default '', contato_nome text not null default '',
  contato_cargo text not null default '', modelo_contrato text not null default '',
  owner text not null default '', health_score numeric not null default 80,
  nps numeric, observacoes text not null default '',
  imported_from_notion boolean not null default false, notion_page_id text,
  imported_at text, last_internal_update text not null default '',
  sync_status text not null default 'internal'
);
-- ADVISOR
create table if not exists advisor_clients (
  id text primary key, name text not null default '', segmento text not null default '',
  tipo_servico text not null default '', aum numeric not null default 0,
  fee_mensal numeric not null default 0, status text not null default 'Ativo',
  since text not null default '', responsavel text not null default '',
  contato_email text not null default '', contato_phone text not null default '',
  nps numeric, imported_from_notion boolean not null default false,
  notion_page_id text, imported_at text, last_internal_update text not null default '',
  sync_status text not null default 'internal'
);
-- BPM
create table if not exists process_definitions (
  process_def_id text primary key default gen_random_uuid()::text,
  process_code text not null unique, process_name text not null default '',
  process_category text not null default '', description text, process_owner text,
  workflow_steps jsonb not null default '[]', routing_rules jsonb,
  default_sla_hours integer not null default 72, escalation_enabled boolean not null default false,
  escalation_hours integer not null default 24, notification_config jsonb,
  is_active boolean not null default true, version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text
);
create table if not exists process_instances (
  instance_id text primary key default gen_random_uuid()::text,
  instance_code text not null default '', process_def_id text not null,
  process_code text not null default '', process_name text not null default '',
  related_entity_type text not null default '', related_entity_id text not null default '',
  request_data jsonb not null default '{}', initiated_by text not null default '',
  initiated_at text not null default '', current_step_id text, current_step_name text,
  status text not null default 'in_progress', started_at text not null default '',
  completed_at text, sla_due_date text, sla_breached boolean not null default false,
  final_decision text, rejection_reason text, priority text not null default 'normal',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists process_tasks (
  task_id text primary key default gen_random_uuid()::text,
  instance_id text not null, step_id text not null default '',
  step_name text not null default '', assigned_to text not null default '',
  assigned_at text not null default '', task_type text not null default 'approval',
  status text not null default 'pending', decision text, decision_notes text,
  decided_by text, decided_at text, sla_hours integer, sla_due_date text,
  sla_breached boolean not null default false, escalated boolean not null default false,
  escalated_to text, escalated_at text, task_data jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists process_history (
  history_id text primary key default gen_random_uuid()::text,
  instance_id text not null, action text not null default '',
  action_description text, step_id text, step_name text,
  performed_by text, performed_at text not null default '',
  action_data jsonb, created_at timestamptz not null default now()
);
create table if not exists bpm_notifications (
  notification_id text primary key default gen_random_uuid()::text,
  user_id text not null, notification_type text not null default '',
  related_entity_type text, related_entity_id text,
  title text not null default '', message text not null default '',
  action_url text, is_read boolean not null default false, read_at text,
  send_email boolean not null default false, email_sent boolean not null default false,
  email_sent_at text, priority text not null default 'normal',
  created_at timestamptz not null default now()
);
-- MA
create table if not exists ma_deals (
  deal_id text primary key, deal_code text not null default '',
  deal_name text not null default '', company_name text not null default '',
  company_website text, industry text, company_stage text,
  deal_type text not null default 'm4e', pipeline_stage text not null default 'sourcing',
  lead_source text, lead_source_detail text,
  market_score numeric not null default 0, team_score numeric not null default 0,
  product_score numeric not null default 0, traction_score numeric not null default 0,
  total_score numeric not null default 0, screening_decision text, screening_notes text,
  dd_status text, dd_completion_pct numeric not null default 0,
  dd_start_date text, dd_end_date text, proposed_valuation numeric,
  proposed_investment_amount numeric, proposed_equity_pct numeric,
  media_commitment_value numeric, media_delivery_period_months integer,
  board_seat boolean not null default false, observer_rights boolean not null default false,
  vesting_period_years integer, vesting_cliff_months integer,
  ic_memo_url text, ic_presentation_url text, ic_meeting_date text,
  ic_decision text, ic_decision_date text, ic_decision_notes text,
  expected_close_date text, actual_close_date text, close_reason text, close_notes text,
  portco_id text, deal_lead text, tags jsonb, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text
);
create table if not exists ma_portfolio_companies (
  portco_id text primary key, portco_code text not null default '',
  legal_name text not null default '', trade_name text, document_number text,
  deal_id text, deal_type text not null default 'm4e',
  investment_date text not null default '', awq_ownership_pct numeric,
  awq_shares_held numeric, total_shares_outstanding numeric,
  entry_valuation numeric, current_valuation numeric, valuation_date text,
  media_commitment_value numeric, media_delivered_value numeric not null default 0,
  media_remaining_value numeric, media_delivery_start_date text, media_delivery_end_date text,
  board_seat boolean not null default false, observer_rights boolean not null default false,
  board_meeting_frequency text, company_stage text, ceo_name text, ceo_email text,
  ceo_phone text, website text, industry text, sector text,
  status text not null default 'active', exit_date text, exit_type text,
  exit_valuation numeric, exit_proceeds numeric, tags jsonb, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text
);
create table if not exists ma_due_diligence_items (
  dd_item_id text primary key default gen_random_uuid()::text,
  deal_id text not null, dd_category text not null default 'financial',
  item_name text not null default '', item_description text,
  status text not null default 'not_started', completion_pct numeric not null default 0,
  finding text, finding_notes text, risk_level text, documents jsonb,
  assigned_to text, due_date text, completed_date text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ma_cap_table (
  cap_table_id text primary key default gen_random_uuid()::text,
  portco_id text not null, shareholder_name text not null default '',
  shareholder_type text, shareholder_entity text, share_class text not null default 'common',
  shares_held numeric not null default 0, ownership_pct numeric, vesting_schedule text,
  vesting_start_date text, vesting_cliff_date text, vesting_end_date text,
  shares_vested numeric not null default 0, shares_unvested numeric,
  cost_per_share numeric, total_cost_basis numeric, acquisition_date text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ma_portco_kpis (
  kpi_id text primary key default gen_random_uuid()::text,
  portco_id text not null, reporting_date text not null default '', year_month text,
  mrr numeric, arr numeric, total_revenue numeric, gross_margin_pct numeric,
  burn_rate numeric, cash_balance numeric, runway_months numeric,
  mom_growth_pct numeric, yoy_growth_pct numeric, cac numeric, ltv numeric,
  ltv_cac_ratio numeric, gmv numeric, active_users numeric, new_users numeric,
  churn_rate_pct numeric, nps numeric, headcount integer,
  product_launched boolean not null default false, funding_round_closed boolean not null default false,
  notes text, submitted_by text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ma_board_meetings (
  meeting_id text primary key default gen_random_uuid()::text,
  portco_id text not null, meeting_date text not null default '',
  meeting_type text not null default 'monthly_review', agenda text,
  board_deck_url text, financial_report_url text, other_materials jsonb,
  attendees jsonb, awq_representative text, minutes_url text, resolutions jsonb,
  action_items jsonb, status text not null default 'scheduled', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ma_media_deliverables (
  deliverable_id text primary key default gen_random_uuid()::text,
  portco_id text not null, deliverable_type text not null default 'other',
  description text, agreed_value numeric, executing_bu text, project_ref text,
  scheduled_delivery_date text, actual_delivery_date text,
  status text not null default 'planned', approved_by_portco boolean not null default false,
  approval_date text, approval_notes text, deliverable_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ma_intercompany_transactions (
  ic_transaction_id text primary key default gen_random_uuid()::text,
  transaction_date text not null default '', transaction_type text,
  from_entity_type text, from_entity_id text, from_entity_name text,
  to_entity_type text, to_entity_id text, to_entity_name text,
  amount numeric not null default 0, debit_account_code text, credit_account_code text,
  description text, source_system text, elimination_status text not null default 'pending',
  elimination_date text, created_at timestamptz not null default now()
);
create table if not exists ma_synergy_opportunities (
  synergy_id text primary key default gen_random_uuid()::text,
  synergy_type text, opportunity_name text, description text,
  source_bu text, target_bu text, portco_id text,
  estimated_revenue_impact numeric, estimated_cost_savings numeric,
  status text not null default 'identified', identified_date text, realization_date text,
  actual_revenue_impact numeric, actual_cost_savings numeric, owner text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ma_ic_meetings (
  ic_meeting_id text primary key default gen_random_uuid()::text,
  meeting_date text not null default '', meeting_type text not null default 'deal_review',
  attendees jsonb, deals_reviewed jsonb, minutes_url text,
  status text not null default 'scheduled', created_at timestamptz not null default now()
);
create table if not exists ma_ic_decisions (
  ic_decision_id text primary key default gen_random_uuid()::text,
  ic_meeting_id text, deal_id text not null, decision text not null default 'approved',
  decision_date text not null default '', votes jsonb, vote_result text,
  decision_rationale text, conditions text, created_at timestamptz not null default now()
);
-- PPM
create table if not exists ppm_projects (
  project_id text primary key, project_code text not null default '',
  project_name text not null default '', customer_id text, customer_name text,
  bu_code text not null default 'AWQ', bu_name text, opportunity_id text,
  project_type text not null default 'one_off', service_category text,
  contract_type text not null default 'fixed_price',
  start_date text not null default '', planned_end_date text not null default '',
  actual_end_date text, baseline_end_date text, budget_hours numeric,
  actual_hours numeric not null default 0, budget_cost numeric not null default 0,
  actual_cost numeric not null default 0, budget_revenue numeric not null default 0,
  actual_revenue numeric not null default 0, margin_target numeric,
  project_manager_id text, project_manager text, account_manager_id text,
  description text, objectives text, scope text, success_criteria text,
  phase text not null default 'initiation', status text not null default 'active',
  health_status text not null default 'green', health_notes text,
  priority text not null default 'medium', strategic_alignment numeric,
  roi_estimate numeric, billing_frequency text, next_billing_date text,
  tags jsonb, notes text, completion_pct numeric, team_size integer,
  schedule_variance_days integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text
);
create table if not exists ppm_tasks (
  task_id text primary key, project_id text not null, project_name text,
  parent_task_id text, task_name text not null default '', description text,
  task_type text not null default 'task', wbs_code text,
  sort_order integer not null default 0, assigned_to text, assigned_name text,
  estimated_hours numeric, actual_hours numeric not null default 0,
  start_date text, due_date text, completed_date text, baseline_due_date text,
  status text not null default 'not_started', completion_pct integer not null default 0,
  dependencies jsonb, is_deliverable boolean not null default false,
  blocked_reason text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ppm_milestones (
  milestone_id text primary key, project_id text not null, project_name text,
  milestone_name text not null default '', description text,
  planned_date text not null default '', actual_date text, baseline_date text,
  status text not null default 'upcoming', triggers_payment boolean not null default false,
  payment_amount numeric, payment_percentage numeric,
  requires_approval boolean not null default false, approved_by text, approved_at text,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ppm_allocations (
  allocation_id text primary key, project_id text not null, project_name text,
  user_id text not null, user_name text, role text not null default '',
  allocation_pct numeric not null default 0, hours_per_week numeric,
  start_date text not null default '', end_date text, billable_rate numeric,
  cost_rate numeric, is_billable boolean not null default true,
  status text not null default 'active', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ppm_time_entries (
  entry_id text primary key, user_id text not null, user_name text,
  project_id text not null, project_name text, task_id text, task_name text,
  entry_date text not null default '', hours numeric not null default 0,
  is_billable boolean not null default true, billing_rate numeric, cost_rate numeric,
  description text, status text not null default 'draft', submitted_at text,
  approved_by text, approved_at text, rejection_reason text,
  invoiced boolean not null default false, invoice_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ppm_risks (
  risk_id text primary key, project_id text not null, project_name text,
  risk_description text not null default '', impact text not null default 'medium',
  probability text not null default 'medium', risk_score integer,
  mitigation_plan text, contingency_plan text, owner_id text, owner_name text,
  status text not null default 'identified', identified_date text not null default '',
  closed_date text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists ppm_issues (
  issue_id text primary key, project_id text not null, project_name text,
  issue_description text not null default '', severity text not null default 'medium',
  reported_by text, reported_by_name text, assigned_to text, assigned_name text,
  status text not null default 'open', resolution text,
  reported_date text not null default '', resolved_date text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- RLS: enable + allow_all for all new tables
do $$
declare tbl text;
tables text[] := array[
  'jacqes_crm_leads','jacqes_crm_opportunities','jacqes_crm_proposals','jacqes_crm_clients',
  'jacqes_crm_interactions','jacqes_crm_tasks','jacqes_crm_visits','jacqes_crm_expansion',
  'jacqes_crm_health_snapshot','caza_crm_leads','caza_crm_opportunities','caza_crm_proposals',
  'caza_crm_interactions','caza_projects','caza_clients','advisor_clients',
  'process_definitions','process_instances','process_tasks','process_history','bpm_notifications',
  'ma_deals','ma_portfolio_companies','ma_due_diligence_items','ma_cap_table','ma_portco_kpis',
  'ma_board_meetings','ma_media_deliverables','ma_intercompany_transactions',
  'ma_synergy_opportunities','ma_ic_meetings','ma_ic_decisions',
  'ppm_projects','ppm_tasks','ppm_milestones','ppm_allocations','ppm_time_entries',
  'ppm_risks','ppm_issues'
];
begin
  foreach tbl in array tables loop
    execute format('alter table %I enable row level security', tbl);
    execute format('create policy if not exists allow_all on %I for all to anon, authenticated using (true) with check (true)', tbl);
  end loop;
end $$
`;

// Execute SQL via Supabase Management API — works from any origin including Vercel.
// Requires SUPABASE_PAT (personal access token from app.supabase.com/account/tokens).
async function execViaManagementApi(projectRef: string, pat: string, query: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pat}`,
      },
      body: JSON.stringify({ query }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: (body as Record<string, string>).message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.SETUP_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized. Pass ?secret=SETUP_SECRET" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const pat = process.env.SUPABASE_PAT ?? "";

  if (!supabaseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_URL not configured" }, { status: 503 });
  }
  if (!pat) {
    return NextResponse.json({
      error: "SUPABASE_PAT not configured. Create a personal access token at app.supabase.com/account/tokens and add it as SUPABASE_PAT env var.",
    }, { status: 503 });
  }

  // Extract project ref from URL: https://<ref>.supabase.co
  const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

  const results: { stmt: string; ok: boolean; error?: string }[] = [];

  // Run entire migration as one batch for atomicity + speed
  const shortBatch = "Full AWQ migration (all tables + RLS)";
  const batchResult = await execViaManagementApi(projectRef, pat, MIGRATION_SQL);
  if (batchResult.ok) {
    results.push({ stmt: shortBatch, ok: true });
  } else {
    // Batch failed — retry statement by statement so we can report which failed
    const statements = splitStatements(MIGRATION_SQL);
    for (const stmt of statements) {
      const shortStmt = stmt.slice(0, 100).replace(/\s+/g, " ");
      const r = await execViaManagementApi(projectRef, pat, stmt + ";");
      results.push({ stmt: shortStmt, ...r });
    }
  }

  const failures = results.filter(r => !r.ok);
  return NextResponse.json({
    total: results.length,
    success: results.filter(r => r.ok).length,
    failures: failures.length,
    details: failures.length > 0 ? failures : undefined,
    note: failures.length === 0
      ? "All AWQ tables created successfully. Supabase is ready."
      : "Some statements failed — see details. You can also run supabase_all_tables.sql directly in the Supabase SQL Editor.",
  });
}
