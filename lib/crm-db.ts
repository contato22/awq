// ─── AWQ CRM — Database Layer (Supabase Postgres via direct connection) ──────
// Uses sql from lib/db.ts (postgres driver) — requires DATABASE_URL set to the
// Supabase direct connection string. Falls back to seed arrays when unset.

import { sql } from "@/lib/db";
import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity,
  CrmActivity, CrmDashboardMetrics, CrmPipelineMetrics,
} from "@/lib/crm-types";

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────
export async function initCrmDB(): Promise<void> {
  if (!sql) return;
  // Tables are created via awq_crm_full_schema.sql run once in Neon.
  // This function is a no-op placeholder kept for API route parity.
}

// ─── Seed Data (static/no-DB fallback) ───────────────────────────────────────
export const SEED_ACCOUNTS: CrmAccount[] = [];

export const SEED_CONTACTS: CrmContact[] = [];

export const SEED_LEADS: CrmLead[] = [];

export const SEED_OPPORTUNITIES: CrmOpportunity[] = [];

export const SEED_ACTIVITIES: CrmActivity[] = [];

// ─── Account CRUD ─────────────────────────────────────────────────────────────

export async function listAccounts(filters?: { search?: string; account_type?: string; bu?: string; owner?: string }): Promise<CrmAccount[]> {
  if (!sql) {
    let rows = [...SEED_ACCOUNTS];
    if (filters?.account_type) rows = rows.filter(r => r.account_type === filters.account_type);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.account_name.toLowerCase().includes(s) || (r.trade_name ?? "").toLowerCase().includes(s));
    }
    return rows;
  }
  const rows = await sql`
    SELECT a.*,
      COUNT(DISTINCT o.opportunity_id) FILTER (WHERE o.stage NOT IN ('closed_won','closed_lost')) AS open_opportunities,
      MAX(act.created_at) AS last_activity_at
    FROM crm_accounts a
    LEFT JOIN crm_opportunities o   ON o.account_id = a.account_id
    LEFT JOIN crm_activities   act  ON act.related_to_type = 'account' AND act.related_to_id = a.account_id
    WHERE (${filters?.account_type ?? null}::text IS NULL OR a.account_type = ${filters?.account_type ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR a.bu = ${filters?.bu ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR a.owner = ${filters?.owner ?? null})
      AND (${filters?.search ?? null}::text IS NULL
           OR a.account_name ILIKE ${'%' + (filters?.search ?? '') + '%'}
           OR a.trade_name   ILIKE ${'%' + (filters?.search ?? '') + '%'})
    GROUP BY a.account_id
    ORDER BY a.account_name
  `;
  return rows as unknown as CrmAccount[];
}

export async function getAccount(id: string): Promise<CrmAccount | null> {
  if (!sql) return SEED_ACCOUNTS.find(a => a.account_id === id) ?? null;
  const rows = await sql`SELECT * FROM crm_accounts WHERE account_id = ${id}`;
  return (rows[0] as CrmAccount) ?? null;
}

export async function createAccount(data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_accounts (account_name, trade_name, document_number, industry, company_size,
      annual_revenue_estimate, website, linkedin_url, address_street, address_city, address_state,
      address_zip, account_type, owner, health_score, churn_risk, renewal_date, created_by)
    VALUES (${data.account_name!}, ${data.trade_name ?? null}, ${data.document_number ?? null},
      ${data.industry ?? null}, ${data.company_size ?? null}, ${data.annual_revenue_estimate ?? null},
      ${data.website ?? null}, ${data.linkedin_url ?? null}, ${data.address_street ?? null},
      ${data.address_city ?? null}, ${data.address_state ?? null}, ${data.address_zip ?? null},
      ${data.account_type ?? 'prospect'}, ${data.owner ?? 'Miguel'},
      ${data.health_score ?? 70}, ${data.churn_risk ?? 'low'}, ${data.renewal_date ?? null},
      ${data.created_by ?? null})
    RETURNING *
  `;
  return rows[0] as CrmAccount;
}

export async function updateAccount(id: string, data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_accounts SET
      account_name = COALESCE(${data.account_name ?? null}, account_name),
      trade_name   = COALESCE(${data.trade_name ?? null}, trade_name),
      industry     = COALESCE(${data.industry ?? null}, industry),
      company_size = COALESCE(${data.company_size ?? null}, company_size),
      account_type = COALESCE(${data.account_type ?? null}, account_type),
      owner        = COALESCE(${data.owner ?? null}, owner),
      health_score = COALESCE(${data.health_score ?? null}, health_score),
      churn_risk   = COALESCE(${data.churn_risk ?? null}, churn_risk),
      website      = COALESCE(${data.website ?? null}, website),
      address_city = COALESCE(${data.address_city ?? null}, address_city),
      address_state= COALESCE(${data.address_state ?? null}, address_state),
      renewal_date = COALESCE(${data.renewal_date ?? null}, renewal_date),
      updated_at   = NOW()
    WHERE account_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_accounts WHERE account_id = ${id}`;
}

