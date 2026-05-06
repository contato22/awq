import { NextRequest, NextResponse } from "next/server";
import { listEpmSyncs, createEpmSync } from "@/lib/ppm-db";
import type { EpmSyncFlow } from "@/lib/ppm-db";

function ok(data: unknown)         { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400) { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    return ok(await listEpmSyncs(p.get("project_id") ?? undefined));
  } catch (e) { return err((e as Error).message, 500); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) return err("project_id is required");
    if (!body.flow)        return err("flow is required (cost_gl | revenue_ar | budget_epm)");
    if (!body.gl_account)  return err("gl_account is required");
    if (body.amount == null) return err("amount is required");

    const validFlows: EpmSyncFlow[] = ["cost_gl", "revenue_ar", "budget_epm"];
    if (!validFlows.includes(body.flow)) return err("Invalid flow");

    const sync = await createEpmSync({
      project_id: body.project_id,
      flow:       body.flow,
      status:     "synced",
      gl_account: body.gl_account,
      amount:     body.amount,
      synced_by:  body.synced_by ?? "sistema",
      synced_at:  new Date().toISOString(),
      error_msg:  undefined,
    });
    return ok(sync);
  } catch (e) { return err((e as Error).message, 500); }
}
