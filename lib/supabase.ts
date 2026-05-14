// ─── Supabase Client ──────────────────────────────────────────────────────────
// Server-side only. Use the service role key so API routes bypass RLS.
// Never import this in client components.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabase = url && key ? createClient(url, key) : null;
export const USE_SUPABASE = !!supabase;