// ─── Contact CRUD ─────────────────────────────────────────────────────────────

export async function listContacts(filters?: { account_id?: string; search?: string }): Promise<CrmContact[]> {
  if (!sql) {
    let rows = [...SEED_CONTACTS];
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.full_name.toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s));
    }
    return rows;
  }
  const rows = await sql`
    SELECT c.*, a.account_name FROM crm_contacts c
    LEFT JOIN crm_accounts a ON a.account_id = c.account_id
    WHERE (${filters?.account_id ?? null}::uuid IS NULL OR c.account_id = ${filters?.account_id ?? null}::uuid)
      AND (${filters?.search ?? null}::text IS NULL
           OR c.full_name ILIKE ${'%' + (filters?.search ?? '') + '%'}
           OR c.email     ILIKE ${'%' + (filters?.search ?? '') + '%'})
    ORDER BY c.full_name
  `;
  return rows as unknown as CrmContact[];
}

export async function createContact(data: Partial<CrmContact>): Promise<CrmContact> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_contacts (account_id, full_name, email, phone, mobile, job_title, department,
      seniority, linkedin_url, is_primary_contact, contact_preferences)
    VALUES (${data.account_id ?? null}, ${data.full_name!}, ${data.email ?? null},
      ${data.phone ?? null}, ${data.mobile ?? null}, ${data.job_title ?? null},
      ${data.department ?? null}, ${data.seniority ?? 'manager'}, ${data.linkedin_url ?? null},
      ${data.is_primary_contact ?? false}, ${data.contact_preferences ?? []})
    RETURNING *
  `;
  return rows[0] as CrmContact;
}

export async function deleteContact(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_contacts WHERE contact_id = ${id}`;
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

export async function listLeads(filters?: { status?: string; bu?: string; assigned_to?: string }): Promise<CrmLead[]> {
  if (!sql) {
    let rows = [...SEED_LEADS];
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.assigned_to) rows = rows.filter(r => r.assigned_to === filters.assigned_to);
    return rows;
  }
  const rows = await sql`
    SELECT * FROM crm_leads
    WHERE (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR bu = ${filters?.bu ?? null})
      AND (${filters?.assigned_to ?? null}::text IS NULL OR assigned_to = ${filters?.assigned_to ?? null})
    ORDER BY created_at DESC
  `;
  return rows as unknown as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  if (!sql) return SEED_LEADS.find(l => l.lead_id === id) ?? null;
  const rows = await sql`SELECT * FROM crm_leads WHERE lead_id = ${id}`;
  return (rows[0] as CrmLead) ?? null;
}

export async function createLead(data: Partial<CrmLead>): Promise<CrmLead> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_leads (lead_source, company_name, contact_name, email, phone, job_title,
      bu, lead_score, status, qualification_notes, bant_budget, bant_authority, bant_need,
      bant_timeline, assigned_to, created_by)
    VALUES (${data.lead_source ?? 'manual'}, ${data.company_name!}, ${data.contact_name!},
      ${data.email ?? null}, ${data.phone ?? null}, ${data.job_title ?? null},
      ${data.bu ?? 'JACQES'}, ${data.lead_score ?? 0}, ${data.status ?? 'new'},
      ${data.qualification_notes ?? null}, ${data.bant_budget ?? null},
      ${data.bant_authority ?? false}, ${data.bant_need ?? null}, ${data.bant_timeline ?? null},
      ${data.assigned_to ?? 'Miguel'}, ${data.created_by ?? null})
    RETURNING *
  `;
  return rows[0] as CrmLead;
}

export async function updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_leads SET
      status              = COALESCE(${data.status ?? null}, status),
      lead_score          = COALESCE(${data.lead_score ?? null}, lead_score),
      qualification_notes = COALESCE(${data.qualification_notes ?? null}, qualification_notes),
      bant_budget         = COALESCE(${data.bant_budget ?? null}, bant_budget),
      bant_authority      = COALESCE(${data.bant_authority ?? null}, bant_authority),
      bant_need           = COALESCE(${data.bant_need ?? null}, bant_need),
      bant_timeline       = COALESCE(${data.bant_timeline ?? null}, bant_timeline),
      assigned_to         = COALESCE(${data.assigned_to ?? null}, assigned_to),
      updated_at          = NOW()
    WHERE lead_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmLead;
}

export async function deleteLead(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_leads WHERE lead_id = ${id}`;
}

