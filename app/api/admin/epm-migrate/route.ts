// POST /api/admin/epm-migrate
//
// Runs initEPMPlanningDB() (CREATE TABLE IF NOT EXISTS for all 9 EPM tables)
// then seeds every table with static fallback data (ON CONFLICT DO NOTHING).
//
// Protected by the Supabase service role key as a bearer token so it can be
// triggered from anywhere without a browser session — including CI or curl.
//
// Requires DATABASE_URL to be set in the Vercel environment (direct postgres URI).

import { NextRequest, NextResponse } from "next/server";
import { USE_DB } from "@/lib/db";
import { initEPMPlanningDB, seedAllEPMPlanningData } from "@/lib/epm-planning-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!srk || token !== srk) return unauthorized();

  if (!USE_DB) {
    return NextResponse.json(
      {
        ok: false,
        error: "DATABASE_URL não configurado.",
        hint: "Adicione DATABASE_URL nas variáveis de ambiente do Vercel (Settings → Environment Variables). Use a connection string direta do Supabase: Project Settings → Database → URI (pooler mode).",
      },
      { status: 501 },
    );
  }

  const steps: { step: string; ok: boolean; error?: string }[] = [];

  try {
    await initEPMPlanningDB();
    steps.push({ step: "initEPMPlanningDB (CREATE TABLE IF NOT EXISTS × 9)", ok: true });
  } catch (e) {
    steps.push({ step: "initEPMPlanningDB", ok: false, error: String(e) });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  try {
    const { seeded } = await seedAllEPMPlanningData();
    steps.push({ step: `seedAllEPMPlanningData (${seeded.join(", ")})`, ok: true });
  } catch (e) {
    steps.push({ step: "seedAllEPMPlanningData", ok: false, error: String(e) });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  return NextResponse.json({ ok: true, steps });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!srk || token !== srk) return unauthorized();

  return NextResponse.json({
    use_db: USE_DB,
    hint: USE_DB
      ? "DATABASE_URL configurado. POST para executar a migração."
      : "DATABASE_URL não configurado — adicione no Vercel.",
  });
}
