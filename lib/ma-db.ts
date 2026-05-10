// ─── AWQ M&A & Portfolio Management — Database Layer (Neon Postgres) ──────────
// Uses sql from lib/db.ts — falls back to seed arrays when DATABASE_URL unset.

import { sql } from "@/lib/db";
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
  // Tables and views are created via the M&A SQL schema file run once in Neon.
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
  if (!sql) {
    let rows = [...SEED_DEALS];
    if (filters?.pipeline_stage) rows = rows.filter(r => r.pipeline_stage === filters.pipeline_stage);
    if (filters?.deal_type) rows = rows.filter(r => r.deal_type === filters.deal_type);
    return rows;
  }
  const rows = await sql`
    SELECT d.*,
      COUNT(dd.dd_item_id)                                          AS dd_total_items,
      COUNT(dd.dd_item_id) FILTER (WHERE dd.completion_pct = 100)  AS dd_completed_items
    FROM ma_deals d
    LEFT JOIN ma_due_diligence_items dd ON dd.deal_id = d.deal_id
    WHERE (${filters?.pipeline_stage ?? null}::text IS NULL OR d.pipeline_stage = ${filters?.pipeline_stage ?? null})
      AND (${filters?.deal_type ?? null}::text IS NULL OR d.deal_type = ${filters?.deal_type ?? null})
    GROUP BY d.deal_id
    ORDER BY d.created_at DESC
  `;
  return rows as MaDeal[];
}

export async function getDeal(deal_id: string): Promise<MaDeal | null> {
  if (!sql) return SEED_DEALS.find(d => d.deal_id === deal_id) ?? null;
  const rows = await sql`
    SELECT d.*,
      COUNT(dd.dd_item_id)                                          AS dd_total_items,
      COUNT(dd.dd_item_id) FILTER (WHERE dd.completion_pct = 100)  AS dd_completed_items
    FROM ma_deals d
    LEFT JOIN ma_due_diligence_items dd ON dd.deal_id = d.deal_id
    WHERE d.deal_id = ${deal_id}
    GROUP BY d.deal_id
  `;
  return (rows[0] as MaDeal) ?? null;
}