export async function getContact(id: string): Promise<CrmContact | null> {
  if (!sql) return SEED_CONTACTS.find(c => c.contact_id === id) ?? null;
  const rows = await sql`
    SELECT c.*, a.account_name FROM crm_contacts c
    LEFT JOIN crm_accounts a ON a.account_id = c.account_id
    WHERE c.contact_id = ${id}
  `;
  return (rows[0] as CrmContact) ?? null;
}

export async function convertLead(leadId: string, oppData: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) {
    const newOpp: CrmOpportunity = {
      opportunity_id: `opp-${leadId}-${Date.now()}`,
      opportunity_code: `OPP-${String(SEED_OPPORTUNITIES.length + 1).padStart(3, "0")}`,
      opportunity_name: oppData.opportunity_name ?? "Nova Oportunidade",
      account_id: null, account_name: undefined, contact_id: null, contact_name: null,
      bu: oppData.bu ?? "JACQES",
      stage: "discovery", deal_value: oppData.deal_value ?? 0, probability: 25,
      expected_close_date: null, actual_close_date: null,
      lost_reason: null, lost_to_competitor: null, win_reason: null,
      owner: oppData.owner ?? "Miguel",
      proposal_sent_date: null, proposal_viewed: false, proposal_accepted: false,
      synced_to_epm: false, epm_customer_id: null, epm_ar_id: null,
      ppm_synced: false, ppm_project_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      created_by: oppData.owner ?? "Miguel",
    };
    return newOpp;
  }
  const opp = await sql`
    INSERT INTO crm_opportunities (opportunity_name, bu, stage, deal_value, probability,
      expected_close_date, owner, created_by)
    VALUES (${oppData.opportunity_name!}, ${oppData.bu ?? 'JACQES'}, 'discovery',
      ${oppData.deal_value ?? 0}, 25, ${oppData.expected_close_date ?? null},
      ${oppData.owner ?? 'Miguel'}, ${oppData.owner ?? 'Miguel'})
    RETURNING *
  `;
  await sql`
    UPDATE crm_leads SET
      status = 'converted',
      converted_to_opportunity_id = ${opp[0].opportunity_id},
      converted_at = NOW(),
      updated_at   = NOW()
    WHERE lead_id = ${leadId}
  `;
  return opp[0] as CrmOpportunity;
}

// ─── Opportunity CRUD ─────────────────────────────────────────────────────────

export async function listOpportunities(filters?: { stage?: string; bu?: string; owner?: string; account_id?: string }): Promise<CrmOpportunity[]> {
  if (!sql) {
    let rows = [...SEED_OPPORTUNITIES];
    if (filters?.stage) rows = rows.filter(r => r.stage === filters.stage);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    return rows;
  }
  const rows = await sql`
    SELECT o.*, a.account_name,
      CONCAT(c.full_name) AS contact_name
    FROM crm_opportunities o
    LEFT JOIN crm_accounts a ON a.account_id = o.account_id
    LEFT JOIN crm_contacts c ON c.contact_id = o.contact_id
    WHERE (${filters?.stage ?? null}::text IS NULL OR o.stage = ${filters?.stage ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR o.bu = ${filters?.bu ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR o.owner = ${filters?.owner ?? null})
      AND (${filters?.account_id ?? null}::uuid IS NULL OR o.account_id = ${filters?.account_id ?? null}::uuid)
    ORDER BY o.created_at DESC
  `;
  return rows as unknown as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  if (!sql) return SEED_OPPORTUNITIES.find(o => o.opportunity_id === id) ?? null;
  const rows = await sql`
    SELECT o.*, a.account_name, c.full_name AS contact_name
    FROM crm_opportunities o
    LEFT JOIN crm_accounts a ON a.account_id = o.account_id
    LEFT JOIN crm_contacts c ON c.contact_id = o.contact_id
    WHERE o.opportunity_id = ${id}
  `;
  return (rows[0] as CrmOpportunity) ?? null;
}

