// ─── GET/POST /api/awq/hcm/payroll ───────────────────────────────────────────
//
// GET  → { success: true, data: PayrollRun[] }
// POST { action: "upsert", payroll_run: PayrollRun } → upsert one payroll run

import { NextRequest, NextResponse } from "next/server";
import {
  getPayrollRuns,
  upsertPayrollRun,
  initHCMDB,
  type PayrollRun,
} from "@/lib/hcm-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initHCMDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getPayrollRuns(bu));
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const body = await req.json();
    const { action } = body;

    if (action === "upsert") {
      const payroll_run = body.payroll_run as PayrollRun;
      if (!payroll_run?.id) return err("payroll_run.id required");
      await upsertPayrollRun(payroll_run);
      return ok({ id: payroll_run.id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
