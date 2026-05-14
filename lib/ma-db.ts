// ─── AWQ M&A & Portfolio Management — Database Layer (Supabase) ───────────────
// Uses getSupabaseAdmin from lib/supabase.ts — falls back to seed arrays when
// Supabase is not configured.

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  MaDeal,
  MaPortfolioCompany,
  MaPortfolioDashboardRow,
  MaDueDiligenceItem,
  MaCapTableEntry,
  MaPortcoKpi,
  MaBoardMeeting,
  MaMediaDeliverable,
  MaIntercompanyTransaction,
  MaSynergyOpportunity,
  MaIcMeeting,
  MaIcDecisionRecord,
  MaPortfolioDashboardTotals,
} from "@/lib/ma-types";

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────
export async function initMaDB(): Promise<void> {
  // Tables and views are created via the M&A SQL schema file run once in Supabase.
  // This function is a no-op placeholder kept for API route parity.
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const SEED_DEALS: MaDeal[] = [
  {
    deal_id: "deal-2026-001",
    deal_code: "DEAL-2026-001",
    deal_name: "Energdy M4E — Série A",
    company_name: "Grupo Energdy",
    company_website: "https://energdy.com.br",
    industry: "cleantech",
    company_stage: "seed",
    deal_type: "m4e",
    pipeline_stage: "closed_won",
    lead_source: "network",
    lead_source_detail: "Indicação parceiro AWQ",
    market_score: 20,
    team_score: 18,
    product_score: 15,
    traction_score: 12,
    total_score: 65,
    screening_decision: "approved",
    screening_notes: "Forte tração inicial, mercado de energia limpa em aceleração. Equipe experiente.",
    dd_status: "completed",
    dd_completion_pct: 100,
    dd_start_date: "2026-01-10",
    dd_end_date: "2026-02-20",
    proposed_valuation: 1000000,
    proposed_investment_amount: null,
    proposed_equity_pct: 20,
    media_commitment_value: 200000,
    media_delivery_period_months: 18,
    board_seat: false,
    observer_rights: true,
    vesting_period_years: 4,
    vesting_cliff_months: 12,
    ic_memo_url: null,
    ic_presentation_url: null,
    ic_meeting_date: "2026-02-28",
    ic_decision: "approved",
    ic_decision_date: "2026-02-28",
    ic_decision_notes: "Aprovado por unanimidade. Condições: entrega de mídia trimestral com KPIs acordados.",
    expected_close_date: "2026-03-15",
    actual_close_date: "2026-03-01",
    close_reason: null,
    close_notes: "Contrato assinado antecipadamente. SHA e pacto parassocial registrados.",
    portco_id: "portco-2026-001",
    deal_lead: "Miguel (AWQ)",
    tags: { priority: "high", sector: "cleantech" },
    notes: "Deal âncora do portfólio M4E 2026.",
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    created_by: "Miguel",
    dd_total_items: 12,
    dd_completed_items: 12,
  },
];

export const SEED_PORTCOS: MaPortfolioDashboardRow[] = [
  {
    portco_id: "portco-2026-001",
    portco_code: "PORTCO-2026-001",
    legal_name: "Grupo Energdy Ltda.",
    trade_name: "Energdy",
    document_number: "55.123.456/0001-78",
    deal_id: "deal-2026-001",
    deal_type: "m4e",
    investment_date: "2026-03-01",
    awq_ownership_pct: 20,
    awq_shares_held: 200000,
    total_shares_outstanding: 1000000,
    entry_valuation: 1000000,
    current_valuation: 1050000,
    valuation_date: "2026-04-30",
    media_commitment_value: 200000,
    media_delivered_value: 24000,
    media_remaining_value: 176000,
    media_delivery_start_date: "2026-03-01",
    media_delivery_end_date: "2027-08-31",
    board_seat: false,
    observer_rights: true,
    board_meeting_frequency: "monthly",
    company_stage: "seed",
    ceo_name: "Rodrigo Energdy",
    ceo_email: "rodrigo@energdy.com.br",
    ceo_phone: "11 99999-0001",
    website: "https://energdy.com.br",
    industry: "cleantech",
    sector: "energia renovável",
    status: "active",
    exit_date: null,
    exit_type: null,
    exit_valuation: null,
    exit_proceeds: null,
    tags: { highlight: true },
    notes: "Primeiro portco M4E. Crescimento acelerado em energia solar residencial.",
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    created_by: "Miguel",
    // dashboard computed fields
    unrealized_gain: 50000,
    valuation_multiple: 1.05,
    media_delivery_pct: 12,
    latest_mrr: 11200,
    latest_arr: 134400,
    latest_burn: -19500,
    latest_runway: 8.2,
    latest_mom_growth: 31.76,
    latest_headcount: 5,
    kpi_as_of: "2026-04-30",
  },
];

export const SEED_CAP_TABLE: MaCapTableEntry[] = [
  {
    cap_table_id: "ct-001",
    portco_id: "portco-2026-001",
    shareholder_name: "Fundadores Energdy",
    shareholder_type: "founder",
    shareholder_entity: "Grupo Energdy Fundadores Ltda.",
    share_class: "common",
    shares_held: 700000,
    ownership_pct: 70,
    vesting_schedule: null,
    vesting_start_date: null,
    vesting_cliff_date: null,
    vesting_end_date: null,
    shares_vested: 700000,
    shares_unvested: 0,
    cost_per_share: null,
    total_cost_basis: null,
    acquisition_date: "2026-03-01",
    is_active: true,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    cap_table_id: "ct-002",
    portco_id: "portco-2026-001",
    shareholder_name: "AWQ Group",
    shareholder_type: "investor",
    shareholder_entity: "AWQ Group S.A.",
    share_class: "preferred",
    shares_held: 200000,
    ownership_pct: 20,
    vesting_schedule: "4 anos com cliff de 1 ano",
    vesting_start_date: "2026-03-01",
    vesting_cliff_date: "2027-03-01",
    vesting_end_date: "2030-03-01",
    shares_vested: 0,
    shares_unvested: 200000,
    cost_per_share: null,
    total_cost_basis: null,
    acquisition_date: "2026-03-01",
    is_active: true,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    cap_table_id: "ct-003",
    portco_id: "portco-2026-001",
    shareholder_name: "Angels Round",
    shareholder_type: "investor",
    shareholder_entity: null,
    share_class: "common",
    shares_held: 100000,
    ownership_pct: 10,
    vesting_schedule: null,
    vesting_start_date: null,
    vesting_cliff_date: null,
    vesting_end_date: null,
    shares_vested: 100000,
    shares_unvested: 0,
    cost_per_share: null,
    total_cost_basis: null,
    acquisition_date: "2026-03-01",
    is_active: true,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

export const SEED_KPIS: MaPortcoKpi[] = [
  {
    kpi_id: "kpi-001",
    portco_id: "portco-2026-001",
    reporting_date: "2026-03-31",
    year_month: "2026-03",
    mrr: 8500,
    arr: 102000,
    total_revenue: 8500,
    gross_margin_pct: 62,
    burn_rate: -22000,
    cash_balance: 180000,
    runway_months: 8.2,
    mom_growth_pct: null,
    yoy_growth_pct: null,
    cac: 1200,
    ltv: 14400,
    ltv_cac_ratio: 12,
    gmv: null,
    active_users: null,
    new_users: null,
    churn_rate_pct: 2.1,
    nps: null,
    headcount: 4,
    product_launched: true,
    funding_round_closed: true,
    notes: "Primeiro mês pós-fechamento do deal. Lançamento produto solar residencial.",
    submitted_by: "Rodrigo Energdy",
    created_at: "2026-04-05T00:00:00Z",
    updated_at: "2026-04-05T00:00:00Z",
  },
  {
    kpi_id: "kpi-002",
    portco_id: "portco-2026-001",
    reporting_date: "2026-04-30",
    year_month: "2026-04",
    mrr: 11200,
    arr: 134400,
    total_revenue: 11200,
    gross_margin_pct: 65,
    burn_rate: -19500,
    cash_balance: 160500,
    runway_months: 8.2,
    mom_growth_pct: 31.76,
    yoy_growth_pct: null,
    cac: 980,
    ltv: 16800,
    ltv_cac_ratio: 17.1,
    gmv: null,
    active_users: null,
    new_users: null,
    churn_rate_pct: 1.8,
    nps: null,
    headcount: 5,
    product_launched: true,
    funding_round_closed: false,
    notes: "Crescimento MoM de 31.76%. Contratação de novo engenheiro de campo.",
    submitted_by: "Rodrigo Energdy",
    created_at: "2026-05-05T00:00:00Z",
    updated_at: "2026-05-05T00:00:00Z",
  },
];

export const SEED_BOARD_MEETINGS: MaBoardMeeting[] = [
  {
    meeting_id: "bm-001",
    portco_id: "portco-2026-001",
    meeting_date: "2026-04-10",
    meeting_type: "monthly_review",
    agenda: "1. KPIs Mar/26 | 2. Execução de mídia JACQES | 3. Pipeline de clientes | 4. Runway e próximos 90 dias",
    board_deck_url: null,
    financial_report_url: null,
    other_materials: null,
    attendees: ["Rodrigo Energdy", "Miguel (AWQ)", "Danilo (AWQ)"],
    awq_representative: "Miguel (AWQ)",
    minutes_url: null,
    resolutions: [
      { resolution: "Aprovação do orçamento Q2 2026", vote: "unanimous" },
    ],
    action_items: [
      { item: "Enviar cronograma de entregas de mídia para Abr/26", owner: "Miguel (AWQ)", due: "2026-04-15" },
      { item: "Atualizar projeção de runway com burn atualizado", owner: "Rodrigo Energdy", due: "2026-04-20" },
    ],
    status: "completed",
    notes: "Reunião produtiva. Crescimento alinhado com projeções do IC.",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
  },
];

export const SEED_MEDIA_DELIVERABLES: MaMediaDeliverable[] = [
  {
    deliverable_id: "md-001",
    portco_id: "portco-2026-001",
    deliverable_type: "social_media",
    description: "Gestão de redes sociais Energdy — Março 2026 (Instagram + LinkedIn)",
    agreed_value: 8000,
    executing_bu: "JACQES",
    project_ref: "JACQ-ENE-MAR26",
    scheduled_delivery_date: "2026-03-31",
    actual_delivery_date: "2026-03-31",
    status: "approved",
    approved_by_portco: true,
    approval_date: "2026-04-02",
    approval_notes: "Aprovado pelo CEO Rodrigo via e-mail.",
    deliverable_url: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
  },
  {
    deliverable_id: "md-002",
    portco_id: "portco-2026-001",
    deliverable_type: "social_media",
    description: "Gestão de redes sociais Energdy — Abril 2026 (Instagram + LinkedIn)",
    agreed_value: 8000,
    executing_bu: "JACQES",
    project_ref: "JACQ-ENE-ABR26",
    scheduled_delivery_date: "2026-04-30",
    actual_delivery_date: "2026-04-30",
    status: "approved",
    approved_by_portco: true,
    approval_date: "2026-05-03",
    approval_notes: "Aprovado pelo CEO Rodrigo via WhatsApp.",
    deliverable_url: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-05-03T00:00:00Z",
  },
  {
    deliverable_id: "md-003",
    portco_id: "portco-2026-001",
    deliverable_type: "video_production",
    description: "Vídeo institucional Energdy — cases residenciais energia solar",
    agreed_value: 35000,
    executing_bu: "CAZA",
    project_ref: "CAZA-ENE-VID01",
    scheduled_delivery_date: "2026-05-31",
    actual_delivery_date: null,
    status: "in_progress",
    approved_by_portco: false,
    approval_date: null,
    approval_notes: null,
    deliverable_url: null,
    created_at: "2026-04-15T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
];

export const SEED_IC_MEETINGS: MaIcMeeting[] = [
  {
    ic_meeting_id: "icm-001",
    meeting_date: "2026-02-28",
    meeting_type: "deal_review",
    attendees: ["Miguel (AWQ)", "Danilo (AWQ)", "Conselheiro Externo A", "Conselheiro Externo B"],
    deals_reviewed: ["deal-2026-001"],
    minutes_url: null,
    status: "completed",
    created_at: "2026-02-28T00:00:00Z",
  },
];

export const SEED_IC_DECISIONS: MaIcDecisionRecord[] = [
  {
    ic_decision_id: "icd-001",
    ic_meeting_id: "icm-001",
    deal_id: "deal-2026-001",
    decision: "approved",
    decision_date: "2026-02-28",
    votes: [
      { member: "Miguel (AWQ)", vote: "yes" },
      { member: "Danilo (AWQ)", vote: "yes" },
      { member: "Conselheiro Externo A", vote: "yes" },
      { member: "Conselheiro Externo B", vote: "yes" },
    ],
    vote_result: "unanimous",
    decision_rationale:
      "Mercado endereçável grande com tailwinds regulatórios. Equipe técnica sólida. Modelo M4E maximiza impacto de marca e retorno sobre capital de mídia.",
    conditions:
      "Entrega trimestral de KPIs. Relatórios financeiros mensais ao observer AWQ. SHA com tag-along e anti-diluição.",
    created_at: "2026-02-28T00:00:00Z",
  },
];

export const SEED_SYNERGIES: MaSynergyOpportunity[] = [
  {
    synergy_id: "syn-001",
    synergy_type: "cross_selling",
    opportunity_name: "JACQES × Energdy — Clientes em comum",
    description:
      "Clientes corporativos do JACQES com alta pegada de carbono podem ser referenciados para soluções de compensação via Energdy. Pipeline estimado em 40 leads qualificados.",
    source_bu: "JACQES",
    target_bu: null,
    portco_id: "portco-2026-001",
    estimated_revenue_impact: 200000,
    estimated_cost_savings: null,
    status: "in_progress",
    identified_date: "2026-03-15",
    realization_date: null,
    actual_revenue_impact: null,
    actual_cost_savings: null,
    owner: "Miguel (AWQ)",
    notes: "Mapeamento de base de clientes JACQES concluído. Primeiras apresentações agendadas para Mai/26.",
    created_at: "2026-03-15T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
  },
];

export const SEED_INTERCOMPANY: MaIntercompanyTransaction[] = [
  {
    ic_transaction_id: "ict-001",
    transaction_date: "2026-03-31",
    transaction_type: "media_delivery",
    from_entity_type: "bu",
    from_entity_id: "jacqes",
    from_entity_name: "JACQES",
    to_entity_type: "portco",
    to_entity_id: "portco-2026-001",
    to_entity_name: "Grupo Energdy",
    amount: 8000,
    debit_account_code: "4.1.01.001",
    credit_account_code: "1.2.03.001",
    description: "Entrega de mídia — Social Media Mar/26 — JACQ-ENE-MAR26",
    source_system: "ma_module",
    elimination_status: "eliminated",
    elimination_date: "2026-04-05",
    created_at: "2026-04-01T00:00:00Z",
  },
  {
    ic_transaction_id: "ict-002",
    transaction_date: "2026-04-30",
    transaction_type: "media_delivery",
    from_entity_type: "bu",
    from_entity_id: "jacqes",
    from_entity_name: "JACQES",
    to_entity_type: "portco",
    to_entity_id: "portco-2026-001",
    to_entity_name: "Grupo Energdy",
    amount: 8000,
    debit_account_code: "4.1.01.001",
    credit_account_code: "1.2.03.001",
    description: "Entrega de mídia — Social Media Abr/26 — JACQ-ENE-ABR26",
    source_system: "ma_module",
    elimination_status: "eliminated",
    elimination_date: "2026-05-05",
    created_at: "2026-05-01T00:00:00Z",
  },
];

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function listDeals(filters?: {
  pipeline_stage?: string;
  deal_type?: string;
}): Promise<MaDeal[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    let rows = [...SEED_DEALS];
    if (filters?.pipeline_stage) rows = rows.filter(r => r.pipeline_stage === filters.pipeline_stage);
    if (filters?.deal_type) rows = rows.filter(r => r.deal_type === filters.deal_type);
    return rows;
  }

  // Fetch deals and dd items, compute aggregates in JS
  let q = sb.from("ma_deals").select("*").order("created_at", { ascending: false });
  if (filters?.pipeline_stage) q = q.eq("pipeline_stage", filters.pipeline_stage);
  if (filters?.deal_type)      q = q.eq("deal_type", filters.deal_type);
  const { data: deals, error } = await q;

  const { data: ddItems } = await sb.from("ma_due_diligence_items").select("deal_id, completion_pct");
  const ddMap: Record<string, { total: number; completed: number }> = {};
  for (const item of (ddItems ?? [])) {
    if (!ddMap[item.deal_id]) ddMap[item.deal_id] = { total: 0, completed: 0 };
    ddMap[item.deal_id].total += 1;
    if (item.completion_pct === 100) ddMap[item.deal_id].completed += 1;
  }

  return (deals ?? []).map(d => ({
    ...d,
    dd_total_items:     ddMap[d.deal_id]?.total     ?? 0,
    dd_completed_items: ddMap[d.deal_id]?.completed ?? 0,
  })) as MaDeal[];
}

export async function getDeal(deal_id: string): Promise<MaDeal | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_DEALS.find(d => d.deal_id === deal_id) ?? null;

  const { data: deal, error } = await sb
    .from("ma_deals")
    .select("*")
    .eq("deal_id", deal_id)
    .single();
  if (error) return null;

  const { data: ddItems } = await sb
    .from("ma_due_diligence_items")
    .select("completion_pct")
    .eq("deal_id", deal_id);
  const dd_total_items     = (ddItems ?? []).length;
  const dd_completed_items = (ddItems ?? []).filter(i => i.completion_pct === 100).length;

  return { ...deal, dd_total_items, dd_completed_items } as MaDeal;
}

export async function createDeal(data: Partial<MaDeal>): Promise<MaDeal> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_deals")
    .insert({
      deal_code:                    data.deal_code!,
      deal_name:                    data.deal_name!,
      company_name:                 data.company_name!,
      company_website:              data.company_website ?? null,
      industry:                     data.industry ?? null,
      company_stage:                data.company_stage ?? null,
      deal_type:                    data.deal_type ?? "m4e",
      pipeline_stage:               data.pipeline_stage ?? "sourcing",
      lead_source:                  data.lead_source ?? null,
      lead_source_detail:           data.lead_source_detail ?? null,
      market_score:                 data.market_score ?? 0,
      team_score:                   data.team_score ?? 0,
      product_score:                data.product_score ?? 0,
      traction_score:               data.traction_score ?? 0,
      proposed_valuation:           data.proposed_valuation ?? null,
      proposed_investment_amount:   data.proposed_investment_amount ?? null,
      proposed_equity_pct:          data.proposed_equity_pct ?? null,
      media_commitment_value:       data.media_commitment_value ?? null,
      media_delivery_period_months: data.media_delivery_period_months ?? null,
      board_seat:                   data.board_seat ?? false,
      observer_rights:              data.observer_rights ?? false,
      vesting_period_years:         data.vesting_period_years ?? null,
      vesting_cliff_months:         data.vesting_cliff_months ?? null,
      expected_close_date:          data.expected_close_date ?? null,
      deal_lead:                    data.deal_lead ?? null,
      tags:                         data.tags ?? null,
      notes:                        data.notes ?? null,
      created_by:                   data.created_by ?? null,
    })
    .select()
    .single();
  return row as MaDeal;
}

export async function updateDeal(deal_id: string, data: Partial<MaDeal>): Promise<MaDeal> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.deal_name                  != null) updates.deal_name                  = data.deal_name;
  if (data.company_name               != null) updates.company_name               = data.company_name;
  if (data.pipeline_stage             != null) updates.pipeline_stage             = data.pipeline_stage;
  if (data.deal_type                  != null) updates.deal_type                  = data.deal_type;
  if (data.industry                   != null) updates.industry                   = data.industry;
  if (data.company_stage              != null) updates.company_stage              = data.company_stage;
  if (data.market_score               != null) updates.market_score               = data.market_score;
  if (data.team_score                 != null) updates.team_score                 = data.team_score;
  if (data.product_score              != null) updates.product_score              = data.product_score;
  if (data.traction_score             != null) updates.traction_score             = data.traction_score;
  if (data.screening_decision         != null) updates.screening_decision         = data.screening_decision;
  if (data.screening_notes            != null) updates.screening_notes            = data.screening_notes;
  if (data.dd_status                  != null) updates.dd_status                  = data.dd_status;
  if (data.dd_completion_pct          != null) updates.dd_completion_pct          = data.dd_completion_pct;
  if (data.dd_start_date              != null) updates.dd_start_date              = data.dd_start_date;
  if (data.dd_end_date                != null) updates.dd_end_date                = data.dd_end_date;
  if (data.proposed_valuation         != null) updates.proposed_valuation         = data.proposed_valuation;
  if (data.proposed_investment_amount != null) updates.proposed_investment_amount = data.proposed_investment_amount;
  if (data.proposed_equity_pct        != null) updates.proposed_equity_pct        = data.proposed_equity_pct;
  if (data.media_commitment_value     != null) updates.media_commitment_value     = data.media_commitment_value;
  if (data.ic_decision                != null) updates.ic_decision                = data.ic_decision;
  if (data.ic_decision_date           != null) updates.ic_decision_date           = data.ic_decision_date;
  if (data.ic_decision_notes          != null) updates.ic_decision_notes          = data.ic_decision_notes;
  if (data.ic_meeting_date            != null) updates.ic_meeting_date            = data.ic_meeting_date;
  if (data.expected_close_date        != null) updates.expected_close_date        = data.expected_close_date;
  if (data.actual_close_date          != null) updates.actual_close_date          = data.actual_close_date;
  if (data.close_reason               != null) updates.close_reason               = data.close_reason;
  if (data.close_notes                != null) updates.close_notes                = data.close_notes;
  if (data.portco_id                  != null) updates.portco_id                  = data.portco_id;
  if (data.deal_lead                  != null) updates.deal_lead                  = data.deal_lead;
  if (data.notes                      != null) updates.notes                      = data.notes;

  const { data: row, error } = await sb
    .from("ma_deals")
    .update(updates)
    .eq("deal_id", deal_id)
    .select()
    .single();
  return row as MaDeal;
}

