import { NextRequest, NextResponse } from "next/server";
import { getCostCenters, addCostCenter, initCostCentersDB, type BuCode } from "@/lib/ap-ar-db";
import { requireSession } from "@/lib/api-auth";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initCostCentersDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    await ensureDB();
    const bu_code = (req.nextUrl.searchParams.get("bu_code") ?? undefined) as BuCode | undefined;
    return ok(await getCostCenters(bu_code));
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    await ensureDB();
    const body = await req.json();
    const { code, name, bu_code, description } = body;
    if (!code || !name || !bu_code) return err("code, name and bu_code are required");
    return ok(await addCostCenter({ code, name, bu_code: bu_code as BuCode, description }));
  } catch (e) { return err(String(e)); }
}
