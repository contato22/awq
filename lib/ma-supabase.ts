// ─── AWQ M&A — Supabase Client ────────────────────────────────────────────────
// Two clients:
//   maSupabase      — anon key, safe for client-side (respects RLS)
//   maSupabaseAdmin — service role key, server-side only (bypasses RLS)
//
// Env vars:
//   NEXT_PUBLIC_MA_SUPABASE_URL      — project URL (public)
//   NEXT_PUBLIC_MA_SUPABASE_ANON_KEY — anon key    (public, NEXT_PUBLIC_ ok)
//   MA_SUPABASE_SERVICE_KEY          — service role key (private, never expose)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url     = process.env.NEXT_PUBLIC_MA_SUPABASE_URL      ?? "";
const anonKey = process.env.NEXT_PUBLIC_MA_SUPABASE_ANON_KEY ?? "";
const svcKey  = process.env.MA_SUPABASE_SERVICE_KEY          ?? "";

export const maSupabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const maSupabaseAdmin: SupabaseClient | null =
  url && svcKey
    ? createClient(url, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

export const MA_SUPABASE_READY = !!(maSupabaseAdmin ?? maSupabase);