// ─── Portfolio Companies ──────────────────────────────────────────────────────

export async function listPortfolioCompanies(filters?: {
  status?: string;
}): Promise<MaPortfolioDashboardRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    let rows = [...SEED_PORTCOS];
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    return rows;
  }

  // Use the dashboard view if it exists; otherwise fall back to base table
  let q = sb.from("v_ma_portfolio_dashboard").select("*").order("investment_date", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  return (data ?? []) as MaPortfolioDashboardRow[];
}

export async function getPortfolioCompany(
  portco_id: string
): Promise<MaPortfolioDashboardRow | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_PORTCOS.find(p => p.portco_id === portco_id) ?? null;
  const { data, error } = await sb
    .from("v_ma_portfolio_dashboard")
    .select("*")
    .eq("portco_id", portco_id)
    .single();
  if (error) return null;
  return data as MaPortfolioDashboardRow;
}

export async function createPortfolioCompany(
  data: Partial<MaPortfolioCompany>
): Promise<MaPortfolioCompany> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_portfolio_companies")
    .insert({
      portco_code:                data.portco_code!,
      legal_name:                 data.legal_name!,
      trade_name:                 data.trade_name ?? null,
      document_number:            data.document_number ?? null,
      deal_id:                    data.deal_id ?? null,
      deal_type:                  data.deal_type ?? "m4e",
      investment_date:            data.investment_date!,
      awq_ownership_pct:          data.awq_ownership_pct ?? null,
      awq_shares_held:            data.awq_shares_held ?? null,
      total_shares_outstanding:   data.total_shares_outstanding ?? null,
      entry_valuation:            data.entry_valuation ?? null,
      current_valuation:          data.current_valuation ?? null,
      valuation_date:             data.valuation_date ?? null,
      media_commitment_value:     data.media_commitment_value ?? null,
      media_delivered_value:      data.media_delivered_value ?? 0,
      media_remaining_value:      data.media_remaining_value ?? null,
      media_delivery_start_date:  data.media_delivery_start_date ?? null,
      media_delivery_end_date:    data.media_delivery_end_date ?? null,
      board_seat:                 data.board_seat ?? false,
      observer_rights:            data.observer_rights ?? false,
      board_meeting_frequency:    data.board_meeting_frequency ?? null,
      company_stage:              data.company_stage ?? null,
      ceo_name:                   data.ceo_name ?? null,
      ceo_email:                  data.ceo_email ?? null,
      ceo_phone:                  data.ceo_phone ?? null,
      website:                    data.website ?? null,
      industry:                   data.industry ?? null,
      sector:                     data.sector ?? null,
      status:                     data.status ?? "active",
      tags:                       data.tags ?? null,
      notes:                      data.notes ?? null,
      created_by:                 data.created_by ?? null,
    })
    .select()
    .single();
  return row as MaPortfolioCompany;
}

