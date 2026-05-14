// ─── GET /api/bpm/health ──────────────────────────────────────────────────────
// Diagnostic endpoint. Reports which storage adapter is active and whether it
// can reach the database. Safe to call from a deploy hook or monitoring tool.

import { NextResponse } from "next/server";
import { USE_SUPABASE, checkSupabaseHealth } from "@/lib/supabase";
import { USE_DB } from "@/lib/db";

export async function GET() {
  const adapter = USE_SUPABASE ? "supabase" : USE_DB ? "neon" : "memory";

  let supabase: { ok: boolean; error?: string; tablesFound?: number } | null = null;
  if (USE_SUPABASE) {
    supabase = await checkSupabaseHealth();
  }

  const ok = adapter === "memory" || (adapter === "neon" && USE_DB) || (adapter === "supabase" && !!supabase?.ok);

  return NextResponse.json({
    ok,
    adapter,
    supabase,
    env: {
      supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key_set:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      database_url_set: !!process.env.DATABASE_URL,
    },
    ts: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
