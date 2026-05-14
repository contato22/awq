import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Internal diagnostic endpoint — verifies Supabase connectivity from Vercel.
// Protected: only responds if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      stage: "config",
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars",
      fix: "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Dashboard → Settings → Environment Variables",
    }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const results: Record<string, unknown> = {};
  let allOk = true;

  // 1. Connection + read ppm_projects
  try {
    const { data, error, count } = await supabase
      .from("ppm_projects")
      .select("*", { count: "exact" })
      .limit(3);
    if (error) throw error;
    results.ppm_projects = { ok: true, count, sample: data?.map(p => p.project_name) };
  } catch (e: unknown) {
    results.ppm_projects = { ok: false, error: (e as Error).message };
    allOk = false;
  }

  // 2. Write test (insert + delete)
  const testId = `diag-${Date.now()}`;
  try {
    const { error: insErr } = await supabase.from("ppm_projects").insert({
      project_id:       testId,
      project_code:     `PRJ-DIAG-${Date.now()}`,
      project_name:     "[DIAGNÓSTICO] Projeto Teste",
      bu_code:          "AWQ",
      project_type:     "internal",
      contract_type:    "fixed_price",
      start_date:       new Date().toISOString().slice(0, 10),
      planned_end_date: new Date().toISOString().slice(0, 10),
      budget_cost:      0,
      budget_revenue:   0,
      phase:            "initiation",
      status:           "active",
      health_status:    "green",
      priority:         "low",
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    });
    if (insErr) throw insErr;

    const { error: delErr } = await supabase.from("ppm_projects").delete().eq("project_id", testId);
    if (delErr) throw delErr;

    results.write_test = { ok: true, message: "insert + delete bem-sucedidos" };
  } catch (e: unknown) {
    results.write_test = { ok: false, error: (e as Error).message };
    allOk = false;
  }

  // 3. Check other PPM tables
  for (const table of ["ppm_tasks", "ppm_milestones", "ppm_allocations", "ppm_risks", "ppm_issues"]) {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      results[table] = { ok: true, count };
    } catch (e: unknown) {
      results[table] = { ok: false, error: (e as Error).message };
      allOk = false;
    }
  }

  return NextResponse.json({
    ok: allOk,
    supabase_url: url.replace(/https:\/\/(.{8}).*\.supabase\.co/, "https://$1****.supabase.co"),
    results,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 500 });
}
