import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ERP_URL      = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL ?? "";
const ERP_ANON_KEY = process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY ?? "";

// Lazy singleton — avoids module-load throws when env vars are absent (CI build).
let _browserClient: SupabaseClient | null = null;

/**
 * Browser-safe client using the anon key, subject to Row Level Security.
 * Import in Client Components and API routes that operate on behalf of a user.
 */
export function getErpClient(): SupabaseClient {
  if (!ERP_URL || !ERP_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_ERP_SUPABASE_URL or NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY. " +
      "Set them in .env.local (dev) or Vercel environment variables (prod)."
    );
  }
  if (!_browserClient) _browserClient = createClient(ERP_URL, ERP_ANON_KEY);
  return _browserClient;
}

/**
 * Server-only admin client using the service role key — bypasses RLS.
 * Call only from API Routes / Server Actions. Never import in "use client" files.
 */
export function getErpAdminClient(): SupabaseClient {
  const serviceKey = process.env.ERP_SUPABASE_SERVICE_ROLE_KEY;
  if (!ERP_URL || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_ERP_SUPABASE_URL or ERP_SUPABASE_SERVICE_ROLE_KEY (server-only)."
    );
  }
  return createClient(ERP_URL, serviceKey, { auth: { persistSession: false } });
}

/** Returns true if the ERP Supabase connection is configured in this environment. */
export function isErpConfigured(): boolean {
  return Boolean(ERP_URL && ERP_ANON_KEY);
}