export async function updatePortfolioCompany(
  portco_id: string,
  data: Partial<MaPortfolioCompany>
): Promise<MaPortfolioCompany> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.legal_name              != null) updates.legal_name              = data.legal_name;
  if (data.trade_name              != null) updates.trade_name              = data.trade_name;
  if (data.current_valuation       != null) updates.current_valuation       = data.current_valuation;
  if (data.valuation_date          != null) updates.valuation_date          = data.valuation_date;
  if (data.media_delivered_value   != null) updates.media_delivered_value   = data.media_delivered_value;
  if (data.media_remaining_value   != null) updates.media_remaining_value   = data.media_remaining_value;
  if (data.awq_ownership_pct       != null) updates.awq_ownership_pct       = data.awq_ownership_pct;
  if (data.status                  != null) updates.status                  = data.status;
  if (data.exit_date               != null) updates.exit_date               = data.exit_date;
  if (data.exit_type               != null) updates.exit_type               = data.exit_type;
  if (data.exit_valuation          != null) updates.exit_valuation          = data.exit_valuation;
  if (data.exit_proceeds           != null) updates.exit_proceeds           = data.exit_proceeds;
  if (data.ceo_name                != null) updates.ceo_name                = data.ceo_name;
  if (data.ceo_email               != null) updates.ceo_email               = data.ceo_email;
  if (data.ceo_phone               != null) updates.ceo_phone               = data.ceo_phone;
  if (data.website                 != null) updates.website                 = data.website;
  if (data.company_stage           != null) updates.company_stage           = data.company_stage;
  if (data.board_seat              != null) updates.board_seat              = data.board_seat;
  if (data.observer_rights         != null) updates.observer_rights         = data.observer_rights;
  if (data.board_meeting_frequency != null) updates.board_meeting_frequency = data.board_meeting_frequency;
  if (data.notes                   != null) updates.notes                   = data.notes;

  const { data: row, error } = await sb
    .from("ma_portfolio_companies")
    .update(updates)
    .eq("portco_id", portco_id)
    .select()
    .single();
  return row as MaPortfolioCompany;
}

