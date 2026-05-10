// ─── GET/POST /api/awq/cpm/scorecards — Balanced Scorecards ──────────────────
//
// GET  ?bu=   → { success: true, data: Scorecard[] }
// POST { action: "upsert", scorecard: Scorecard }  → upsert one Scorecard
// POST { action: "delete", id: string }             → delete one Scorecard

import { NextRequest, NextResponse } from "next/server";
import {
  getScorecards,
  upsertScorecard,
  deleteScorecard,
  initCPMDB,
  type Scorecard,
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
    return ok(await getScorecards(bu));
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
      const scorecard = body.scorecard as Scorecard;
      if (!scorecard?.id) return err("scorecard.id required");
      await upsertScorecard(scorecard);
      return ok({ id: scorecard.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteScorecard(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
