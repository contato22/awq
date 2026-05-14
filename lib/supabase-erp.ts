import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  throw new Error("Missing NEXT_PUBLIC_ERP_SUPABASE_URL or NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY");
}

// Browser-safe client — uses anon key, subject to Row Level Security.
export const erpSupabase = createClient(url, anonKey);

// Server-only admin client — bypasses RLS. Never expose to the browser.
export function createErpAdminClient() {
  const serviceKey = process.env.ERP_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Missing ERP_SUPABASE_SERVICE_ROLE_KEY (server-only)");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