export async function createOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_opportunities (opportunity_name, account_id, contact_id, bu, stage,
      deal_value, expected_close_date, owner, proposal_sent_date, created_by)
    VALUES (${data.opportunity_name!}, ${data.account_id ?? null}, ${data.contact_id ?? null},
      ${data.bu!}, ${data.stage ?? 'discovery'}, ${data.deal_value ?? 0},
      ${data.expected_close_date ?? null}, ${data.owner ?? 'Miguel'},
      ${data.proposal_sent_date ?? null}, ${data.owner ?? 'Miguel'})
    RETURNING *
  `;
  return rows[0] as CrmOpportunity;
}

export async function updateOpportunity(id: string, data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_opportunities SET
      stage               = COALESCE(${data.stage ?? null}, stage),
      deal_value          = COALESCE(${data.deal_value ?? null}, deal_value),
      expected_close_date = COALESCE(${data.expected_close_date ?? null}, expected_close_date),
      lost_reason         = COALESCE(${data.lost_reason ?? null}, lost_reason),
      win_reason          = COALESCE(${data.win_reason ?? null}, win_reason),
      owner               = COALESCE(${data.owner ?? null}, owner),
      proposal_sent_date  = COALESCE(${data.proposal_sent_date ?? null}, proposal_sent_date),
      synced_to_epm       = COALESCE(${data.synced_to_epm ?? null}, synced_to_epm),
      ppm_synced          = COALESCE(${data.ppm_synced ?? null}, ppm_synced),
      ppm_project_id      = COALESCE(${data.ppm_project_id ?? null}, ppm_project_id),
      updated_at          = NOW()
    WHERE opportunity_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmOpportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_opportunities WHERE opportunity_id = ${id}`;
}

// ─── Activity CRUD ────────────────────────────────────────────────────────────

export async function listActivities(filters?: { related_to_type?: string; related_to_id?: string; created_by?: string }): Promise<CrmActivity[]> {
  if (!sql) {
    let rows = [...SEED_ACTIVITIES];
    if (filters?.related_to_type) rows = rows.filter(r => r.related_to_type === filters.related_to_type);
    if (filters?.related_to_id)   rows = rows.filter(r => r.related_to_id === filters.related_to_id);
    if (filters?.created_by)      rows = rows.filter(r => r.created_by === filters.created_by);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const rows = await sql`
    SELECT * FROM crm_activities
    WHERE (${filters?.related_to_type ?? null}::text IS NULL OR related_to_type = ${filters?.related_to_type ?? null})
      AND (${filters?.related_to_id ?? null}::uuid IS NULL OR related_to_id = ${filters?.related_to_id ?? null}::uuid)
      AND (${filters?.created_by ?? null}::text IS NULL OR created_by = ${filters?.created_by ?? null})
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows as unknown as CrmActivity[];
}

export async function createActivity(data: Partial<CrmActivity>): Promise<CrmActivity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_activities (activity_type, related_to_type, related_to_id, subject,
      description, outcome, duration_minutes, scheduled_at, status, created_by)
    VALUES (${data.activity_type!}, ${data.related_to_type!}, ${data.related_to_id!},
      ${data.subject!}, ${data.description ?? null}, ${data.outcome ?? null},
      ${data.duration_minutes ?? null}, ${data.scheduled_at ?? null},
      ${data.status ?? 'scheduled'}, ${data.created_by ?? 'Miguel'})
    RETURNING *
  `;
  return rows[0] as CrmActivity;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPipelineMetrics(): Promise<CrmPipelineMetrics> {
  const opps = await listOpportunities();
  const open = opps.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
  const stages = ['discovery','qualification','proposal','negotiation'];
  const byStage: CrmPipelineMetrics['byStage'] = {};
  for (const stage of stages) {
    const s = open.filter(o => o.stage === stage);
    byStage[stage] = {
      count: s.length,
      value: s.reduce((sum, o) => sum + o.deal_value, 0),
      weighted: s.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    };
  }
  return {
    byStage,
    totalPipeline: open.reduce((sum, o) => sum + o.deal_value, 0),
    weightedForecast: open.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    openDeals: open.length,
  };
}

export async function getDashboardMetrics(): Promise<CrmDashboardMetrics> {
  const [leads, opps, activities] = await Promise.all([
    listLeads(),
    listOpportunities(),
    listActivities(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const open = opps.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
  const wonThisMonth = opps.filter(o => o.stage === 'closed_won' && (o.actual_close_date ?? '') >= monthStart);
  const closedAll = opps.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost');
  const tasksToday = activities.filter(a => a.status === 'scheduled' && a.scheduled_at && a.scheduled_at.slice(0, 10) === today);
  return {
    leadsNew: leads.filter(l => l.status === 'new').length,
    openOpportunities: open.length,
    pipelineValue: open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast: open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    closedWonThisMonth: wonThisMonth.length,
    revenueThisMonth: wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate: closedAll.length > 0 ? Math.round(opps.filter(o => o.stage === 'closed_won').length / closedAll.length * 100) : 0,
    tasksToday,
  };
}
