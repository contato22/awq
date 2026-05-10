// ─── GET/POST /api/awq/grc/risks — GRC Risks ──────────────────────────────────
//
// GET  → list all risks (optionally filtered by ?bu=)
// POST { action: "upsert", risk: GRCRisk } → upsert one risk
// POST { action: "delete", id: string }    → delete one risk

import { NextRequest, NextResponse } from "next/server";
import {
  getGRCRisks,
  upsertGRCRisk,
  deleteGRCRisk,
  initGRCDB,
  type GRCRisk,
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
    return ok(await getGRCRisks(bu));
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
      const risk = body.risk as GRCRisk;
      if (!risk?.id) return err("risk.id required");
      await upsertGRCRisk(risk);
      return ok({ id: risk.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteGRCRisk(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
