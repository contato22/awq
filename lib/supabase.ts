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

// In static export builds (GitHub Pages), ALL clients are null so no network
// calls happen during prerender. Client-side code that needs Supabase should
// check USE_SUPABASE / USE_ERP_ADMIN before calling.
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// Next.js 14 caches fetch() calls in Server Components by default (force-cache).
// Supabase JS client uses fetch internally — without cache: 'no-store', Server
// Component reads return stale/empty data even when the DB has fresh rows.
// All server-side clients use this fetch wrapper to bypass the Data Cache.
const noStoreFetch: typeof fetch = (url, init) =>
  fetch(url, { ...init, cache: "no-store" });

// ── Financial DB (gqkgsoglgubmaborixfb) ──────────────────────────────────────
const url     = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
             || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
             || "";

const _opts = { global: { fetch: noStoreFetch } };

export const supabase       = !IS_STATIC && url && svcKey  ? createClient(url, svcKey,  _opts) : null;
export const supabaseClient = !IS_STATIC && url && anonKey ? createClient(url, anonKey)        : null; // browser only
export const anonClient     = !IS_STATIC && url && anonKey && !svcKey ? createClient(url, anonKey, _opts) : null;

// ── ERP DB (kkhxxsrgsewjfvnnssyf) ────────────────────────────────────────────
// Anon key is public (already in pages.yml build config) — hardcoded as fallback.
const ERP_URL      = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL
                  || "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const ERP_SVC_KEY  = process.env.ERP_SUPABASE_SERVICE_ROLE_KEY || "";
const ERP_ANON_KEY = process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY
                  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";

// erpAdmin bypasses RLS — requires ERP_SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.
export const erpAdmin = !IS_STATIC && ERP_URL && ERP_SVC_KEY ? createClient(ERP_URL, ERP_SVC_KEY, _opts) : null;
// erpAnon: null in static builds to prevent prerender connections; initialized at runtime only.
export const erpAnon  = IS_STATIC ? null : createClient(ERP_URL, ERP_ANON_KEY, _opts);

export const USE_SUPABASE      = !!supabase;
export const USE_ERP_ADMIN     = !!erpAdmin;
export const USE_ANON_CLIENT   = !!anonClient || !!erpAdmin || !!erpAnon;
