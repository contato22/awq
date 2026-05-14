// ─── AWQ CRM — Supabase Clients ───────────────────────────────────────────────
// Two clients, both null-safe:
//   supabaseCrm       — server-side, service role key (bypasses RLS).
//                       Use in API routes / Server Actions only. Never expose to browser.
//   supabaseCrmPublic — client-side, anon key (subject to RLS).
//                       Safe to use in browser / React components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url         = process.env.SUPABASE_CRM_URL               ?? "";
const serviceKey  = process.env.SUPABASE_CRM_SERVICE_ROLE_KEY  ?? "";
const anonKey     = process.env.SUPABASE_CRM_ANON_KEY          ?? "";

export const supabaseCrm: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

export const supabaseCrmPublic: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
