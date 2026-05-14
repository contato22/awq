// ─── AWQ CRM — Supabase Clients ───────────────────────────────────────────────
// Two null-safe clients:
//   supabaseCrm       — server-side, service role (bypasses RLS). API routes only.
//   supabaseCrmPublic — client-side, anon key (subject to RLS).
//
// Both resolve to null when env vars are absent OR when the Supabase project
// has Network Restrictions that block the current host (returns a usable client
// only after a successful health probe).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url        = process.env.SUPABASE_CRM_URL               ?? "";
const serviceKey = process.env.SUPABASE_CRM_SERVICE_ROLE_KEY  ?? "";
const anonKey    = process.env.SUPABASE_CRM_ANON_KEY          ?? "";

function make(key: string): SupabaseClient | null {
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const supabaseCrm: SupabaseClient | null       = make(serviceKey);
export const supabaseCrmPublic: SupabaseClient | null = make(anonKey);

// ── Connection health probe (server-side only) ────────────────────────────────
// Call once at app startup (e.g. from initCrmDB) to verify the host is allowed.
// Returns true if the Supabase project is reachable, false otherwise.
export async function probeCrmConnection(): Promise<boolean> {
  if (!supabaseCrm) return false;
  try {
    const { error } = await supabaseCrm
      .from("crm_accounts")
      .select("account_id")
      .limit(1);
    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("allowlist") || msg.includes("blocked") || msg.includes("403")) {
        console.warn(
          "[CRM] Supabase network restriction ativa — o host atual não está na allowlist.\n" +
          "  → Acesse: Supabase Dashboard → Settings → Network → remova a restrição\n" +
          "  → Usando fallback de dados de seed enquanto o CRM DB não estiver acessível.",
        );
        return false;
      }
      // Table not found = schema not applied yet; connection OK
      if (error.code === "42P01") return true;
      console.warn("[CRM] Supabase probe error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[CRM] Supabase probe exception:", (e as Error).message);
    return false;
  }
}
