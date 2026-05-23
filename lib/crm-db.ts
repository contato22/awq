// ─── AWQ CRM — Database Layer (Supabase REST via erpAdmin/erpAnon) ───────────
// Migrated from postgres sql driver to Supabase JS client so the CRM works
// even when DATABASE_URL is absent or has wrong credentials.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity,
  CrmActivity, CrmDashboardMetrics, CrmPipelineMetrics,
} from "@/lib/crm-types";

const db = erpAdmin ?? erpAnon;

function guard() {
  if (!db) throw new Error("Supabase ERP client não configurado");
  return db;
}

export async function initCrmDB(): Promise<void> {}

export const SEED_ACCOUNTS: CrmAccount[]     = [];
export const SEED_CONTACTS: CrmContact[]     = [];
export const SEED_LEADS: CrmLead[]           = [];
export const SEED_OPPORTUNITIES: CrmOpportunity[] = [];
export const SEED_ACTIVITIES: CrmActivity[]  = [];

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function listAccounts(filters?: {
  search?: string; account_type?: string; bu?: string; owner?: string;
}): Promise<CrmAccount[]> {
  const client = guard();
  let q = client.from("crm_accounts").select("*");
  if (filters?.account_type) q = q.eq("account_type", filters.account_type);
  if (filters?.bu)           q = q.eq("bu", filters.bu);
  if (filters?.owner)        q = q.eq("owner", filters.owner);
  if (filters?.search) {
    const s = filters.search.replace(/%/g, "\\%");
    q = q.or(`account_name.ilike.%${s}%,trade_name.ilike.%${s}%`);
  }
  q = q.order("account_name");
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const { data: openOpps } = await client
    .from("crm_opportunities")
    .select("account_id")
    .not("stage", "in", '("closed_won","closed_lost")');

  const counts = new Map<string, number>();
  for (const o of openOpps ?? []) {
    if (o.account_id) counts.set(o.account_id, (counts.get(o.account_id) ?? 0) + 1);
  }

  return (data ?? []).map(a => ({
    ...a,
    open_opportunities: counts.get(a.account_id) ?? 0,
  })) as CrmAccount[];
}

