// ─── Supabase Clients ─────────────────────────────────────────────────────────
// Three clients exported from one place:
//   supabase       — service role (server-side only, bypasses RLS)
//   supabaseClient — anon key    (browser components, respects RLS)
//   anonClient     — anon key    (server-side fallback when service role is absent)
//
// Never import `supabase` (service role) in client components.
// anonClient is used by financial-db when SUPABASE_SERVICE_ROLE_KEY is not set —
// it requires tables to have explicit GRANT to anon/authenticated roles.

import { createClient } from "@supabase/supabase-js";

// ERP project fallback — anon key is public (already in pages.yml build config).
// Used when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set
// as Vercel runtime env vars.
const ERP_URL      = "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const ERP_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";

const url     = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ERP_URL;
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
             || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
             || ERP_ANON_KEY;

// Server-side — service role key bypasses Row Level Security.
export const supabase       = url && svcKey  ? createClient(url, svcKey)  : null;

// Client-side — anon key, subject to RLS policies.
export const supabaseClient = createClient(url, anonKey);

// Server-side anon fallback — used when service role key is absent.
// Requires tables to grant INSERT/UPDATE/DELETE to anon or authenticated role.
export const anonClient     = url && anonKey && !svcKey ? createClient(url, anonKey) : null;

export const USE_SUPABASE      = !!supabase;
export const USE_ANON_CLIENT   = !!anonClient;
