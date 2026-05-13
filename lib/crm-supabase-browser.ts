// ─── AWQ CRM — Browser-safe Supabase client ──────────────────────────────────
// Used by client components on GitHub Pages (static export) where API routes
// are unavailable. Uses the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY).

import { supabase } from "@/lib/supabase";
import type { CrmLead, CrmOpportunity, CrmActivity, CrmAccount, CrmContact } from "@/lib/crm-types";
import { STAGE_PROBABILITY } from "@/lib/crm-types";

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function sbListLeads(filters?: { status?: string; bu?: string }): Promise<CrmLead[]> {
  if (!supabase) return [];
  let q = supabase.from("crm_leads").select("*").order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.bu)     q = q.eq("bu", filters.bu);
  const { data } = await q;
  return (data ?? []) as CrmLead[];
}

export async function sbCreateLead(data: Partial<CrmLead>): Promise<CrmLead | null> {
  if (!supabase) return null;
  const { data: row, error } = await supabase.from("crm_leads").insert({
    lead_source:         data.lead_source ?? "manual",
    company_name:        data.company_name,
    contact_name:        data.contact_name,
    email:               data.email ?? null,
    phone:               data.phone ?? null,
    job_title:           data.job_title ?? null,
    bu:                  data.bu ?? "JACQES",
    lead_score:          data.lead_score ?? 0,
    status:              data.status ?? "new",
    qualification_notes: data.qualification_notes ?? null,
    bant_budget:         data.bant_budget ?? null,
    bant_authority:      data.bant_authority ?? false,
    bant_need:           data.bant_need ?? null,
    bant_timeline:       data.bant_timeline ?? null,
    assigned_to:         data.assigned_to ?? "Miguel",
    created_by:          data.created_by ?? null,
  }).select().single();
  if (error) { console.error("sbCreateLead:", error.message); return null; }
  return row as CrmLead;
}

export async function sbUpdateLead(id: string, patch: Partial<CrmLead>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("crm_leads").update(patch).eq("lead_id", id);
  return !error;
}

export async function sbDeleteLead(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("crm_leads").delete().eq("lead_id", id);
  return !error;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function sbListOpportunities(filters?: { stage?: string; bu?: string }): Promise<CrmOpportunity[]> {
  if (!supabase) return [];
  let q = supabase.from("crm_opportunities").select("*, crm_accounts(account_name)").order("created_at", { ascending: false });
  if (filters?.stage) q = q.eq("stage", filters.stage);
  if (filters?.bu)    q = q.eq("bu", filters.bu);
  const { data } = await q;
  return ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? undefined,
  })) as CrmOpportunity[];
}

export async function sbCreateOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity | null> {
  if (!supabase) return null;
  const stage = data.stage ?? "discovery";
  const { data: row, error } = await supabase.from("crm_opportunities").insert({
    opportunity_name:    data.opportunity_name,
    account_id:          data.account_id ?? null,
    contact_id:          data.contact_id ?? null,
    bu:                  data.bu ?? "JACQES",
    stage,
    deal_value:          data.deal_value ?? 0,
    probability:         STAGE_PROBABILITY[stage as keyof typeof STAGE_PROBABILITY] ?? 25,
    expected_close_date: data.expected_close_date ?? null,
    owner:               data.owner ?? "Miguel",
    proposal_sent_date:  data.proposal_sent_date ?? null,
    created_by:          data.owner ?? "Miguel",
  }).select().single();
  if (error) { console.error("sbCreateOpportunity:", error.message); return null; }
  return row as CrmOpportunity;
}

export async function sbUpdateOpportunity(id: string, patch: Partial<CrmOpportunity>): Promise<boolean> {
  if (!supabase) return false;
  const update: Record<string, unknown> = { ...patch };
  if (patch.stage) update.probability = STAGE_PROBABILITY[patch.stage as keyof typeof STAGE_PROBABILITY] ?? 25;
  const { error } = await supabase.from("crm_opportunities").update(update).eq("opportunity_id", id);
  return !error;
}

export async function sbDeleteOpportunity(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("crm_opportunities").delete().eq("opportunity_id", id);
  return !error;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function sbListContacts(): Promise<CrmContact[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("crm_contacts").select("*, crm_accounts(account_name)").order("full_name");
  return ((data ?? []) as Array<Record<string, unknown>>).map(r => ({
    ...r,
    account_name: (r.crm_accounts as Record<string, unknown> | null)?.account_name ?? undefined,
  })) as CrmContact[];
}

export async function sbCreateContact(data: Partial<CrmContact>): Promise<CrmContact | null> {
  if (!supabase) return null;
  const { data: row, error } = await supabase.from("crm_contacts").insert({
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
  }).select().single();
  if (error) { console.error("sbCreateContact:", error.message); return null; }
  return row as CrmContact;
}

export async function sbDeleteContact(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("crm_contacts").delete().eq("contact_id", id);
  return !error;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function sbListAccounts(): Promise<CrmAccount[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("crm_accounts").select("*").order("account_name");
  return (data ?? []) as CrmAccount[];
}

export async function sbCreateAccount(data: Partial<CrmAccount>): Promise<CrmAccount | null> {
  if (!supabase) return null;
  const { data: row, error } = await supabase.from("crm_accounts").insert({
    account_name:             data.account_name,
    trade_name:               data.trade_name ?? null,
    document_number:          data.document_number ?? null,
    industry:                 data.industry ?? null,
    company_size:             data.company_size ?? null,
    annual_revenue_estimate:  data.annual_revenue_estimate ?? null,
    website:                  data.website ?? null,
    address_city:             data.address_city ?? null,
    address_state:            data.address_state ?? null,
    account_type:             data.account_type ?? "prospect",
    bu:                       data.bu ?? "JACQES",
    owner:                    data.owner ?? "Miguel",
    health_score:             data.health_score ?? 70,
    churn_risk:               data.churn_risk ?? "low",
    created_by:               data.created_by ?? null,
  }).select().single();
  if (error) { console.error("sbCreateAccount:", error.message); return null; }
  return row as CrmAccount;
}

export async function sbDeleteAccount(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("crm_accounts").delete().eq("account_id", id);
  return !error;
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function sbListActivities(filters?: { related_to_type?: string; related_to_id?: string }): Promise<CrmActivity[]> {
  if (!supabase) return [];
  let q = supabase.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(100);
  if (filters?.related_to_type) q = q.eq("related_to_type", filters.related_to_type);
  if (filters?.related_to_id)   q = q.eq("related_to_id",   filters.related_to_id);
  const { data } = await q;
  return (data ?? []) as CrmActivity[];
}

export async function sbCreateActivity(data: Partial<CrmActivity>): Promise<CrmActivity | null> {
  if (!supabase) return null;
  const { data: row, error } = await supabase.from("crm_activities").insert({
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
  }).select().single();
  if (error) { console.error("sbCreateActivity:", error.message); return null; }
  return row as CrmActivity;
}
