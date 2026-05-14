// ─── Supabase client (browser / client-side) ──────────────────────────────────
// Uses the anon key only — safe to expose to the browser.
// Import this in Client Components ("use client") to bypass server-side IP
// allowlist restrictions: requests go from the user's browser, not the server.

import { createClient } from "@supabase/supabase-js";

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseBrowser =
  url && anonKey ? createClient(url, anonKey) : null;

export const BROWSER_SUPABASE_AVAILABLE = !!supabaseBrowser;