// ─── Due Diligence ────────────────────────────────────────────────────────────

export const SEED_DD_ITEMS: MaDueDiligenceItem[] = [];

export async function listDdItems(deal_id: string): Promise<MaDueDiligenceItem[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_DD_ITEMS.filter(d => d.deal_id === deal_id);
  const { data, error } = await sb
    .from("ma_due_diligence_items")
    .select("*")
    .eq("deal_id", deal_id)
    .order("dd_category", { ascending: true })
    .order("item_name", { ascending: true });
  return (data ?? []) as MaDueDiligenceItem[];
}

export async function createDdItem(
  data: Partial<MaDueDiligenceItem>
): Promise<MaDueDiligenceItem> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_due_diligence_items")
    .insert({
      deal_id:          data.deal_id!,
      dd_category:      data.dd_category ?? "financial",
      item_name:        data.item_name!,
      item_description: data.item_description ?? null,
      status:           data.status ?? "not_started",
      completion_pct:   data.completion_pct ?? 0,
      finding:          data.finding ?? null,
      finding_notes:    data.finding_notes ?? null,
      risk_level:       data.risk_level ?? null,
      documents:        data.documents ?? null,
      assigned_to:      data.assigned_to ?? null,
      due_date:         data.due_date ?? null,
      completed_date:   data.completed_date ?? null,
    })
    .select()
    .single();
  return row as MaDueDiligenceItem;
}

