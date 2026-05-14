// ─── Supabase EPM Client ──────────────────────────────────────────────────────
//
// Two clients for the EPM Supabase project:
//   getSupabaseEpm()        — server-side, uses service_role key (bypasses RLS)
//   getSupabaseEpmPublic()  — anon key, safe for browser/edge use
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_EPM_URL        (exposed to browser build)
//   SUPABASE_EPM_SERVICE_ROLE_KEY       (server-only, never exposed)
//   NEXT_PUBLIC_SUPABASE_EPM_ANON_KEY   (browser-safe public key)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EPM_URL          = process.env.NEXT_PUBLIC_SUPABASE_EPM_URL       ?? "";
const EPM_SERVICE_KEY  = process.env.SUPABASE_EPM_SERVICE_ROLE_KEY      ?? "";
const EPM_ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_EPM_ANON_KEY
                      ?? process.env.SUPABASE_EPM_ANON_KEY
                      ?? "";

// true when the server-side client can be created
export const USE_SUPABASE_EPM = !!(EPM_URL && (EPM_SERVICE_KEY || EPM_ANON_KEY));

let _server: SupabaseClient | null = null;
let _public: SupabaseClient | null = null;

/** Server-side client — prefers service_role key (bypasses RLS). */
export function getSupabaseEpm(): SupabaseClient {
  if (!USE_SUPABASE_EPM) {
    throw new Error(
      "Supabase EPM not configured — set NEXT_PUBLIC_SUPABASE_EPM_URL and SUPABASE_EPM_SERVICE_ROLE_KEY"
    );
  }
  if (!_server) {
    _server = createClient(EPM_URL, EPM_SERVICE_KEY || EPM_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _server;
}

/** Browser-safe client — uses anon key only. */
export function getSupabaseEpmPublic(): SupabaseClient {
  if (!EPM_URL || !EPM_ANON_KEY) {
    throw new Error(
      "Supabase EPM public client not configured — set NEXT_PUBLIC_SUPABASE_EPM_URL and NEXT_PUBLIC_SUPABASE_EPM_ANON_KEY"
    );
  }
  if (!_public) {
    _public = createClient(EPM_URL, EPM_ANON_KEY, {
      auth: { persistSession: true },
    });
  }
  return _public;
}
