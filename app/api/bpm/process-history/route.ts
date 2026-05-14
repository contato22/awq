// ─── GET /api/bpm/process-history?instance_id= ───────────────────────────────
// Returns the full audit trail for a process instance.
// Response: { success, data: ProcessHistoryEntry[] }

import { NextRequest, NextResponse } from "next/server";
import { initBpmDB, getInstanceHistory } from "@/lib/bpm-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const instanceId = req.nextUrl.searchParams.get("instance_id");
    if (!instanceId) return err("instance_id is required");

    const history = await getInstanceHistory(instanceId);
    return ok(history);
  } catch (e) {
    console.error("[bpm/process-history]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
