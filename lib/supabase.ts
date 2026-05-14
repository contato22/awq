// ─── Supabase Client — AWQ BPM ────────────────────────────────────────────────
//
// Project: kkhxxsrgsewjfvnnssyf (BPM workspace)
// URL:     https://kkhxxsrgsewjfvnnssyf.supabase.co
//
// Two clients:
//   supabaseAdmin  — service-role key, bypasses RLS. Server-side only.
//   createBrowserClient — anon key, respects RLS. Call in client components.
//
// USE_SUPABASE is true when both NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are present. bpm-db.ts routes to Supabase first
// when this flag is set.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const USE_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Server-side admin singleton (module-level; survives dev reloads via globalThis) ──
const _g = globalThis as typeof globalThis & { __supabaseAdmin?: SupabaseClient };
if (USE_SUPABASE && !_g.__supabaseAdmin) {
  _g.__supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export const supabaseAdmin: SupabaseClient | null = _g.__supabaseAdmin ?? null;

// ── Browser client factory (anon key, RLS enforced) ──────────────────────────
export function createBrowserClient(): SupabaseClient {
  return createClient(url, anonKey);
}

// ── Health check ──────────────────────────────────────────────────────────────
// Returns true when Supabase is reachable and the BPM schema is deployed.
export async function checkSupabaseHealth(): Promise<{ ok: boolean; error?: string; tablesFound?: number }> {
  if (!supabaseAdmin) return { ok: false, error: "Supabase not configured" };
  try {
    const { data, error } = await supabaseAdmin
      .from("process_definitions")
      .select("process_code", { count: "exact", head: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, tablesFound: (data as unknown as null) === null ? 0 : 1 };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
