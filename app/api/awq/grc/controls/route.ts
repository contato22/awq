// ─── GET/POST /api/awq/grc/controls — GRC Controls ───────────────────────────
//
// GET  → list all controls (optionally filtered by ?bu=)
// POST { action: "upsert", control: GRCControl } → upsert one control
// POST { action: "delete", id: string }          → delete one control

import { NextRequest, NextResponse } from "next/server";
import {
  getGRCControls,
  upsertGRCControl,
  deleteGRCControl,
  initGRCDB,
  type GRCControl,
} from "@/lib/grc-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initGRCDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getGRCControls(bu));
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
      const control = body.control as GRCControl;
      if (!control?.id) return err("control.id required");
      await upsertGRCControl(control);
      return ok({ id: control.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteGRCControl(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
