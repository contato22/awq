// ─── ENRD CRM — Facade over Generic CRM ───────────────────────────────────────
//
// ENRD does not have isolated tables — it shares the generic crm_* tables
// (crm_accounts, crm_leads, crm_opportunities, crm_activities) with bu = 'ENRD'.
//
// All write helpers pre-fill bu and default owner so callers don't repeat it.

import {
  listAccounts,   createAccount,   updateAccount,   deleteAccount,
  listLeads,      createLead,      updateLead,      deleteLead,      convertLead,
  listOpportunities, createOpportunity, updateOpportunity, deleteOpportunity,
  listActivities, createActivity,  updateActivity,  deleteActivity,
  getDashboardMetrics,
} from "@/lib/crm-db";

import type {
  CrmAccount, CrmLead, CrmOpportunity, CrmActivity, CrmDashboardMetrics,
} from "@/lib/crm-types";

const BU = "ENRD" as const;

// ─── Accounts ─────────────────────────────────────────────────────────────────

export function listEnrdAccounts(filters?: { search?: string; account_type?: string; owner?: string }) {
  return listAccounts({ ...filters, bu: BU });
}

export function createEnrdAccount(data: Omit<Partial<CrmAccount>, "bu">): Promise<CrmAccount> {
  return createAccount({ ...data, bu: BU });
}

export const updateEnrdAccount = updateAccount;
export const deleteEnrdAccount = deleteAccount;

// ─── Leads ────────────────────────────────────────────────────────────────────

export function listEnrdLeads(filters?: { status?: string; assigned_to?: string }) {
  return listLeads({ ...filters, bu: BU });
}

export function createEnrdLead(data: Omit<Partial<CrmLead>, "bu">): Promise<CrmLead> {
  return createLead({ ...data, bu: BU });
}

export const updateEnrdLead   = updateLead;
export const deleteEnrdLead   = deleteLead;
export const convertEnrdLead  = convertLead;

// ─── Opportunities ────────────────────────────────────────────────────────────

export function listEnrdOpportunities(filters?: { stage?: string; owner?: string; account_id?: string }) {
  return listOpportunities({ ...filters, bu: BU });
}

export function createEnrdOpportunity(data: Omit<Partial<CrmOpportunity>, "bu">): Promise<CrmOpportunity> {
  return createOpportunity({ ...data, bu: BU });
}

export const updateEnrdOpportunity = updateOpportunity;
export const deleteEnrdOpportunity = deleteOpportunity;

// ─── Activities ───────────────────────────────────────────────────────────────

export const listEnrdActivities   = listActivities;
export const createEnrdActivity   = (data: Partial<CrmActivity>) =>
  createActivity({ ...data, created_by: data.created_by ?? "Miguel" });
export const updateEnrdActivity   = updateActivity;
export const deleteEnrdActivity   = deleteActivity;

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getEnrdDashboardMetrics(): Promise<CrmDashboardMetrics> {
  const metrics = await getDashboardMetrics();
  // getDashboardMetrics aggregates all BUs; here we return ENRD-scoped counts
  const [leads, opps] = await Promise.all([
    listEnrdLeads(),
    listEnrdOpportunities(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const open = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const wonThisMonth = opps.filter(o => o.stage === "closed_won" && (o.actual_close_date ?? "") >= monthStart);
  const closedAll = opps.filter(o => o.stage === "closed_won" || o.stage === "closed_lost");
  return {
    leadsNew:            leads.filter(l => l.status === "new").length,
    openOpportunities:   open.length,
    pipelineValue:       open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast:    open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    closedWonThisMonth:  wonThisMonth.length,
    revenueThisMonth:    wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate:             closedAll.length > 0
                           ? Math.round(opps.filter(o => o.stage === "closed_won").length / closedAll.length * 100)
                           : 0,
    tasksToday:          metrics.tasksToday,
  };
}
