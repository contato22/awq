import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_GRC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_GRC_SUPABASE_ANON_KEY ?? "";

// Browser client — uses anon key, respects RLS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGrcClient() {
  return createClient(url, anonKey);
}

// Server client — uses service role, bypasses RLS (server-side only)
export function getGrcAdminClient() {
  const serviceKey = process.env.GRC_SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
