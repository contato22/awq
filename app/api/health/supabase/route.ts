// GET /api/health/supabase — Operational test for Supabase connectivity
//
// Tests:
//   1. Anon client: signInWithPassword with invalid creds (expects AuthApiError, not network error)
//   2. Admin client: listUsers (service role — proves admin access)
//   3. Env var presence check (no values exposed)
//
// Public endpoint — excluded from middleware auth matcher.

import { NextResponse } from "next/server";
import { supabase, createSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const results: Record<string, unknown> = {
    env: {
      supabaseUrl:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey:  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  };

  // ── 1. Anon client connectivity (auth endpoint) ───────────────────────────
  const t0 = Date.now();
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email:    "probe@awq-health-check.internal",
      password: "probe",
    });
    // AuthApiError means we reached Supabase and it responded — connectivity OK
    // "Invalid login credentials" is the expected response for a bogus user
    const reachable = !error || error.name === "AuthApiError";
    results.anonClient = {
      status:    reachable ? "ok" : "error",
      latencyMs: Date.now() - t0,
      detail:    error?.message ?? "unexpected success",
    };
  } catch (e) {
    results.anonClient = {
      status:    "error",
      latencyMs: Date.now() - t0,
      detail:    (e as Error).message,
    };
  }

  // ── 2. Admin client — listUsers ───────────────────────────────────────────
  const t1 = Date.now();
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 10 });
    if (error) {
      results.adminClient = { status: "error", latencyMs: Date.now() - t1, detail: error.message };
    } else {
      results.adminClient = {
        status:    "ok",
        latencyMs: Date.now() - t1,
        userCount: data.users.length,
        users:     data.users.map((u) => ({
          email: u.email,
          role:  u.user_metadata?.role ?? null,
          confirmed: !!u.email_confirmed_at,
        })),
      };
    }
  } catch (e) {
    results.adminClient = {
      status:    "error",
      latencyMs: Date.now() - t1,
      detail:    (e as Error).message,
    };
  }

  const allOk =
    (results.anonClient  as { status: string }).status === "ok" &&
    (results.adminClient as { status: string }).status === "ok";

  return NextResponse.json({ ok: allOk, ...results }, { status: allOk ? 200 : 502 });
}