export async function getAccount(id: string): Promise<CrmAccount | null> {
  const { data, error } = await guard()
    .from("crm_accounts").select("*").eq("account_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as CrmAccount | null;
}

export async function createAccount(data: Partial<CrmAccount>): Promise<CrmAccount> {
  const { data: row, error } = await guard()
    .from("crm_accounts")
    .insert({
      account_name:             data.account_name,
      trade_name:               data.trade_name               ?? null,
      document_number:          data.document_number          ?? null,
      industry:                 data.industry                 ?? null,
      company_size:             data.company_size             ?? null,
      annual_revenue_estimate:  data.annual_revenue_estimate  ?? null,
      website:                  data.website                  ?? null,
      linkedin_url:             data.linkedin_url             ?? null,
      address_street:           data.address_street           ?? null,
      address_city:             data.address_city             ?? null,
      address_state:            data.address_state            ?? null,
      address_zip:              data.address_zip              ?? null,
      account_type:             data.account_type             ?? "prospect",
      bu:                       data.bu                       ?? null,
      owner:                    data.owner                    ?? "Miguel",
      health_score:             data.health_score             ?? 70,
      churn_risk:               data.churn_risk               ?? "low",
      renewal_date:             data.renewal_date             ?? null,
      created_by:               data.created_by               ?? null,
    })
    .select().single();
  if (error) throw new Error(error.message);
  return row as CrmAccount;
}

export async function updateAccount(id: string, data: Partial<CrmAccount>): Promise<CrmAccount> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = [
    "account_name","trade_name","industry","company_size","account_type","bu",
    "owner","health_score","churn_risk","website","address_city","address_state","renewal_date",
  ] as const;
  for (const f of fields) if (data[f] !== undefined) patch[f] = data[f];
  const { data: row, error } = await guard()
    .from("crm_accounts").update(patch).eq("account_id", id).select().single();
  if (error) throw new Error(error.message);
  return row as CrmAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await guard().from("crm_accounts").delete().eq("account_id", id);
  if (error) throw new Error(error.message);
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function listContacts(filters?: {
  account_id?: string; search?: string;
}): Promise<CrmContact[]> {
  const client = guard();
  let q = client.from("crm_contacts").select("*");
  if (filters?.account_id) q = q.eq("account_id", filters.account_id);
  if (filters?.search) {
    const s = filters.search.replace(/%/g, "\\%");
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
  }
  q = q.order("full_name");
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const accountIds = [...new Set(rows.map(c => c.account_id).filter(Boolean))];
  if (accountIds.length) {
    const { data: accs } = await client
      .from("crm_accounts").select("account_id,account_name").in("account_id", accountIds);
    const accMap = new Map((accs ?? []).map(a => [a.account_id, a.account_name]));
    return rows.map(c => ({ ...c, account_name: accMap.get(c.account_id) ?? undefined })) as CrmContact[];
  }
  return rows as CrmContact[];
}

export async function getContact(id: string): Promise<CrmContact | null> {
  const { data, error } = await guard()
    .from("crm_contacts").select("*").eq("contact_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (data.account_id) {
    const { data: acc } = await guard()
      .from("crm_accounts").select("account_name").eq("account_id", data.account_id).maybeSingle();
    return { ...data, account_name: acc?.account_name } as CrmContact;
  }
  return data as CrmContact;
}

export async function createContact(data: Partial<CrmContact>): Promise<CrmContact> {
  const { data: row, error } = await guard()
    .from("crm_contacts")
    .insert({
      account_id:          data.account_id          ?? null,
      full_name:           data.full_name,
      email:               data.email               ?? null,
      phone:               data.phone               ?? null,
      mobile:              data.mobile              ?? null,
      job_title:           data.job_title           ?? null,
      department:          data.department          ?? null,
      seniority:           data.seniority           ?? "manager",
      linkedin_url:        data.linkedin_url        ?? null,
      is_primary_contact:  data.is_primary_contact  ?? false,
      contact_preferences: data.contact_preferences ?? [],
    })
    .select().single();
  if (error) throw new Error(error.message);
  return row as CrmContact;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await guard().from("crm_contacts").delete().eq("contact_id", id);
  if (error) throw new Error(error.message);
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function listLeads(filters?: {
  status?: string; bu?: string; assigned_to?: string;
}): Promise<CrmLead[]> {
  let q = guard().from("crm_leads").select("*");
  if (filters?.status)      q = q.eq("status", filters.status);
  if (filters?.bu)          q = q.eq("bu", filters.bu);
  if (filters?.assigned_to) q = q.eq("assigned_to", filters.assigned_to);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  const { data, error } = await guard()
    .from("crm_leads").select("*").eq("lead_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as CrmLead | null;
}

export async function createLead(data: Partial<CrmLead>): Promise<CrmLead> {
  const { data: row, error } = await guard()
    .from("crm_leads")
    .insert({
      lead_source:         data.lead_source         ?? "manual",
      company_name:        data.company_name,
      contact_name:        data.contact_name,
      email:               data.email               ?? null,
      phone:               data.phone               ?? null,
      job_title:           data.job_title           ?? null,
      bu:                  data.bu                  ?? "JACQES",
      lead_score:          data.lead_score          ?? 0,
      status:              data.status              ?? "new",
      qualification_notes: data.qualification_notes ?? null,
      bant_budget:         data.bant_budget         ?? null,
      bant_authority:      data.bant_authority      ?? false,
      bant_need:           data.bant_need           ?? null,
      bant_timeline:       data.bant_timeline       ?? null,
      assigned_to:         data.assigned_to         ?? "Miguel",
      created_by:          data.created_by          ?? null,
    })
    .select().single();
  if (error) throw new Error(error.message);
  return row as CrmLead;
}

export async function updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = [
    "status","lead_score","qualification_notes","bant_budget",
    "bant_authority","bant_need","bant_timeline","assigned_to",
  ] as const;
  for (const f of fields) if (data[f] !== undefined) patch[f] = data[f];
  const { data: row, error } = await guard()
    .from("crm_leads").update(patch).eq("lead_id", id).select().single();
  if (error) throw new Error(error.message);
  return row as CrmLead;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await guard().from("crm_leads").delete().eq("lead_id", id);
  if (error) throw new Error(error.message);
}

export async function convertLead(leadId: string, oppData: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  const client = guard();
  const { data: opp, error: oppErr } = await client
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
    .select().single();
  if (oppErr) throw new Error(oppErr.message);

  await client.from("crm_leads").update({
    status: "converted",
    converted_to_opportunity_id: opp.opportunity_id,
    converted_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }).eq("lead_id", leadId);

  return opp as CrmOpportunity;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listOpportunities(filters?: {
  stage?: string; bu?: string; owner?: string; account_id?: string;
}): Promise<CrmOpportunity[]> {
  const client = guard();
  let q = client.from("crm_opportunities").select("*");
  if (filters?.stage)      q = q.eq("stage", filters.stage);
  if (filters?.bu)         q = q.eq("bu", filters.bu);
  if (filters?.owner)      q = q.eq("owner", filters.owner);
  if (filters?.account_id) q = q.eq("account_id", filters.account_id);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (!rows.length) return [];

  const accountIds = [...new Set(rows.map(o => o.account_id).filter(Boolean))];
  const contactIds = [...new Set(rows.map(o => o.contact_id).filter(Boolean))];
  const [accRes, conRes] = await Promise.all([
    accountIds.length
      ? client.from("crm_accounts").select("account_id,account_name").in("account_id", accountIds)
      : Promise.resolve({ data: [] as { account_id: string; account_name: string }[] }),
    contactIds.length
      ? client.from("crm_contacts").select("contact_id,full_name").in("contact_id", contactIds)
      : Promise.resolve({ data: [] as { contact_id: string; full_name: string }[] }),
  ]);
  const accMap = new Map((accRes.data ?? []).map(a => [a.account_id, a.account_name]));
  const conMap = new Map((conRes.data ?? []).map(c => [c.contact_id, c.full_name]));

  return rows.map(o => ({
    ...o,
    account_name: accMap.get(o.account_id) ?? undefined,
    contact_name: conMap.get(o.contact_id) ?? null,
  })) as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  const client = guard();
  const { data, error } = await client
    .from("crm_opportunities").select("*").eq("opportunity_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const [accRes, conRes] = await Promise.all([
    data.account_id
      ? client.from("crm_accounts").select("account_name").eq("account_id", data.account_id).maybeSingle()
      : Promise.resolve({ data: null }),
    data.contact_id
      ? client.from("crm_contacts").select("full_name").eq("contact_id", data.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...data,
    account_name: accRes.data?.account_name ?? undefined,
    contact_name: conRes.data?.full_name    ?? null,
  } as CrmOpportunity;
}

export async function createOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  const { data: row, error } = await guard()
    .from("crm_opportunities")
    .insert({
      opportunity_name:    data.opportunity_name,
      account_id:          data.account_id          ?? null,
      contact_id:          data.contact_id          ?? null,
      bu:                  data.bu,
      stage:               data.stage               ?? "discovery",
      deal_value:          data.deal_value          ?? 0,
      expected_close_date: data.expected_close_date ?? null,
      owner:               data.owner               ?? "Miguel",
      proposal_sent_date:  data.proposal_sent_date  ?? null,
      created_by:          data.owner               ?? "Miguel",
    })
    .select().single();
  if (error) throw new Error(error.message);
  return row as CrmOpportunity;
}

export async function updateOpportunity(id: string, data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = [
    "opportunity_name","bu","stage","probability","deal_value",
    "expected_close_date","lost_reason","win_reason","owner",
    "proposal_sent_date","synced_to_epm","account_id","contact_id",
  ] as const;
  for (const f of fields) if (data[f] !== undefined) patch[f] = data[f];
  const { data: row, error } = await guard()
    .from("crm_opportunities").update(patch).eq("opportunity_id", id).select().single();
  if (error) throw new Error(error.message);
  return row as CrmOpportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await guard().from("crm_opportunities").delete().eq("opportunity_id", id);
  if (error) throw new Error(error.message);
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function listActivities(filters?: {
  related_to_type?: string; related_to_id?: string; created_by?: string;
}): Promise<CrmActivity[]> {
  let q = guard().from("crm_activities").select("*");
  if (filters?.related_to_type) q = q.eq("related_to_type", filters.related_to_type);
  if (filters?.related_to_id)   q = q.eq("related_to_id",   filters.related_to_id);
  if (filters?.created_by)      q = q.eq("created_by",      filters.created_by);
  q = q.order("created_at", { ascending: false }).limit(100);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as CrmActivity[];
}

export async function createActivity(data: Partial<CrmActivity>): Promise<CrmActivity> {
  const { data: row, error } = await guard()
    .from("crm_activities")
    .insert({
      activity_type:    data.activity_type,
      related_to_type:  data.related_to_type,
      related_to_id:    data.related_to_id,
      subject:          data.subject,
      description:      data.description      ?? null,
      outcome:          data.outcome          ?? null,
      duration_minutes: data.duration_minutes ?? null,
      scheduled_at:     data.scheduled_at     ?? null,
      status:           data.status           ?? "scheduled",
      created_by:       data.created_by       ?? "Miguel",
    })
    .select().single();
  if (error) throw new Error(error.message);
  return row as CrmActivity;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPipelineMetrics(): Promise<CrmPipelineMetrics> {
  const opps = await listOpportunities();
  const open = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const stages = ["discovery", "qualification", "proposal", "negotiation"];
  const byStage: CrmPipelineMetrics["byStage"] = {};
  for (const stage of stages) {
    const s = open.filter(o => o.stage === stage);
    byStage[stage] = {
      count:    s.length,
      value:    s.reduce((sum, o) => sum + o.deal_value, 0),
      weighted: s.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    };
  }
  return {
    byStage,
    totalPipeline:    open.reduce((sum, o) => sum + o.deal_value, 0),
    weightedForecast: open.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    openDeals:        open.length,
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
  const open       = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const wonThisMonth = opps.filter(o => o.stage === "closed_won" && (o.actual_close_date ?? "") >= monthStart);
  const closedAll  = opps.filter(o => o.stage === "closed_won" || o.stage === "closed_lost");
  const tasksToday = activities.filter(a =>
    a.status === "scheduled" && a.scheduled_at && a.scheduled_at.slice(0, 10) === today
  );
  return {
    leadsNew:           leads.filter(l => l.status === "new").length,
    openOpportunities:  open.length,
    pipelineValue:      open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast:   open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    closedWonThisMonth: wonThisMonth.length,
    revenueThisMonth:   wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate:            closedAll.length > 0
      ? Math.round(opps.filter(o => o.stage === "closed_won").length / closedAll.length * 100)
      : 0,
    tasksToday,
  };
}
