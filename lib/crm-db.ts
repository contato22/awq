// ─── AWQ CRM — Database Layer (Supabase) ─────────────────────────────────────
// Uses supabaseCrm from lib/supabase-crm.ts.
// Falls back to empty seed arrays when SUPABASE_CRM_URL / SUPABASE_CRM_ANON_KEY unset.
// Schema is applied via awq_crm_full_schema.sql in the Supabase SQL editor.

import { supabaseCrm } from "@/lib/supabase-crm";
import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity,
  CrmActivity, CrmDashboardMetrics, CrmPipelineMetrics,
} from "@/lib/crm-types";

const db = supabaseCrm;

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────
export async function initCrmDB(): Promise<void> {
  // Tables are created via awq_crm_full_schema.sql run once in Supabase.
}

// ─── Seed Data (no-DB fallback) ───────────────────────────────────────────────
export const SEED_ACCOUNTS: CrmAccount[]      = [];
export const SEED_CONTACTS: CrmContact[]      = [];
export const SEED_LEADS: CrmLead[]            = [];
export const SEED_OPPORTUNITIES: CrmOpportunity[] = [];
export const SEED_ACTIVITIES: CrmActivity[]   = [];

// ─── Account CRUD ─────────────────────────────────────────────────────────────

export async function listAccounts(filters?: {
  search?: string; account_type?: string; bu?: string; owner?: string;
}): Promise<CrmAccount[]> {
  if (!db) {
    let rows = [...SEED_ACCOUNTS];
    if (filters?.account_type) rows = rows.filter(r => r.account_type === filters.account_type);
    if (filters?.bu)           rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner)        rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r =>
        r.account_name.toLowerCase().includes(s) ||
        (r.trade_name ?? "").toLowerCase().includes(s),
      );
    }
    return rows;
  }

  let query = db.from("crm_accounts").select("*").order("account_name");
  if (filters?.account_type) query = query.eq("account_type", filters.account_type);
  if (filters?.bu)           query = query.eq("bu", filters.bu);
  if (filters?.owner)        query = query.eq("owner", filters.owner);
  if (filters?.search) {
    query = query.or(
      `account_name.ilike.%${filters.search}%,trade_name.ilike.%${filters.search}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CrmAccount[];
}

export async function getAccount(id: string): Promise<CrmAccount | null> {
  if (!db) return SEED_ACCOUNTS.find(a => a.account_id === id) ?? null;
  const { data, error } = await db
    .from("crm_accounts")
    .select("*")
    .eq("account_id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CrmAccount | null;
}

export async function createAccount(data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!db) throw new Error("DB not available");
  const { data: row, error } = await db
    .from("crm_accounts")
    .insert({
      account_name:            data.account_name,
      trade_name:              data.trade_name ?? null,
      document_number:         data.document_number ?? null,
      industry:                data.industry ?? null,
      company_size:            data.company_size ?? null,
      annual_revenue_estimate: data.annual_revenue_estimate ?? null,
      website:                 data.website ?? null,
      linkedin_url:            data.linkedin_url ?? null,
      address_street:          data.address_street ?? null,
      address_city:            data.address_city ?? null,
      address_state:           data.address_state ?? null,
      address_zip:             data.address_zip ?? null,
      account_type:            data.account_type ?? "prospect",
      bu:                      data.bu ?? "JACQES",
      owner:                   data.owner ?? "Miguel",
      health_score:            data.health_score ?? 70,
      churn_risk:              data.churn_risk ?? "low",
      renewal_date:            data.renewal_date ?? null,
      created_by:              data.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as CrmAccount;
}

export async function updateAccount(id: string, data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!db) throw new Error("DB not available");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.account_name  != null) patch.account_name  = data.account_name;
  if (data.trade_name    != null) patch.trade_name    = data.trade_name;
  if (data.industry      != null) patch.industry      = data.industry;
  if (data.company_size  != null) patch.company_size  = data.company_size;
  if (data.account_type  != null) patch.account_type  = data.account_type;
  if (data.bu            != null) patch.bu            = data.bu;
  if (data.owner         != null) patch.owner         = data.owner;
  if (data.health_score  != null) patch.health_score  = data.health_score;
  if (data.churn_risk    != null) patch.churn_risk    = data.churn_risk;
  if (data.website       != null) patch.website       = data.website;
  if (data.address_city  != null) patch.address_city  = data.address_city;
  if (data.address_state != null) patch.address_state = data.address_state;
  if (data.renewal_date  != null) patch.renewal_date  = data.renewal_date;

  const { data: row, error } = await db
    .from("crm_accounts")
    .update(patch)
    .eq("account_id", id)
    .select()
    .single();
  if (error) throw error;
  return row as CrmAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  if (!db) throw new Error("DB not available");
  const { error } = await db.from("crm_accounts").delete().eq("account_id", id);
  if (error) throw error;
}

// ─── Contact CRUD ─────────────────────────────────────────────────────────────

export async function listContacts(filters?: {
  account_id?: string; search?: string;
}): Promise<CrmContact[]> {
  if (!db) {
    let rows = [...SEED_CONTACTS];
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r =>
        r.full_name.toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s),
      );
    }
    return rows;
  }

  let query = db
    .from("crm_contacts")
    .select("*, crm_accounts(account_name)")
    .order("full_name");
  if (filters?.account_id) query = query.eq("account_id", filters.account_id);
  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? null,
  })) as unknown as CrmContact[];
}

export async function getContact(id: string): Promise<CrmContact | null> {
  if (!db) return SEED_CONTACTS.find(c => c.contact_id === id) ?? null;
  const { data, error } = await db
    .from("crm_contacts")
    .select("*, crm_accounts(account_name)")
    .eq("contact_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? null,
  } as unknown as CrmContact;
}

export async function createContact(data: Partial<CrmContact>): Promise<CrmContact> {
  if (!db) throw new Error("DB not available");
  const { data: row, error } = await db
    .from("crm_contacts")
    .insert({
      account_id:          data.account_id ?? null,
      full_name:           data.full_name,
      email:               data.email ?? null,
      phone:               data.phone ?? null,
      mobile:              data.mobile ?? null,
      job_title:           data.job_title ?? null,
      department:          data.department ?? null,
      seniority:           data.seniority ?? "manager",
      linkedin_url:        data.linkedin_url ?? null,
      is_primary_contact:  data.is_primary_contact ?? false,
      contact_preferences: data.contact_preferences ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return row as CrmContact;
}

export async function deleteContact(id: string): Promise<void> {
  if (!db) throw new Error("DB not available");
  const { error } = await db.from("crm_contacts").delete().eq("contact_id", id);
  if (error) throw error;
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

export async function listLeads(filters?: {
  status?: string; bu?: string; assigned_to?: string;
}): Promise<CrmLead[]> {
  if (!db) {
    let rows = [...SEED_LEADS];
    if (filters?.status)      rows = rows.filter(r => r.status === filters.status);
    if (filters?.bu)          rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.assigned_to) rows = rows.filter(r => r.assigned_to === filters.assigned_to);
    return rows;
  }

  let query = db.from("crm_leads").select("*").order("created_at", { ascending: false });
  if (filters?.status)      query = query.eq("status", filters.status);
  if (filters?.bu)          query = query.eq("bu", filters.bu);
  if (filters?.assigned_to) query = query.eq("assigned_to", filters.assigned_to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  if (!db) return SEED_LEADS.find(l => l.lead_id === id) ?? null;
  const { data, error } = await db
    .from("crm_leads")
    .select("*")
    .eq("lead_id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CrmLead | null;
}

export async function createLead(data: Partial<CrmLead>): Promise<CrmLead> {
  if (!db) throw new Error("DB not available");
  const { data: row, error } = await db
    .from("crm_leads")
    .insert({
      lead_source:          data.lead_source ?? "manual",
      company_name:         data.company_name,
      contact_name:         data.contact_name,
      email:                data.email ?? null,
      phone:                data.phone ?? null,
      job_title:            data.job_title ?? null,
      bu:                   data.bu ?? "JACQES",
      lead_score:           data.lead_score ?? 0,
      status:               data.status ?? "new",
      qualification_notes:  data.qualification_notes ?? null,
      bant_budget:          data.bant_budget ?? null,
      bant_authority:       data.bant_authority ?? false,
      bant_need:            data.bant_need ?? null,
      bant_timeline:        data.bant_timeline ?? null,
      assigned_to:          data.assigned_to ?? "Miguel",
      created_by:           data.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as CrmLead;
}

export async function updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
  if (!db) throw new Error("DB not available");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status             != null) patch.status             = data.status;
  if (data.lead_score         != null) patch.lead_score         = data.lead_score;
  if (data.qualification_notes!= null) patch.qualification_notes= data.qualification_notes;
  if (data.bant_budget        != null) patch.bant_budget        = data.bant_budget;
  if (data.bant_authority     != null) patch.bant_authority     = data.bant_authority;
  if (data.bant_need          != null) patch.bant_need          = data.bant_need;
  if (data.bant_timeline      != null) patch.bant_timeline      = data.bant_timeline;
  if (data.assigned_to        != null) patch.assigned_to        = data.assigned_to;

  const { data: row, error } = await db
    .from("crm_leads")
    .update(patch)
    .eq("lead_id", id)
    .select()
    .single();
  if (error) throw error;
  return row as CrmLead;
}

export async function deleteLead(id: string): Promise<void> {
  if (!db) throw new Error("DB not available");
  const { error } = await db.from("crm_leads").delete().eq("lead_id", id);
  if (error) throw error;
}

export async function convertLead(
  leadId: string,
  oppData: Partial<CrmOpportunity>,
): Promise<CrmOpportunity> {
  if (!db) {
    return {
      opportunity_id:      `opp-${leadId}-${Date.now()}`,
      opportunity_code:    `OPP-${String(SEED_OPPORTUNITIES.length + 1).padStart(3, "0")}`,
      opportunity_name:    oppData.opportunity_name ?? "Nova Oportunidade",
      account_id: null, account_name: undefined, contact_id: null, contact_name: null,
      bu:                  oppData.bu ?? "JACQES",
      stage: "discovery",  deal_value: oppData.deal_value ?? 0, probability: 25,
      expected_close_date: null, actual_close_date: null,
      lost_reason: null, lost_to_competitor: null, win_reason: null,
      owner:               oppData.owner ?? "Miguel",
      proposal_sent_date: null, proposal_viewed: false, proposal_accepted: false,
      synced_to_epm: false, epm_customer_id: null, epm_ar_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      created_by: oppData.owner ?? "Miguel",
    };
  }

  const { data: opp, error: oppErr } = await db
    .from("crm_opportunities")
    .insert({
      opportunity_name:    oppData.opportunity_name,
      bu:                  oppData.bu ?? "JACQES",
      stage:               "discovery",
      deal_value:          oppData.deal_value ?? 0,
      probability:         25,
      expected_close_date: oppData.expected_close_date ?? null,
      owner:               oppData.owner ?? "Miguel",
      created_by:          oppData.owner ?? "Miguel",
    })
    .select()
    .single();
  if (oppErr) throw oppErr;

  const { error: leadErr } = await db
    .from("crm_leads")
    .update({
      status:                       "converted",
      converted_to_opportunity_id:  opp.opportunity_id,
      converted_at:                 new Date().toISOString(),
      updated_at:                   new Date().toISOString(),
    })
    .eq("lead_id", leadId);
  if (leadErr) throw leadErr;

  return opp as CrmOpportunity;
}

// ─── Opportunity CRUD ─────────────────────────────────────────────────────────

export async function listOpportunities(filters?: {
  stage?: string; bu?: string; owner?: string; account_id?: string;
}): Promise<CrmOpportunity[]> {
  if (!db) {
    let rows = [...SEED_OPPORTUNITIES];
    if (filters?.stage)      rows = rows.filter(r => r.stage === filters.stage);
    if (filters?.bu)         rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner)      rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    return rows;
  }

  let query = db
    .from("crm_opportunities")
    .select("*, crm_accounts(account_name), crm_contacts(full_name)")
    .order("created_at", { ascending: false });
  if (filters?.stage)      query = query.eq("stage", filters.stage);
  if (filters?.bu)         query = query.eq("bu", filters.bu);
  if (filters?.owner)      query = query.eq("owner", filters.owner);
  if (filters?.account_id) query = query.eq("account_id", filters.account_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? null,
    contact_name: (r.crm_contacts as Record<string, unknown> | null)?.full_name ?? null,
  })) as unknown as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  if (!db) return SEED_OPPORTUNITIES.find(o => o.opportunity_id === id) ?? null;
  const { data, error } = await db
    .from("crm_opportunities")
    .select("*, crm_accounts(account_name), crm_contacts(full_name)")
    .eq("opportunity_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? null,
    contact_name: (r.crm_contacts as Record<string, unknown> | null)?.full_name ?? null,
  } as unknown as CrmOpportunity;
}

export async function createOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!db) throw new Error("DB not available");
  const { data: row, error } = await db
    .from("crm_opportunities")
    .insert({
      opportunity_name:    data.opportunity_name,
      account_id:          data.account_id ?? null,
      contact_id:          data.contact_id ?? null,
      bu:                  data.bu,
      stage:               data.stage ?? "discovery",
      deal_value:          data.deal_value ?? 0,
      expected_close_date: data.expected_close_date ?? null,
      owner:               data.owner ?? "Miguel",
      proposal_sent_date:  data.proposal_sent_date ?? null,
      created_by:          data.owner ?? "Miguel",
    })
    .select()
    .single();
  if (error) throw error;
  return row as CrmOpportunity;
}

export async function updateOpportunity(
  id: string,
  data: Partial<CrmOpportunity>,
): Promise<CrmOpportunity> {
  if (!db) throw new Error("DB not available");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.stage               != null) patch.stage               = data.stage;
  if (data.deal_value          != null) patch.deal_value          = data.deal_value;
  if (data.expected_close_date != null) patch.expected_close_date = data.expected_close_date;
  if (data.lost_reason         != null) patch.lost_reason         = data.lost_reason;
  if (data.win_reason          != null) patch.win_reason          = data.win_reason;
  if (data.owner               != null) patch.owner               = data.owner;
  if (data.proposal_sent_date  != null) patch.proposal_sent_date  = data.proposal_sent_date;
  if (data.synced_to_epm       != null) patch.synced_to_epm       = data.synced_to_epm;

  const { data: row, error } = await db
    .from("crm_opportunities")
    .update(patch)
    .eq("opportunity_id", id)
    .select()
    .single();
  if (error) throw error;
  return row as CrmOpportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (!db) throw new Error("DB not available");
  const { error } = await db.from("crm_opportunities").delete().eq("opportunity_id", id);
  if (error) throw error;
}

// ─── Activity CRUD ────────────────────────────────────────────────────────────

export async function listActivities(filters?: {
  related_to_type?: string; related_to_id?: string; created_by?: string;
}): Promise<CrmActivity[]> {
  if (!db) {
    let rows = [...SEED_ACTIVITIES];
    if (filters?.related_to_type) rows = rows.filter(r => r.related_to_type === filters.related_to_type);
    if (filters?.related_to_id)   rows = rows.filter(r => r.related_to_id === filters.related_to_id);
    if (filters?.created_by)      rows = rows.filter(r => r.created_by === filters.created_by);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  let query = db
    .from("crm_activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filters?.related_to_type) query = query.eq("related_to_type", filters.related_to_type);
  if (filters?.related_to_id)   query = query.eq("related_to_id", filters.related_to_id);
  if (filters?.created_by)      query = query.eq("created_by", filters.created_by);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CrmActivity[];
}

export async function createActivity(data: Partial<CrmActivity>): Promise<CrmActivity> {
  if (!db) throw new Error("DB not available");
  const { data: row, error } = await db
    .from("crm_activities")
    .insert({
      activity_type:    data.activity_type,
      related_to_type:  data.related_to_type,
      related_to_id:    data.related_to_id,
      subject:          data.subject,
      description:      data.description ?? null,
      outcome:          data.outcome ?? null,
      duration_minutes: data.duration_minutes ?? null,
      scheduled_at:     data.scheduled_at ?? null,
      status:           data.status ?? "scheduled",
      created_by:       data.created_by ?? "Miguel",
    })
    .select()
    .single();
  if (error) throw error;
  return row as CrmActivity;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPipelineMetrics(): Promise<CrmPipelineMetrics> {
  const opps   = await listOpportunities();
  const open   = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const stages = ["discovery", "qualification", "proposal", "negotiation"];
  const byStage: CrmPipelineMetrics["byStage"] = {};
  for (const stage of stages) {
    const s = open.filter(o => o.stage === stage);
    byStage[stage] = {
      count:    s.length,
      value:    s.reduce((sum, o) => sum + o.deal_value, 0),
      weighted: s.reduce((sum, o) => sum + (o.deal_value * o.probability) / 100, 0),
    };
  }
  return {
    byStage,
    totalPipeline:    open.reduce((sum, o) => sum + o.deal_value, 0),
    weightedForecast: open.reduce((sum, o) => sum + (o.deal_value * o.probability) / 100, 0),
    openDeals: open.length,
  };
}

export async function getDashboardMetrics(): Promise<CrmDashboardMetrics> {
  const [leads, opps, activities] = await Promise.all([
    listLeads(),
    listOpportunities(),
    listActivities(),
  ]);
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const open         = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const wonThisMonth = opps.filter(o => o.stage === "closed_won" && (o.actual_close_date ?? "") >= monthStart);
  const closedAll    = opps.filter(o => o.stage === "closed_won" || o.stage === "closed_lost");
  const tasksToday   = activities.filter(
    a => a.status === "scheduled" && a.scheduled_at && a.scheduled_at.slice(0, 10) === today,
  );
  return {
    leadsNew:           leads.filter(l => l.status === "new").length,
    openOpportunities:  open.length,
    pipelineValue:      open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast:   open.reduce((s, o) => s + (o.deal_value * o.probability) / 100, 0),
    closedWonThisMonth: wonThisMonth.length,
    revenueThisMonth:   wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate:
      closedAll.length > 0
        ? Math.round((opps.filter(o => o.stage === "closed_won").length / closedAll.length) * 100)
        : 0,
    tasksToday,
  };
}