export async function createDeal(data: Partial<MaDeal>): Promise<MaDeal> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_deals (
      deal_code, deal_name, company_name, company_website, industry, company_stage,
      deal_type, pipeline_stage, lead_source, lead_source_detail,
      market_score, team_score, product_score, traction_score,
      proposed_valuation, proposed_investment_amount, proposed_equity_pct,
      media_commitment_value, media_delivery_period_months,
      board_seat, observer_rights, vesting_period_years, vesting_cliff_months,
      expected_close_date, deal_lead, tags, notes, created_by
    ) VALUES (
      ${data.deal_code!}, ${data.deal_name!}, ${data.company_name!},
      ${data.company_website ?? null}, ${data.industry ?? null}, ${data.company_stage ?? null},
      ${data.deal_type ?? 'm4e'}, ${data.pipeline_stage ?? 'sourcing'},
      ${data.lead_source ?? null}, ${data.lead_source_detail ?? null},
      ${data.market_score ?? 0}, ${data.team_score ?? 0},
      ${data.product_score ?? 0}, ${data.traction_score ?? 0},
      ${data.proposed_valuation ?? null}, ${data.proposed_investment_amount ?? null},
      ${data.proposed_equity_pct ?? null},
      ${data.media_commitment_value ?? null}, ${data.media_delivery_period_months ?? null},
      ${data.board_seat ?? false}, ${data.observer_rights ?? false},
      ${data.vesting_period_years ?? null}, ${data.vesting_cliff_months ?? null},
      ${data.expected_close_date ?? null}, ${data.deal_lead ?? null},
      ${data.tags ? JSON.stringify(data.tags) : null},
      ${data.notes ?? null}, ${data.created_by ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaDeal;
}

export async function updateDeal(deal_id: string, data: Partial<MaDeal>): Promise<MaDeal> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE ma_deals SET
      deal_name                  = COALESCE(${data.deal_name ?? null}, deal_name),
      company_name               = COALESCE(${data.company_name ?? null}, company_name),
      pipeline_stage             = COALESCE(${data.pipeline_stage ?? null}, pipeline_stage),
      deal_type                  = COALESCE(${data.deal_type ?? null}, deal_type),
      industry                   = COALESCE(${data.industry ?? null}, industry),
      company_stage              = COALESCE(${data.company_stage ?? null}, company_stage),
      market_score               = COALESCE(${data.market_score ?? null}, market_score),
      team_score                 = COALESCE(${data.team_score ?? null}, team_score),
      product_score              = COALESCE(${data.product_score ?? null}, product_score),
      traction_score             = COALESCE(${data.traction_score ?? null}, traction_score),
      screening_decision         = COALESCE(${data.screening_decision ?? null}, screening_decision),
      screening_notes            = COALESCE(${data.screening_notes ?? null}, screening_notes),
      dd_status                  = COALESCE(${data.dd_status ?? null}, dd_status),
      dd_completion_pct          = COALESCE(${data.dd_completion_pct ?? null}, dd_completion_pct),
      dd_start_date              = COALESCE(${data.dd_start_date ?? null}, dd_start_date),
      dd_end_date                = COALESCE(${data.dd_end_date ?? null}, dd_end_date),
      proposed_valuation         = COALESCE(${data.proposed_valuation ?? null}, proposed_valuation),
      proposed_investment_amount = COALESCE(${data.proposed_investment_amount ?? null}, proposed_investment_amount),
      proposed_equity_pct        = COALESCE(${data.proposed_equity_pct ?? null}, proposed_equity_pct),
      media_commitment_value     = COALESCE(${data.media_commitment_value ?? null}, media_commitment_value),
      ic_decision                = COALESCE(${data.ic_decision ?? null}, ic_decision),
      ic_decision_date           = COALESCE(${data.ic_decision_date ?? null}, ic_decision_date),
      ic_decision_notes          = COALESCE(${data.ic_decision_notes ?? null}, ic_decision_notes),
      ic_meeting_date            = COALESCE(${data.ic_meeting_date ?? null}, ic_meeting_date),
      expected_close_date        = COALESCE(${data.expected_close_date ?? null}, expected_close_date),
      actual_close_date          = COALESCE(${data.actual_close_date ?? null}, actual_close_date),
      close_reason               = COALESCE(${data.close_reason ?? null}, close_reason),
      close_notes                = COALESCE(${data.close_notes ?? null}, close_notes),
      portco_id                  = COALESCE(${data.portco_id ?? null}, portco_id),
      deal_lead                  = COALESCE(${data.deal_lead ?? null}, deal_lead),
      notes                      = COALESCE(${data.notes ?? null}, notes),
      updated_at                 = NOW()
    WHERE deal_id = ${deal_id}
    RETURNING *
  `;
  return rows[0] as MaDeal;
}

// ─── Portfolio Companies ──────────────────────────────────────────────────────

export async function listPortfolioCompanies(filters?: {
  status?: string;
}): Promise<MaPortfolioDashboardRow[]> {
  if (!sql) {
    let rows = [...SEED_PORTCOS];
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    return rows;
  }
  const rows = await sql`
    SELECT *
    FROM v_ma_portfolio_dashboard
    WHERE (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
    ORDER BY investment_date DESC
  `;
  return rows as MaPortfolioDashboardRow[];
}

export async function getPortfolioCompany(
  portco_id: string
): Promise<MaPortfolioDashboardRow | null> {
  if (!sql) return SEED_PORTCOS.find(p => p.portco_id === portco_id) ?? null;
  const rows = await sql`
    SELECT * FROM v_ma_portfolio_dashboard
    WHERE portco_id = ${portco_id}
  `;
  return (rows[0] as MaPortfolioDashboardRow) ?? null;
}

export async function createPortfolioCompany(
  data: Partial<MaPortfolioCompany>
): Promise<MaPortfolioCompany> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_portfolio_companies (
      portco_code, legal_name, trade_name, document_number, deal_id, deal_type,
      investment_date, awq_ownership_pct, awq_shares_held, total_shares_outstanding,
      entry_valuation, current_valuation, valuation_date,
      media_commitment_value, media_delivered_value, media_remaining_value,
      media_delivery_start_date, media_delivery_end_date,
      board_seat, observer_rights, board_meeting_frequency,
      company_stage, ceo_name, ceo_email, ceo_phone,
      website, industry, sector, status, tags, notes, created_by
    ) VALUES (
      ${data.portco_code!}, ${data.legal_name!}, ${data.trade_name ?? null},
      ${data.document_number ?? null}, ${data.deal_id ?? null}, ${data.deal_type ?? 'm4e'},
      ${data.investment_date!}, ${data.awq_ownership_pct ?? null},
      ${data.awq_shares_held ?? null}, ${data.total_shares_outstanding ?? null},
      ${data.entry_valuation ?? null}, ${data.current_valuation ?? null},
      ${data.valuation_date ?? null},
      ${data.media_commitment_value ?? null}, ${data.media_delivered_value ?? 0},
      ${data.media_remaining_value ?? null},
      ${data.media_delivery_start_date ?? null}, ${data.media_delivery_end_date ?? null},
      ${data.board_seat ?? false}, ${data.observer_rights ?? false},
      ${data.board_meeting_frequency ?? null},
      ${data.company_stage ?? null}, ${data.ceo_name ?? null},
      ${data.ceo_email ?? null}, ${data.ceo_phone ?? null},
      ${data.website ?? null}, ${data.industry ?? null}, ${data.sector ?? null},
      ${data.status ?? 'active'},
      ${data.tags ? JSON.stringify(data.tags) : null},
      ${data.notes ?? null}, ${data.created_by ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaPortfolioCompany;
}

export async function updatePortfolioCompany(
  portco_id: string,
  data: Partial<MaPortfolioCompany>
): Promise<MaPortfolioCompany> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE ma_portfolio_companies SET
      legal_name              = COALESCE(${data.legal_name ?? null}, legal_name),
      trade_name              = COALESCE(${data.trade_name ?? null}, trade_name),
      current_valuation       = COALESCE(${data.current_valuation ?? null}, current_valuation),
      valuation_date          = COALESCE(${data.valuation_date ?? null}, valuation_date),
      media_delivered_value   = COALESCE(${data.media_delivered_value ?? null}, media_delivered_value),
      media_remaining_value   = COALESCE(${data.media_remaining_value ?? null}, media_remaining_value),
      awq_ownership_pct       = COALESCE(${data.awq_ownership_pct ?? null}, awq_ownership_pct),
      status                  = COALESCE(${data.status ?? null}, status),
      exit_date               = COALESCE(${data.exit_date ?? null}, exit_date),
      exit_type               = COALESCE(${data.exit_type ?? null}, exit_type),
      exit_valuation          = COALESCE(${data.exit_valuation ?? null}, exit_valuation),
      exit_proceeds           = COALESCE(${data.exit_proceeds ?? null}, exit_proceeds),
      ceo_name                = COALESCE(${data.ceo_name ?? null}, ceo_name),
      ceo_email               = COALESCE(${data.ceo_email ?? null}, ceo_email),
      ceo_phone               = COALESCE(${data.ceo_phone ?? null}, ceo_phone),
      website                 = COALESCE(${data.website ?? null}, website),
      company_stage           = COALESCE(${data.company_stage ?? null}, company_stage),
      board_seat              = COALESCE(${data.board_seat ?? null}, board_seat),
      observer_rights         = COALESCE(${data.observer_rights ?? null}, observer_rights),
      board_meeting_frequency = COALESCE(${data.board_meeting_frequency ?? null}, board_meeting_frequency),
      notes                   = COALESCE(${data.notes ?? null}, notes),
      updated_at              = NOW()
    WHERE portco_id = ${portco_id}
    RETURNING *
  `;
  return rows[0] as MaPortfolioCompany;
}

// ─── Due Diligence ────────────────────────────────────────────────────────────

export const SEED_DD_ITEMS: MaDueDiligenceItem[] = [];

export async function listDdItems(deal_id: string): Promise<MaDueDiligenceItem[]> {
  if (!sql) return SEED_DD_ITEMS.filter(d => d.deal_id === deal_id);
  const rows = await sql`
    SELECT * FROM ma_due_diligence_items
    WHERE deal_id = ${deal_id}
    ORDER BY dd_category, item_name
  `;
  return rows as MaDueDiligenceItem[];
}

export async function createDdItem(
  data: Partial<MaDueDiligenceItem>
): Promise<MaDueDiligenceItem> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_due_diligence_items (
      deal_id, dd_category, item_name, item_description,
      status, completion_pct, finding, finding_notes, risk_level,
      documents, assigned_to, due_date, completed_date
    ) VALUES (
      ${data.deal_id!}, ${data.dd_category ?? 'financial'}, ${data.item_name!},
      ${data.item_description ?? null}, ${data.status ?? 'not_started'},
      ${data.completion_pct ?? 0}, ${data.finding ?? null},
      ${data.finding_notes ?? null}, ${data.risk_level ?? null},
      ${data.documents ? JSON.stringify(data.documents) : null},
      ${data.assigned_to ?? null}, ${data.due_date ?? null}, ${data.completed_date ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaDueDiligenceItem;
}

export async function updateDdItem(
  dd_item_id: string,
  data: Partial<MaDueDiligenceItem>
): Promise<MaDueDiligenceItem> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE ma_due_diligence_items SET
      status         = COALESCE(${data.status ?? null}, status),
      completion_pct = COALESCE(${data.completion_pct ?? null}, completion_pct),
      finding        = COALESCE(${data.finding ?? null}, finding),
      finding_notes  = COALESCE(${data.finding_notes ?? null}, finding_notes),
      risk_level     = COALESCE(${data.risk_level ?? null}, risk_level),
      assigned_to    = COALESCE(${data.assigned_to ?? null}, assigned_to),
      due_date       = COALESCE(${data.due_date ?? null}, due_date),
      completed_date = COALESCE(${data.completed_date ?? null}, completed_date),
      updated_at     = NOW()
    WHERE dd_item_id = ${dd_item_id}
    RETURNING *
  `;
  return rows[0] as MaDueDiligenceItem;
}

// ─── Cap Table ────────────────────────────────────────────────────────────────

export async function listCapTable(portco_id: string): Promise<MaCapTableEntry[]> {
  if (!sql) return SEED_CAP_TABLE.filter(c => c.portco_id === portco_id);
  const rows = await sql`
    SELECT * FROM ma_cap_table
    WHERE portco_id = ${portco_id}
    ORDER BY ownership_pct DESC NULLS LAST
  `;
  return rows as MaCapTableEntry[];
}

export async function createCapTableEntry(
  data: Partial<MaCapTableEntry>
): Promise<MaCapTableEntry> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_cap_table (
      portco_id, shareholder_name, shareholder_type, shareholder_entity,
      share_class, shares_held, ownership_pct,
      vesting_schedule, vesting_start_date, vesting_cliff_date, vesting_end_date,
      shares_vested, shares_unvested, cost_per_share, total_cost_basis,
      acquisition_date, is_active
    ) VALUES (
      ${data.portco_id!}, ${data.shareholder_name!},
      ${data.shareholder_type ?? null}, ${data.shareholder_entity ?? null},
      ${data.share_class ?? 'common'}, ${data.shares_held ?? 0},
      ${data.ownership_pct ?? null},
      ${data.vesting_schedule ?? null}, ${data.vesting_start_date ?? null},
      ${data.vesting_cliff_date ?? null}, ${data.vesting_end_date ?? null},
      ${data.shares_vested ?? 0}, ${data.shares_unvested ?? null},
      ${data.cost_per_share ?? null}, ${data.total_cost_basis ?? null},
      ${data.acquisition_date ?? null}, ${data.is_active ?? true}
    )
    RETURNING *
  `;
  return rows[0] as MaCapTableEntry;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function listPortcoKpis(portco_id: string): Promise<MaPortcoKpi[]> {
  if (!sql) return SEED_KPIS.filter(k => k.portco_id === portco_id);
  const rows = await sql`
    SELECT * FROM ma_portco_kpis
    WHERE portco_id = ${portco_id}
    ORDER BY reporting_date DESC
  `;
  return rows as MaPortcoKpi[];
}

export async function upsertPortcoKpi(data: Partial<MaPortcoKpi>): Promise<MaPortcoKpi> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_portco_kpis (
      portco_id, reporting_date, year_month,
      mrr, arr, total_revenue, gross_margin_pct,
      burn_rate, cash_balance, runway_months,
      mom_growth_pct, yoy_growth_pct,
      cac, ltv, ltv_cac_ratio, gmv,
      active_users, new_users, churn_rate_pct, nps,
      headcount, product_launched, funding_round_closed,
      notes, submitted_by
    ) VALUES (
      ${data.portco_id!}, ${data.reporting_date!},
      ${data.year_month ?? null},
      ${data.mrr ?? null}, ${data.arr ?? null}, ${data.total_revenue ?? null},
      ${data.gross_margin_pct ?? null},
      ${data.burn_rate ?? null}, ${data.cash_balance ?? null}, ${data.runway_months ?? null},
      ${data.mom_growth_pct ?? null}, ${data.yoy_growth_pct ?? null},
      ${data.cac ?? null}, ${data.ltv ?? null}, ${data.ltv_cac_ratio ?? null},
      ${data.gmv ?? null},
      ${data.active_users ?? null}, ${data.new_users ?? null},
      ${data.churn_rate_pct ?? null}, ${data.nps ?? null},
      ${data.headcount ?? null}, ${data.product_launched ?? false},
      ${data.funding_round_closed ?? false},
      ${data.notes ?? null}, ${data.submitted_by ?? null}
    )
    ON CONFLICT (portco_id, reporting_date) DO UPDATE SET
      year_month            = EXCLUDED.year_month,
      mrr                   = EXCLUDED.mrr,
      arr                   = EXCLUDED.arr,
      total_revenue         = EXCLUDED.total_revenue,
      gross_margin_pct      = EXCLUDED.gross_margin_pct,
      burn_rate             = EXCLUDED.burn_rate,
      cash_balance          = EXCLUDED.cash_balance,
      runway_months         = EXCLUDED.runway_months,
      mom_growth_pct        = EXCLUDED.mom_growth_pct,
      yoy_growth_pct        = EXCLUDED.yoy_growth_pct,
      cac                   = EXCLUDED.cac,
      ltv                   = EXCLUDED.ltv,
      ltv_cac_ratio         = EXCLUDED.ltv_cac_ratio,
      gmv                   = EXCLUDED.gmv,
      active_users          = EXCLUDED.active_users,
      new_users             = EXCLUDED.new_users,
      churn_rate_pct        = EXCLUDED.churn_rate_pct,
      nps                   = EXCLUDED.nps,
      headcount             = EXCLUDED.headcount,
      product_launched      = EXCLUDED.product_launched,
      funding_round_closed  = EXCLUDED.funding_round_closed,
      notes                 = EXCLUDED.notes,
      submitted_by          = EXCLUDED.submitted_by,
      updated_at            = NOW()
    RETURNING *
  `;
  return rows[0] as MaPortcoKpi;
}

// ─── Board Meetings ───────────────────────────────────────────────────────────

export async function listBoardMeetings(portco_id: string): Promise<MaBoardMeeting[]> {
  if (!sql) return SEED_BOARD_MEETINGS.filter(m => m.portco_id === portco_id);
  const rows = await sql`
    SELECT * FROM ma_board_meetings
    WHERE portco_id = ${portco_id}
    ORDER BY meeting_date DESC
  `;
  return rows as MaBoardMeeting[];
}

export async function createBoardMeeting(
  data: Partial<MaBoardMeeting>
): Promise<MaBoardMeeting> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_board_meetings (
      portco_id, meeting_date, meeting_type, agenda,
      board_deck_url, financial_report_url, other_materials,
      attendees, awq_representative, minutes_url,
      resolutions, action_items, status, notes
    ) VALUES (
      ${data.portco_id!}, ${data.meeting_date!},
      ${data.meeting_type ?? 'monthly_review'}, ${data.agenda ?? null},
      ${data.board_deck_url ?? null}, ${data.financial_report_url ?? null},
      ${data.other_materials ? JSON.stringify(data.other_materials) : null},
      ${data.attendees ? JSON.stringify(data.attendees) : null},
      ${data.awq_representative ?? null}, ${data.minutes_url ?? null},
      ${data.resolutions ? JSON.stringify(data.resolutions) : null},
      ${data.action_items ? JSON.stringify(data.action_items) : null},
      ${data.status ?? 'scheduled'}, ${data.notes ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaBoardMeeting;
}

export async function updateBoardMeeting(
  meeting_id: string,
  data: Partial<MaBoardMeeting>
): Promise<MaBoardMeeting> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE ma_board_meetings SET
      meeting_date         = COALESCE(${data.meeting_date ?? null}, meeting_date),
      agenda               = COALESCE(${data.agenda ?? null}, agenda),
      board_deck_url       = COALESCE(${data.board_deck_url ?? null}, board_deck_url),
      financial_report_url = COALESCE(${data.financial_report_url ?? null}, financial_report_url),
      minutes_url          = COALESCE(${data.minutes_url ?? null}, minutes_url),
      awq_representative   = COALESCE(${data.awq_representative ?? null}, awq_representative),
      resolutions          = COALESCE(${data.resolutions ? JSON.stringify(data.resolutions) : null}::jsonb, resolutions),
      action_items         = COALESCE(${data.action_items ? JSON.stringify(data.action_items) : null}::jsonb, action_items),
      status               = COALESCE(${data.status ?? null}, status),
      notes                = COALESCE(${data.notes ?? null}, notes),
      updated_at           = NOW()
    WHERE meeting_id = ${meeting_id}
    RETURNING *
  `;
  return rows[0] as MaBoardMeeting;
}

// ─── Media Deliverables ───────────────────────────────────────────────────────

export async function listMediaDeliverables(
  portco_id: string
): Promise<MaMediaDeliverable[]> {
  if (!sql) return SEED_MEDIA_DELIVERABLES.filter(m => m.portco_id === portco_id);
  const rows = await sql`
    SELECT * FROM ma_media_deliverables
    WHERE portco_id = ${portco_id}
    ORDER BY scheduled_delivery_date DESC
  `;
  return rows as MaMediaDeliverable[];
}

export async function createMediaDeliverable(
  data: Partial<MaMediaDeliverable>
): Promise<MaMediaDeliverable> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_media_deliverables (
      portco_id, deliverable_type, description, agreed_value,
      executing_bu, project_ref,
      scheduled_delivery_date, actual_delivery_date,
      status, approved_by_portco, approval_date, approval_notes, deliverable_url
    ) VALUES (
      ${data.portco_id!}, ${data.deliverable_type ?? 'other'},
      ${data.description ?? null}, ${data.agreed_value ?? null},
      ${data.executing_bu ?? null}, ${data.project_ref ?? null},
      ${data.scheduled_delivery_date ?? null}, ${data.actual_delivery_date ?? null},
      ${data.status ?? 'planned'}, ${data.approved_by_portco ?? false},
      ${data.approval_date ?? null}, ${data.approval_notes ?? null},
      ${data.deliverable_url ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaMediaDeliverable;
}

export async function updateMediaDeliverable(
  deliverable_id: string,
  data: Partial<MaMediaDeliverable>
): Promise<MaMediaDeliverable> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE ma_media_deliverables SET
      status                  = COALESCE(${data.status ?? null}, status),
      actual_delivery_date    = COALESCE(${data.actual_delivery_date ?? null}, actual_delivery_date),
      approved_by_portco      = COALESCE(${data.approved_by_portco ?? null}, approved_by_portco),
      approval_date           = COALESCE(${data.approval_date ?? null}, approval_date),
      approval_notes          = COALESCE(${data.approval_notes ?? null}, approval_notes),
      deliverable_url         = COALESCE(${data.deliverable_url ?? null}, deliverable_url),
      agreed_value            = COALESCE(${data.agreed_value ?? null}, agreed_value),
      executing_bu            = COALESCE(${data.executing_bu ?? null}, executing_bu),
      description             = COALESCE(${data.description ?? null}, description),
      updated_at              = NOW()
    WHERE deliverable_id = ${deliverable_id}
    RETURNING *
  `;
  return rows[0] as MaMediaDeliverable;
}

// ─── Intercompany Transactions ────────────────────────────────────────────────

export async function listIntercompanyTransactions(filters?: {
  from_entity_id?: string;
  to_entity_id?: string;
}): Promise<MaIntercompanyTransaction[]> {
  if (!sql) {
    let rows = [...SEED_INTERCOMPANY];
    if (filters?.from_entity_id)
      rows = rows.filter(r => r.from_entity_id === filters.from_entity_id);
    if (filters?.to_entity_id)
      rows = rows.filter(r => r.to_entity_id === filters.to_entity_id);
    return rows;
  }
  const rows = await sql`
    SELECT * FROM ma_intercompany_transactions
    WHERE (${filters?.from_entity_id ?? null}::text IS NULL OR from_entity_id = ${filters?.from_entity_id ?? null})
      AND (${filters?.to_entity_id ?? null}::text IS NULL OR to_entity_id = ${filters?.to_entity_id ?? null})
    ORDER BY transaction_date DESC
  `;
  return rows as MaIntercompanyTransaction[];
}

export async function createIntercompanyTransaction(
  data: Partial<MaIntercompanyTransaction>
): Promise<MaIntercompanyTransaction> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_intercompany_transactions (
      transaction_date, transaction_type,
      from_entity_type, from_entity_id, from_entity_name,
      to_entity_type, to_entity_id, to_entity_name,
      amount, debit_account_code, credit_account_code,
      description, source_system, elimination_status, elimination_date
    ) VALUES (
      ${data.transaction_date!}, ${data.transaction_type ?? null},
      ${data.from_entity_type ?? null}, ${data.from_entity_id ?? null},
      ${data.from_entity_name ?? null},
      ${data.to_entity_type ?? null}, ${data.to_entity_id ?? null},
      ${data.to_entity_name ?? null},
      ${data.amount ?? 0}, ${data.debit_account_code ?? null},
      ${data.credit_account_code ?? null},
      ${data.description ?? null}, ${data.source_system ?? null},
      ${data.elimination_status ?? 'pending'}, ${data.elimination_date ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaIntercompanyTransaction;
}

// ─── Synergies ────────────────────────────────────────────────────────────────

export async function listSynergies(filters?: {
  portco_id?: string;
  source_bu?: string;
}): Promise<MaSynergyOpportunity[]> {
  if (!sql) {
    let rows = [...SEED_SYNERGIES];
    if (filters?.portco_id) rows = rows.filter(r => r.portco_id === filters.portco_id);
    if (filters?.source_bu) rows = rows.filter(r => r.source_bu === filters.source_bu);
    return rows;
  }
  const rows = await sql`
    SELECT * FROM ma_synergy_opportunities
    WHERE (${filters?.portco_id ?? null}::text IS NULL OR portco_id = ${filters?.portco_id ?? null})
      AND (${filters?.source_bu ?? null}::text IS NULL OR source_bu = ${filters?.source_bu ?? null})
    ORDER BY created_at DESC
  `;
  return rows as MaSynergyOpportunity[];
}

export async function createSynergy(
  data: Partial<MaSynergyOpportunity>
): Promise<MaSynergyOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_synergy_opportunities (
      synergy_type, opportunity_name, description,
      source_bu, target_bu, portco_id,
      estimated_revenue_impact, estimated_cost_savings,
      status, identified_date, owner, notes
    ) VALUES (
      ${data.synergy_type ?? null}, ${data.opportunity_name ?? null},
      ${data.description ?? null},
      ${data.source_bu ?? null}, ${data.target_bu ?? null}, ${data.portco_id ?? null},
      ${data.estimated_revenue_impact ?? null}, ${data.estimated_cost_savings ?? null},
      ${data.status ?? 'identified'}, ${data.identified_date ?? null},
      ${data.owner ?? null}, ${data.notes ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaSynergyOpportunity;
}

export async function updateSynergy(
  synergy_id: string,
  data: Partial<MaSynergyOpportunity>
): Promise<MaSynergyOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE ma_synergy_opportunities SET
      status                   = COALESCE(${data.status ?? null}, status),
      realization_date         = COALESCE(${data.realization_date ?? null}, realization_date),
      actual_revenue_impact    = COALESCE(${data.actual_revenue_impact ?? null}, actual_revenue_impact),
      actual_cost_savings      = COALESCE(${data.actual_cost_savings ?? null}, actual_cost_savings),
      estimated_revenue_impact = COALESCE(${data.estimated_revenue_impact ?? null}, estimated_revenue_impact),
      estimated_cost_savings   = COALESCE(${data.estimated_cost_savings ?? null}, estimated_cost_savings),
      owner                    = COALESCE(${data.owner ?? null}, owner),
      notes                    = COALESCE(${data.notes ?? null}, notes),
      updated_at               = NOW()
    WHERE synergy_id = ${synergy_id}
    RETURNING *
  `;
  return rows[0] as MaSynergyOpportunity;
}

// ─── IC Meetings ──────────────────────────────────────────────────────────────

export async function listIcMeetings(): Promise<MaIcMeeting[]> {
  if (!sql) return [...SEED_IC_MEETINGS];
  const rows = await sql`
    SELECT * FROM ma_ic_meetings
    ORDER BY meeting_date DESC
  `;
  return rows as MaIcMeeting[];
}

export async function createIcMeeting(
  data: Partial<MaIcMeeting>
): Promise<MaIcMeeting> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_ic_meetings (
      meeting_date, meeting_type, attendees,
      deals_reviewed, minutes_url, status
    ) VALUES (
      ${data.meeting_date!}, ${data.meeting_type ?? 'deal_review'},
      ${data.attendees ? JSON.stringify(data.attendees) : null},
      ${data.deals_reviewed ? JSON.stringify(data.deals_reviewed) : null},
      ${data.minutes_url ?? null}, ${data.status ?? 'scheduled'}
    )
    RETURNING *
  `;
  return rows[0] as MaIcMeeting;
}

// ─── IC Decisions ─────────────────────────────────────────────────────────────

export async function listIcDecisions(deal_id?: string): Promise<MaIcDecisionRecord[]> {
  if (!sql) {
    if (deal_id) return SEED_IC_DECISIONS.filter(d => d.deal_id === deal_id);
    return [...SEED_IC_DECISIONS];
  }
  const rows = await sql`
    SELECT * FROM ma_ic_decisions
    WHERE (${deal_id ?? null}::text IS NULL OR deal_id = ${deal_id ?? null})
    ORDER BY decision_date DESC
  `;
  return rows as MaIcDecisionRecord[];
}

export async function createIcDecision(
  data: Partial<MaIcDecisionRecord>
): Promise<MaIcDecisionRecord> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO ma_ic_decisions (
      ic_meeting_id, deal_id, decision, decision_date,
      votes, vote_result, decision_rationale, conditions
    ) VALUES (
      ${data.ic_meeting_id ?? null}, ${data.deal_id!},
      ${data.decision ?? 'deferred'}, ${data.decision_date!},
      ${data.votes ? JSON.stringify(data.votes) : null},
      ${data.vote_result ?? null}, ${data.decision_rationale ?? null},
      ${data.conditions ?? null}
    )
    RETURNING *
  `;
  return rows[0] as MaIcDecisionRecord;
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