export async function updateDdItem(
  dd_item_id: string,
  data: Partial<MaDueDiligenceItem>
): Promise<MaDueDiligenceItem> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status         != null) updates.status         = data.status;
  if (data.completion_pct != null) updates.completion_pct = data.completion_pct;
  if (data.finding        != null) updates.finding        = data.finding;
  if (data.finding_notes  != null) updates.finding_notes  = data.finding_notes;
  if (data.risk_level     != null) updates.risk_level     = data.risk_level;
  if (data.assigned_to    != null) updates.assigned_to    = data.assigned_to;
  if (data.due_date       != null) updates.due_date       = data.due_date;
  if (data.completed_date != null) updates.completed_date = data.completed_date;

  const { data: row, error } = await sb
    .from("ma_due_diligence_items")
    .update(updates)
    .eq("dd_item_id", dd_item_id)
    .select()
    .single();
  return row as MaDueDiligenceItem;
}

// ─── Cap Table ────────────────────────────────────────────────────────────────

export async function listCapTable(portco_id: string): Promise<MaCapTableEntry[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_CAP_TABLE.filter(c => c.portco_id === portco_id);
  const { data, error } = await sb
    .from("ma_cap_table")
    .select("*")
    .eq("portco_id", portco_id)
    .order("ownership_pct", { ascending: false });
  return (data ?? []) as MaCapTableEntry[];
}

