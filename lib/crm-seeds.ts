// ─── CRM Seed Data ────────────────────────────────────────────────────────────
// Static fallback arrays — no DB dependency, safe to import from client components.
// crm-db.ts re-exports these for server-side code that needs both.

import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity, CrmActivity,
} from "@/lib/crm-types";

export const SEED_ACCOUNTS: CrmAccount[] = [];
export const SEED_CONTACTS: CrmContact[] = [];
export const SEED_LEADS: CrmLead[] = [];
export const SEED_OPPORTUNITIES: CrmOpportunity[] = [];
export const SEED_ACTIVITIES: CrmActivity[] = [];
