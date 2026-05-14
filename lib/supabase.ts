import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Anon client — used for signInWithPassword in the NextAuth credentials provider
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: false },
});

// Admin client (service role) — server-side only, never import in client components
export function createSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