export async function createCapTableEntry(
  data: Partial<MaCapTableEntry>
): Promise<MaCapTableEntry> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_cap_table")
    .insert({
      portco_id:          data.portco_id!,
      shareholder_name:   data.shareholder_name!,
      shareholder_type:   data.shareholder_type ?? null,
      shareholder_entity: data.shareholder_entity ?? null,
      share_class:        data.share_class ?? "common",
      shares_held:        data.shares_held ?? 0,
      ownership_pct:      data.ownership_pct ?? null,
      vesting_schedule:   data.vesting_schedule ?? null,
      vesting_start_date: data.vesting_start_date ?? null,
      vesting_cliff_date: data.vesting_cliff_date ?? null,
      vesting_end_date:   data.vesting_end_date ?? null,
      shares_vested:      data.shares_vested ?? 0,
      shares_unvested:    data.shares_unvested ?? null,
      cost_per_share:     data.cost_per_share ?? null,
      total_cost_basis:   data.total_cost_basis ?? null,
      acquisition_date:   data.acquisition_date ?? null,
      is_active:          data.is_active ?? true,
    })
    .select()
    .single();
  return row as MaCapTableEntry;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function listPortcoKpis(portco_id: string): Promise<MaPortcoKpi[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_KPIS.filter(k => k.portco_id === portco_id);
  const { data, error } = await sb
    .from("ma_portco_kpis")
    .select("*")
    .eq("portco_id", portco_id)
    .order("reporting_date", { ascending: false });
  return (data ?? []) as MaPortcoKpi[];
}

export async function upsertPortcoKpi(data: Partial<MaPortcoKpi>): Promise<MaPortcoKpi> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_portco_kpis")
    .upsert(
      {
        portco_id:            data.portco_id!,
        reporting_date:       data.reporting_date!,
        year_month:           data.year_month ?? null,
        mrr:                  data.mrr ?? null,
        arr:                  data.arr ?? null,
        total_revenue:        data.total_revenue ?? null,
        gross_margin_pct:     data.gross_margin_pct ?? null,
        burn_rate:            data.burn_rate ?? null,
        cash_balance:         data.cash_balance ?? null,
        runway_months:        data.runway_months ?? null,
        mom_growth_pct:       data.mom_growth_pct ?? null,
        yoy_growth_pct:       data.yoy_growth_pct ?? null,
        cac:                  data.cac ?? null,
        ltv:                  data.ltv ?? null,
        ltv_cac_ratio:        data.ltv_cac_ratio ?? null,
        gmv:                  data.gmv ?? null,
        active_users:         data.active_users ?? null,
        new_users:            data.new_users ?? null,
        churn_rate_pct:       data.churn_rate_pct ?? null,
        nps:                  data.nps ?? null,
        headcount:            data.headcount ?? null,
        product_launched:     data.product_launched ?? false,
        funding_round_closed: data.funding_round_closed ?? false,
        notes:                data.notes ?? null,
        submitted_by:         data.submitted_by ?? null,
        updated_at:           new Date().toISOString(),
      },
      { onConflict: "portco_id,reporting_date" }
    )
    .select()
    .single();
  return row as MaPortcoKpi;
}

// ─── Board Meetings ───────────────────────────────────────────────────────────

export async function listBoardMeetings(portco_id: string): Promise<MaBoardMeeting[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_BOARD_MEETINGS.filter(m => m.portco_id === portco_id);
  const { data, error } = await sb
    .from("ma_board_meetings")
    .select("*")
    .eq("portco_id", portco_id)
    .order("meeting_date", { ascending: false });
  return (data ?? []) as MaBoardMeeting[];
}

export async function createBoardMeeting(
  data: Partial<MaBoardMeeting>
): Promise<MaBoardMeeting> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_board_meetings")
    .insert({
      portco_id:            data.portco_id!,
      meeting_date:         data.meeting_date!,
      meeting_type:         data.meeting_type ?? "monthly_review",
      agenda:               data.agenda ?? null,
      board_deck_url:       data.board_deck_url ?? null,
      financial_report_url: data.financial_report_url ?? null,
      other_materials:      data.other_materials ?? null,
      attendees:            data.attendees ?? null,
      awq_representative:   data.awq_representative ?? null,
      minutes_url:          data.minutes_url ?? null,
      resolutions:          data.resolutions ?? null,
      action_items:         data.action_items ?? null,
      status:               data.status ?? "scheduled",
      notes:                data.notes ?? null,
    })
    .select()
    .single();
  return row as MaBoardMeeting;
}

