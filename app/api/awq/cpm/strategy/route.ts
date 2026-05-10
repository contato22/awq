// ─── GET/POST /api/awq/cpm/strategy — Strategic Objectives ───────────────────
//
// GET  ?bu=   → { success: true, data: StrategicObjective[] }
// POST { action: "upsert", objective: StrategicObjective }  → upsert one objective
// POST { action: "delete", id: string }                      → delete one objective

import { NextRequest, NextResponse } from "next/server";
import {
  getStrategicObjectives,
  upsertStrategicObjective,
  deleteStrategicObjective,
  initCPMDB,
  type StrategicObjective,
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
    return ok(await getStrategicObjectives(bu));
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
      const objective = body.objective as StrategicObjective;
      if (!objective?.id) return err("objective.id required");
      await upsertStrategicObjective(objective);
      return ok({ id: objective.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteStrategicObjective(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
