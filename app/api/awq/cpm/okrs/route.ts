// ─── GET/POST /api/awq/cpm/okrs — OKRs ───────────────────────────────────────
//
// GET  ?bu=   → { success: true, data: OKR[] }
// POST { action: "upsert", okr: OKR }  → upsert one OKR
// POST { action: "delete", id: string } → delete one OKR

import { NextRequest, NextResponse } from "next/server";
import {
  getOKRs,
  upsertOKR,
  deleteOKR,
  initCPMDB,
  type OKR,
} from "@/lib/cpm-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initCPMDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getOKRs(bu));
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
      const okr = body.okr as OKR;
      if (!okr?.id) return err("okr.id required");
      await upsertOKR(okr);
      return ok({ id: okr.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteOKR(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