export async function updateBoardMeeting(
  meeting_id: string,
  data: Partial<MaBoardMeeting>
): Promise<MaBoardMeeting> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.meeting_date         != null) updates.meeting_date         = data.meeting_date;
  if (data.agenda               != null) updates.agenda               = data.agenda;
  if (data.board_deck_url       != null) updates.board_deck_url       = data.board_deck_url;
  if (data.financial_report_url != null) updates.financial_report_url = data.financial_report_url;
  if (data.minutes_url          != null) updates.minutes_url          = data.minutes_url;
  if (data.awq_representative   != null) updates.awq_representative   = data.awq_representative;
  if (data.resolutions          != null) updates.resolutions          = data.resolutions;
  if (data.action_items         != null) updates.action_items         = data.action_items;
  if (data.status               != null) updates.status               = data.status;
  if (data.notes                != null) updates.notes                = data.notes;

  const { data: row, error } = await sb
    .from("ma_board_meetings")
    .update(updates)
    .eq("meeting_id", meeting_id)
    .select()
    .single();
  return row as MaBoardMeeting;
}

// ─── Media Deliverables ───────────────────────────────────────────────────────

export async function listMediaDeliverables(
  portco_id: string
): Promise<MaMediaDeliverable[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return SEED_MEDIA_DELIVERABLES.filter(m => m.portco_id === portco_id);
  const { data, error } = await sb
    .from("ma_media_deliverables")
    .select("*")
    .eq("portco_id", portco_id)
    .order("scheduled_delivery_date", { ascending: false });
  return (data ?? []) as MaMediaDeliverable[];
}

export async function createMediaDeliverable(
  data: Partial<MaMediaDeliverable>
): Promise<MaMediaDeliverable> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_media_deliverables")
    .insert({
      portco_id:               data.portco_id!,
      deliverable_type:        data.deliverable_type ?? "other",
      description:             data.description ?? null,
      agreed_value:            data.agreed_value ?? null,
      executing_bu:            data.executing_bu ?? null,
      project_ref:             data.project_ref ?? null,
      scheduled_delivery_date: data.scheduled_delivery_date ?? null,
      actual_delivery_date:    data.actual_delivery_date ?? null,
      status:                  data.status ?? "planned",
      approved_by_portco:      data.approved_by_portco ?? false,
      approval_date:           data.approval_date ?? null,
      approval_notes:          data.approval_notes ?? null,
      deliverable_url:         data.deliverable_url ?? null,
    })
    .select()
    .single();
  return row as MaMediaDeliverable;
}

export async function updateMediaDeliverable(
  deliverable_id: string,
  data: Partial<MaMediaDeliverable>
): Promise<MaMediaDeliverable> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status               != null) updates.status               = data.status;
  if (data.actual_delivery_date != null) updates.actual_delivery_date = data.actual_delivery_date;
  if (data.approved_by_portco   != null) updates.approved_by_portco   = data.approved_by_portco;
  if (data.approval_date        != null) updates.approval_date        = data.approval_date;
  if (data.approval_notes       != null) updates.approval_notes       = data.approval_notes;
  if (data.deliverable_url      != null) updates.deliverable_url      = data.deliverable_url;
  if (data.agreed_value         != null) updates.agreed_value         = data.agreed_value;
  if (data.executing_bu         != null) updates.executing_bu         = data.executing_bu;
  if (data.description          != null) updates.description          = data.description;

  const { data: row, error } = await sb
    .from("ma_media_deliverables")
    .update(updates)
    .eq("deliverable_id", deliverable_id)
    .select()
    .single();
  return row as MaMediaDeliverable;
}

// ─── Intercompany Transactions ────────────────────────────────────────────────

export async function listIntercompanyTransactions(filters?: {
  from_entity_id?: string;
  to_entity_id?: string;
}): Promise<MaIntercompanyTransaction[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    let rows = [...SEED_INTERCOMPANY];
    if (filters?.from_entity_id)
      rows = rows.filter(r => r.from_entity_id === filters.from_entity_id);
    if (filters?.to_entity_id)
      rows = rows.filter(r => r.to_entity_id === filters.to_entity_id);
    return rows;
  }
  let q = sb
    .from("ma_intercompany_transactions")
    .select("*")
    .order("transaction_date", { ascending: false });
  if (filters?.from_entity_id) q = q.eq("from_entity_id", filters.from_entity_id);
  if (filters?.to_entity_id)   q = q.eq("to_entity_id", filters.to_entity_id);
  const { data, error } = await q;
  return (data ?? []) as MaIntercompanyTransaction[];
}

export async function createIntercompanyTransaction(
  data: Partial<MaIntercompanyTransaction>
): Promise<MaIntercompanyTransaction> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_intercompany_transactions")
    .insert({
      transaction_date:     data.transaction_date!,
      transaction_type:     data.transaction_type ?? null,
      from_entity_type:     data.from_entity_type ?? null,
      from_entity_id:       data.from_entity_id ?? null,
      from_entity_name:     data.from_entity_name ?? null,
      to_entity_type:       data.to_entity_type ?? null,
      to_entity_id:         data.to_entity_id ?? null,
      to_entity_name:       data.to_entity_name ?? null,
      amount:               data.amount ?? 0,
      debit_account_code:   data.debit_account_code ?? null,
      credit_account_code:  data.credit_account_code ?? null,
      description:          data.description ?? null,
      source_system:        data.source_system ?? null,
      elimination_status:   data.elimination_status ?? "pending",
      elimination_date:     data.elimination_date ?? null,
    })
    .select()
    .single();
  return row as MaIntercompanyTransaction;
}

// ─── Synergies ────────────────────────────────────────────────────────────────

export async function listSynergies(filters?: {
  portco_id?: string;
  source_bu?: string;
}): Promise<MaSynergyOpportunity[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    let rows = [...SEED_SYNERGIES];
    if (filters?.portco_id) rows = rows.filter(r => r.portco_id === filters.portco_id);
    if (filters?.source_bu) rows = rows.filter(r => r.source_bu === filters.source_bu);
    return rows;
  }
  let q = sb
    .from("ma_synergy_opportunities")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.portco_id) q = q.eq("portco_id", filters.portco_id);
  if (filters?.source_bu) q = q.eq("source_bu", filters.source_bu);
  const { data, error } = await q;
  return (data ?? []) as MaSynergyOpportunity[];
}

