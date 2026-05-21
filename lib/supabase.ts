// ─── Supabase Clients ─────────────────────────────────────────────────────────
// Clients exported from one place:
//
//   supabase       — financial DB, service role (bypasses RLS). null if key absent.
//   supabaseClient — financial DB, anon key (browser components, respects RLS).
//   anonClient     — financial DB, anon key (server-side fallback, needs RLS policies).
//
//   erpAdmin       — ERP DB, service role (bypasses RLS). null if key absent.
//   erpAnon        — ERP DB, anon key (server-side; blocked by RLS without policies).
//
// Priority in financial-db.ts: supabase → erpAdmin → sql → erpAnon → JSON

import { createClient } from "@supabase/supabase-js";

// ── Financial DB (gqkgsoglgubmaborixfb) ──────────────────────────────────────
const url     = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
             || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
             || "";

export const supabase       = url && svcKey  ? createClient(url, svcKey)  : null;
export const supabaseClient = url && anonKey ? createClient(url, anonKey) : null;
export const anonClient     = url && anonKey && !svcKey ? createClient(url, anonKey) : null;

// ── ERP DB (kkhxxsrgsewjfvnnssyf) ────────────────────────────────────────────
// Anon key is public (already in pages.yml build config) — hardcoded as fallback.
const ERP_URL      = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL
                  || "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const ERP_SVC_KEY  = process.env.ERP_SUPABASE_SERVICE_ROLE_KEY || "";
const ERP_ANON_KEY = process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY
                  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";

// erpAdmin bypasses RLS — requires ERP_SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.
export const erpAdmin = ERP_URL && ERP_SVC_KEY ? createClient(ERP_URL, ERP_SVC_KEY) : null;
// erpAnon is subject to RLS — works only when RLS is disabled on target tables.
export const erpAnon  = createClient(ERP_URL, ERP_ANON_KEY);

export const USE_SUPABASE      = !!supabase;
export const USE_ERP_ADMIN     = !!erpAdmin;
export const USE_ANON_CLIENT   = !!anonClient || !!erpAdmin || !!erpAnon;
