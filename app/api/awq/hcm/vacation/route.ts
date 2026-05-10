// ─── GET/POST /api/awq/hcm/vacation ──────────────────────────────────────────
//
// GET  → { success: true, data: VacationRequest[] }
// POST { action: "upsert", vacation_request: VacationRequest } → upsert one request
// POST { action: "delete", id: string }                        → delete one request

import { NextRequest, NextResponse } from "next/server";
import {
  getVacationRequests,
  upsertVacationRequest,
  deleteVacationRequest,
  initHCMDB,
  type VacationRequest,
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
    return ok(await getVacationRequests(bu));
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
      const vacation_request = body.vacation_request as VacationRequest;
      if (!vacation_request?.id) return err("vacation_request.id required");
      await upsertVacationRequest(vacation_request);
      return ok({ id: vacation_request.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteVacationRequest(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
