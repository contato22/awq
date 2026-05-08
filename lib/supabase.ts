// ─── AWQ Supabase Client ──────────────────────────────────────────────────────
//
// Server-side only. Used for Supabase Storage (PDF uploads).
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
//
// For database access use lib/db.ts (postgres client via DATABASE_URL).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

export const STORAGE_BUCKET = "financial-pdfs";
