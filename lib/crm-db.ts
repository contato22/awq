// ─── AWQ CRM — Database Layer (Supabase) ─────────────────────────────────────
// Server-side operations use getSupabaseAdmin() (service role, bypasses RLS).
// Client-side fallback is in lib/crm-supabase-browser.ts (anon key).

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity,
  CrmActivity, CrmDashboardMetrics, CrmPipelineMetrics,
} from "@/lib/crm-types";
import { STAGE_PROBABILITY } from "@/lib/crm-types";

// ─── Seed Data (no-DB fallback) ───────────────────────────────────────────────
export const SEED_ACCOUNTS: CrmAccount[]     = [];
export const SEED_CONTACTS: CrmContact[]     = [];
export const SEED_LEADS: CrmLead[]           = [];
export const SEED_OPPORTUNITIES: CrmOpportunity[] = [];
export const SEED_ACTIVITIES: CrmActivity[]  = [];

export async function initCrmDB(): Promise<void> { /* tables created via SQL in Supabase dashboard */ }

function db() { return getSupabaseAdmin(); }

// ─── Account CRUD ─────────────────────────────────────────────────────────────

export async function listAccounts(filters?: { search?: string; account_type?: string; bu?: string; owner?: string }): Promise<CrmAccount[]> {
  const sb = db();
  if (!sb) return SEED_ACCOUNTS;
  let q = sb.from("crm_accounts").select("*").order("account_name");
  if (filters?.account_type) q = q.eq("account_type", filters.account_type);
  if (filters?.bu)           q = q.eq("bu", filters.bu);
  if (filters?.owner)        q = q.eq("owner", filters.owner);
  if (filters?.search)       q = q.or(`account_name.ilike.%${filters.search}%,trade_name.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) { console.error("listAccounts:", error.message); return SEED_ACCOUNTS; }
  return (data ?? []) as CrmAccount[];
}

export async function getAccount(id: string): Promise<CrmAccount | null> {
  const sb = db();
  if (!sb) return null;
  const { data } = await sb.from("crm_accounts").select("*").eq("account_id", id).maybeSingle();
  return data as CrmAccount | null;
}

export async function createAccount(data: Partial<CrmAccount>): Promise<CrmAccount> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb.from("crm_accounts").insert({
    account_name: data.account_name,
    trade_name: data.trade_name ?? null,
    document_number: data.document_number ?? null,
    industry: data.industry ?? null,
    company_size: data.company_size ?? null,
    annual_revenue_estimate: data.annual_revenue_estimate ?? null,
    website: data.website ?? null,
    linkedin_url: data.linkedin_url ?? null,
    address_street: data.address_street ?? null,
    address_city: data.address_city ?? null,
    address_state: data.address_state ?? null,
    address_zip: data.address_zip ?? null,
    account_type: data.account_type ?? "prospect",
    bu: data.bu ?? "JACQES",
    owner: data.owner ?? "Miguel",
    health_score: data.health_score ?? 70,
    churn_risk: data.churn_risk ?? "low",
    renewal_date: data.renewal_date ?? null,
    created_by: data.created_by ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return row as CrmAccount;
}

export async function updateAccount(id: string, data: Partial<CrmAccount>): Promise<CrmAccount> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const patch: Record<string, unknown> = {};
  if (data.account_name !== undefined) patch.account_name = data.account_name;
  if (data.trade_name   !== undefined) patch.trade_name   = data.trade_name;
  if (data.industry     !== undefined) patch.industry     = data.industry;
  if (data.company_size !== undefined) patch.company_size = data.company_size;
  if (data.account_type !== undefined) patch.account_type = data.account_type;
  if (data.owner        !== undefined) patch.owner        = data.owner;
  if (data.health_score !== undefined) patch.health_score = data.health_score;
  if (data.churn_risk   !== undefined) patch.churn_risk   = data.churn_risk;
  if (data.website      !== undefined) patch.website      = data.website;
  if (data.address_city !== undefined) patch.address_city = data.address_city;
  if (data.address_state!== undefined) patch.address_state= data.address_state;
  if (data.renewal_date !== undefined) patch.renewal_date = data.renewal_date;
  const { data: row, error } = await sb.from("crm_accounts").update(patch).eq("account_id", id).select().single();
  if (error) throw new Error(error.message);
  return row as CrmAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { error } = await sb.from("crm_accounts").delete().eq("account_id", id);
  if (error) throw new Error(error.message);
}

// ─── Contact CRUD ─────────────────────────────────────────────────────────────

export async function listContacts(filters?: { account_id?: string; search?: string }): Promise<CrmContact[]> {
  const sb = db();
  if (!sb) return SEED_CONTACTS;
  let q = sb.from("crm_contacts").select("*, crm_accounts(account_name)").order("full_name");
  if (filters?.account_id) q = q.eq("account_id", filters.account_id);
  if (filters?.search)     q = q.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) { console.error("listContacts:", error.message); return SEED_CONTACTS; }
  return ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? undefined,
  })) as CrmContact[];
}

export async function getContact(id: string): Promise<CrmContact | null> {
  const sb = db();
  if (!sb) return null;
  const { data } = await sb.from("crm_contacts").select("*, crm_accounts(account_name)").eq("contact_id", id).maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return { ...d, account_name: (d.crm_accounts as Record<string, unknown> | null)?.account_name ?? undefined } as CrmContact;
}

export async function createContact(data: Partial<CrmContact>): Promise<CrmContact> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb.from("crm_contacts").insert({
    account_id: data.account_id ?? null,
    full_name: data.full_name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    mobile: data.mobile ?? null,
    job_title: data.job_title ?? null,
    department: data.department ?? null,
    seniority: data.seniority ?? "manager",
    linkedin_url: data.linkedin_url ?? null,
    is_primary_contact: data.is_primary_contact ?? false,
    contact_preferences: data.contact_preferences ?? [],
  }).select().single();
  if (error) throw new Error(error.message);
  return row as CrmContact;
}

export async function deleteContact(id: string): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { error } = await sb.from("crm_contacts").delete().eq("contact_id", id);
  if (error) throw new Error(error.message);
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

export async function listLeads(filters?: { status?: string; bu?: string; assigned_to?: string }): Promise<CrmLead[]> {
  const sb = db();
  if (!sb) return SEED_LEADS;
  let q = sb.from("crm_leads").select("*").order("created_at", { ascending: false });
  if (filters?.status)      q = q.eq("status", filters.status);
  if (filters?.bu)          q = q.eq("bu", filters.bu);
  if (filters?.assigned_to) q = q.eq("assigned_to", filters.assigned_to);
  const { data, error } = await q;
  if (error) { console.error("listLeads:", error.message); return SEED_LEADS; }
  return (data ?? []) as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  const sb = db();
  if (!sb) return null;
  const { data } = await sb.from("crm_leads").select("*").eq("lead_id", id).maybeSingle();
  return data as CrmLead | null;
}

export async function createLead(data: Partial<CrmLead>): Promise<CrmLead> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb.from("crm_leads").insert({
    lead_source: data.lead_source ?? "manual",
    company_name: data.company_name,
    contact_name: data.contact_name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    job_title: data.job_title ?? null,
    bu: data.bu ?? "JACQES",
    lead_score: data.lead_score ?? 0,
    status: data.status ?? "new",
    qualification_notes: data.qualification_notes ?? null,
    bant_budget: data.bant_budget ?? null,
    bant_authority: data.bant_authority ?? false,
    bant_need: data.bant_need ?? null,
    bant_timeline: data.bant_timeline ?? null,
    assigned_to: data.assigned_to ?? "Miguel",
    created_by: data.created_by ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return row as CrmLead;
}

export async function updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const patch: Record<string, unknown> = {};
  if (data.status              !== undefined) patch.status              = data.status;
  if (data.lead_score          !== undefined) patch.lead_score          = data.lead_score;
  if (data.qualification_notes !== undefined) patch.qualification_notes = data.qualification_notes;
  if (data.bant_budget         !== undefined) patch.bant_budget         = data.bant_budget;
  if (data.bant_authority      !== undefined) patch.bant_authority      = data.bant_authority;
  if (data.bant_need           !== undefined) patch.bant_need           = data.bant_need;
  if (data.bant_timeline       !== undefined) patch.bant_timeline       = data.bant_timeline;
  if (data.assigned_to         !== undefined) patch.assigned_to         = data.assigned_to;
  const { data: row, error } = await sb.from("crm_leads").update(patch).eq("lead_id", id).select().single();
  if (error) throw new Error(error.message);
  return row as CrmLead;
}

export async function deleteLead(id: string): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { error } = await sb.from("crm_leads").delete().eq("lead_id", id);
  if (error) throw new Error(error.message);
}

export async function convertLead(leadId: string, oppData: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { data: opp, error: oppErr } = await sb.from("crm_opportunities").insert({
    opportunity_name: oppData.opportunity_name,
    bu: oppData.bu ?? "JACQES",
    stage: "discovery",
    deal_value: oppData.deal_value ?? 0,
    probability: 25,
    expected_close_date: oppData.expected_close_date ?? null,
    owner: oppData.owner ?? "Miguel",
    created_by: oppData.owner ?? "Miguel",
  }).select().single();
  if (oppErr) throw new Error(oppErr.message);
  await sb.from("crm_leads").update({
    status: "converted",
    converted_to_opportunity_id: (opp as CrmOpportunity).opportunity_id,
    converted_at: new Date().toISOString(),
  }).eq("lead_id", leadId);
  return opp as CrmOpportunity;
}

// ─── Opportunity CRUD ─────────────────────────────────────────────────────────

export async function listOpportunities(filters?: { stage?: string; bu?: string; owner?: string; account_id?: string }): Promise<CrmOpportunity[]> {
  const sb = db();
  if (!sb) return SEED_OPPORTUNITIES;
  let q = sb.from("crm_opportunities")
    .select("*, crm_accounts(account_name), crm_contacts(full_name)")
    .order("created_at", { ascending: false });
  if (filters?.stage)      q = q.eq("stage", filters.stage);
  if (filters?.bu)         q = q.eq("bu", filters.bu);
  if (filters?.owner)      q = q.eq("owner", filters.owner);
  if (filters?.account_id) q = q.eq("account_id", filters.account_id);
  const { data, error } = await q;
  if (error) { console.error("listOpportunities:", error.message); return SEED_OPPORTUNITIES; }
  return ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? undefined,
    contact_name: (r.crm_contacts as Record<string, unknown> | null)?.full_name ?? null,
  })) as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  const sb = db();
  if (!sb) return null;
  const { data } = await sb.from("crm_opportunities")
    .select("*, crm_accounts(account_name), crm_contacts(full_name)")
    .eq("opportunity_id", id).maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    ...d,
    account_name: (d.crm_accounts as Record<string, unknown> | null)?.account_name ?? undefined,
    contact_name: (d.crm_contacts as Record<string, unknown> | null)?.full_name ?? null,
  } as CrmOpportunity;
}

export async function createOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const stage = data.stage ?? "discovery";
  const { data: row, error } = await sb.from("crm_opportunities").insert({
    opportunity_name: data.opportunity_name,
    account_id: data.account_id ?? null,
    contact_id: data.contact_id ?? null,
    bu: data.bu,
    stage,
    deal_value: data.deal_value ?? 0,
    probability: STAGE_PROBABILITY[stage as keyof typeof STAGE_PROBABILITY] ?? 25,
    expected_close_date: data.expected_close_date ?? null,
    owner: data.owner ?? "Miguel",
    proposal_sent_date: data.proposal_sent_date ?? null,
    created_by: data.owner ?? "Miguel",
  }).select().single();
  if (error) throw new Error(error.message);
  return row as CrmOpportunity;
}

export async function updateOpportunity(id: string, data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const patch: Record<string, unknown> = {};
  if (data.stage               !== undefined) { patch.stage = data.stage; patch.probability = STAGE_PROBABILITY[data.stage as keyof typeof STAGE_PROBABILITY] ?? 25; }
  if (data.deal_value          !== undefined) patch.deal_value          = data.deal_value;
  if (data.expected_close_date !== undefined) patch.expected_close_date = data.expected_close_date;
  if (data.actual_close_date   !== undefined) patch.actual_close_date   = data.actual_close_date;
  if (data.lost_reason         !== undefined) patch.lost_reason         = data.lost_reason;
  if (data.win_reason          !== undefined) patch.win_reason          = data.win_reason;
  if (data.owner               !== undefined) patch.owner               = data.owner;
  if (data.proposal_sent_date  !== undefined) patch.proposal_sent_date  = data.proposal_sent_date;
  if (data.synced_to_epm       !== undefined) patch.synced_to_epm       = data.synced_to_epm;
  const { data: row, error } = await sb.from("crm_opportunities").update(patch).eq("opportunity_id", id).select().single();
  if (error) throw new Error(error.message);
  return row as CrmOpportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { error } = await sb.from("crm_opportunities").delete().eq("opportunity_id", id);
  if (error) throw new Error(error.message);
}

// ─── Activity CRUD ────────────────────────────────────────────────────────────

export async function listActivities(filters?: { related_to_type?: string; related_to_id?: string; created_by?: string }): Promise<CrmActivity[]> {
  const sb = db();
  if (!sb) return SEED_ACTIVITIES;
  let q = sb.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(100);
  if (filters?.related_to_type) q = q.eq("related_to_type", filters.related_to_type);
  if (filters?.related_to_id)   q = q.eq("related_to_id",   filters.related_to_id);
  if (filters?.created_by)      q = q.eq("created_by",      filters.created_by);
  const { data, error } = await q;
  if (error) { console.error("listActivities:", error.message); return SEED_ACTIVITIES; }
  return (data ?? []) as CrmActivity[];
}

export async function createActivity(data: Partial<CrmActivity>): Promise<CrmActivity> {
  const sb = db();
  if (!sb) throw new Error("DB not available");
  const { data: row, error } = await sb.from("crm_activities").insert({
    activity_type: data.activity_type,
    related_to_type: data.related_to_type,
    related_to_id: data.related_to_id,
    subject: data.subject,
    description: data.description ?? null,
    outcome: data.outcome ?? null,
    duration_minutes: data.duration_minutes ?? null,
    scheduled_at: data.scheduled_at ?? null,
    status: data.status ?? "scheduled",
    created_by: data.created_by ?? "Miguel",
  }).select().single();
  if (error) throw new Error(error.message);
  return row as CrmActivity;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPipelineMetrics(): Promise<CrmPipelineMetrics> {
  const opps = await listOpportunities();
  const open = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const stages = ["discovery","qualification","proposal","negotiation"];
  const byStage: CrmPipelineMetrics["byStage"] = {};
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
    totalPipeline: open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast: open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    openDeals: open.length,
  };
}

export async function getDashboardMetrics(): Promise<CrmDashboardMetrics> {
  const [leads, opps, activities] = await Promise.all([listLeads(), listOpportunities(), listActivities()]);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const open = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const wonThisMonth = opps.filter(o => o.stage === "closed_won" && (o.actual_close_date ?? "") >= monthStart);
  const closedAll = opps.filter(o => o.stage === "closed_won" || o.stage === "closed_lost");
  const tasksToday = activities.filter(a => a.status === "scheduled" && a.scheduled_at && a.scheduled_at.slice(0, 10) === today);
  return {
    leadsNew: leads.filter(l => l.status === "new").length,
    openOpportunities: open.length,
    pipelineValue: open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast: open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    closedWonThisMonth: wonThisMonth.length,
    revenueThisMonth: wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate: closedAll.length > 0 ? Math.round(opps.filter(o => o.stage === "closed_won").length / closedAll.length * 100) : 0,
    tasksToday,
  };
}
