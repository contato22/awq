// ─── AWQ Supabase Client ──────────────────────────────────────────────────────
// Browser-safe client using the anon key (NEXT_PUBLIC_).
// Works in GitHub Pages (client-side) and Vercel (SSR/API routes).

import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = url && anon ? createClient(url, anon) : null;

// Server-side admin client (bypasses RLS) — never import this in client components.
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anon;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
