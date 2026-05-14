// ─── Supabase client (server-side only) ──────────────────────────────────────
// Uses service role key when available (bypasses RLS) — server API routes only.
// Falls back to anon key. DO NOT import in client components.

import { createClient } from "@supabase/supabase-js";

const url        = process.env.SUPABASE_URL          ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_KEY  ?? "";
const anonKey    = process.env.SUPABASE_ANON_KEY     ?? "";
const key        = serviceKey || anonKey;

export const supabase = url && key ? createClient(url, key) : null;
export const USE_SUPABASE = !!supabase;
