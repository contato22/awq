// ─── AWQ Supabase Client ──────────────────────────────────────────────────────
//
// TWO clients — never mix them:
//
//   supabaseAdmin  — server-only, uses SUPABASE_SERVICE_ROLE_KEY
//                    bypasses RLS, safe for Next.js API routes + server components
//                    DO NOT import in client components ("use client")
//
//   createPublicClient()  — for client components, uses NEXT_PUBLIC_SUPABASE_ANON_KEY
//                           subject to RLS policies
//
// USE_SUPABASE flag: true when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
// Priority order in financial-db.ts:  Supabase → Neon → JSON files

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Server-side admin client ─────────────────────────────────────────────────

const SUPABASE_URL          = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ─── Client-side public client factory ───────────────────────────────────────
// Call once at component mount — do NOT call at module level (hydration mismatch)

export function createPublicClient(): SupabaseClient | null {
  const pubUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const pubKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!pubUrl || !pubKey) return null;
  return createClient(pubUrl, pubKey, {
    auth: { persistSession: false },
  });
}

export const SUPABASE_PUBLIC_AVAILABLE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