export async function createSynergy(
  data: Partial<MaSynergyOpportunity>
): Promise<MaSynergyOpportunity> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_synergy_opportunities")
    .insert({
      synergy_type:              data.synergy_type ?? null,
      opportunity_name:          data.opportunity_name ?? null,
      description:               data.description ?? null,
      source_bu:                 data.source_bu ?? null,
      target_bu:                 data.target_bu ?? null,
      portco_id:                 data.portco_id ?? null,
      estimated_revenue_impact:  data.estimated_revenue_impact ?? null,
      estimated_cost_savings:    data.estimated_cost_savings ?? null,
      status:                    data.status ?? "identified",
      identified_date:           data.identified_date ?? null,
      owner:                     data.owner ?? null,
      notes:                     data.notes ?? null,
    })
    .select()
    .single();
  return row as MaSynergyOpportunity;
}

export async function updateSynergy(
  synergy_id: string,
  data: Partial<MaSynergyOpportunity>
): Promise<MaSynergyOpportunity> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status                   != null) updates.status                   = data.status;
  if (data.realization_date         != null) updates.realization_date         = data.realization_date;
  if (data.actual_revenue_impact    != null) updates.actual_revenue_impact    = data.actual_revenue_impact;
  if (data.actual_cost_savings      != null) updates.actual_cost_savings      = data.actual_cost_savings;
  if (data.estimated_revenue_impact != null) updates.estimated_revenue_impact = data.estimated_revenue_impact;
  if (data.estimated_cost_savings   != null) updates.estimated_cost_savings   = data.estimated_cost_savings;
  if (data.owner                    != null) updates.owner                    = data.owner;
  if (data.notes                    != null) updates.notes                    = data.notes;

  const { data: row, error } = await sb
    .from("ma_synergy_opportunities")
    .update(updates)
    .eq("synergy_id", synergy_id)
    .select()
    .single();
  return row as MaSynergyOpportunity;
}

// ─── IC Meetings ──────────────────────────────────────────────────────────────

export async function listIcMeetings(): Promise<MaIcMeeting[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [...SEED_IC_MEETINGS];
  const { data, error } = await sb
    .from("ma_ic_meetings")
    .select("*")
    .order("meeting_date", { ascending: false });
  return (data ?? []) as MaIcMeeting[];
}

export async function createIcMeeting(
  data: Partial<MaIcMeeting>
): Promise<MaIcMeeting> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_ic_meetings")
    .insert({
      meeting_date:    data.meeting_date!,
      meeting_type:    data.meeting_type ?? "deal_review",
      attendees:       data.attendees ?? null,
      deals_reviewed:  data.deals_reviewed ?? null,
      minutes_url:     data.minutes_url ?? null,
      status:          data.status ?? "scheduled",
    })
    .select()
    .single();
  return row as MaIcMeeting;
}

// ─── IC Decisions ─────────────────────────────────────────────────────────────

export async function listIcDecisions(deal_id?: string): Promise<MaIcDecisionRecord[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    if (deal_id) return SEED_IC_DECISIONS.filter(d => d.deal_id === deal_id);
    return [...SEED_IC_DECISIONS];
  }
  let q = sb
    .from("ma_ic_decisions")
    .select("*")
    .order("decision_date", { ascending: false });
  if (deal_id) q = q.eq("deal_id", deal_id);
  const { data, error } = await q;
  return (data ?? []) as MaIcDecisionRecord[];
}

export async function createIcDecision(
  data: Partial<MaIcDecisionRecord>
): Promise<MaIcDecisionRecord> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb
    .from("ma_ic_decisions")
    .insert({
      ic_meeting_id:       data.ic_meeting_id ?? null,
      deal_id:             data.deal_id!,
      decision:            data.decision ?? "deferred",
      decision_date:       data.decision_date!,
      votes:               data.votes ?? null,
      vote_result:         data.vote_result ?? null,
      decision_rationale:  data.decision_rationale ?? null,
      conditions:          data.conditions ?? null,
    })
    .select()
    .single();
  return row as MaIcDecisionRecord;
}

// ─── Dashboard Totals ─────────────────────────────────────────────────────────

export async function getPortfolioDashboardTotals(): Promise<MaPortfolioDashboardTotals> {
  const portcos = await listPortfolioCompanies();

  const total_portcos = portcos.length;
  const active = portcos.filter(p => p.status === "active");
  const active_portcos = active.length;

  const total_investment = portcos.reduce(
    (sum, p) => sum + (p.entry_valuation ?? 0),
    0
  );
  const total_current_value = portcos.reduce(
    (sum, p) => sum + (p.current_valuation ?? p.entry_valuation ?? 0),
    0
  );
  const total_unrealized_gain = total_current_value - total_investment;

  // Weighted average multiple (weight = entry_valuation)
  const totalWeight = total_investment > 0 ? total_investment : 1;
  const weighted_avg_multiple =
    portcos.reduce((sum, p) => {
      const entry = p.entry_valuation ?? 0;
      const current = p.current_valuation ?? entry;
      const multiple = entry > 0 ? current / entry : 1;
      return sum + multiple * entry;
    }, 0) / totalWeight;

  const total_media_committed = portcos.reduce(
    (sum, p) => sum + (p.media_commitment_value ?? 0),
    0
  );
  const total_media_delivered = portcos.reduce(
    (sum, p) => sum + (p.media_delivered_value ?? 0),
    0
  );
  const media_delivery_pct =
    total_media_committed > 0
      ? Math.round((total_media_delivered / total_media_committed) * 100)
      : 0;

  return {
    total_portcos,
    active_portcos,
    total_investment,
    total_current_value,
    total_unrealized_gain,
    weighted_avg_multiple: Math.round(weighted_avg_multiple * 100) / 100,
    total_media_committed,
    total_media_delivered,
    media_delivery_pct,
  };
}
