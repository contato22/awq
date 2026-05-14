// ─── Supabase Clients ─────────────────────────────────────────────────────────
// Two clients exported from one place:
//   supabase       — service role (server-side only, bypasses RLS)
//   supabaseClient — anon key    (browser components, respects RLS)
//
// Never import `supabase` (service role) in client components.
// Never import `supabaseClient` in API routes that need elevated access.

import { createClient } from "@supabase/supabase-js";

const url     = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Server-side — service role key bypasses Row Level Security.
export const supabase       = url && svcKey  ? createClient(url, svcKey)  : null;

// Client-side — anon key, subject to RLS policies.
export const supabaseClient = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");

export const USE_SUPABASE = !!supabase;
