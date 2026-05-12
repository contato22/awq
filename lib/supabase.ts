// ─── Supabase Client — isomorphic (browser + Node) ────────────────────────────
//
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are safe to expose
// in the browser — Supabase designed them for client-side use with RLS.
//
// On GitHub Pages (static export) these vars are inlined at build time from
// GitHub Actions secrets, enabling direct browser → Supabase calls without
// any server/API routes.
//
// On Vercel (SSR) the same client works server-side in API routes.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const HAS_SUPABASE = !!supabase;
