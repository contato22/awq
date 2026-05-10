// ─── GET/POST /api/awq/hcm/recruitment ───────────────────────────────────────
//
// GET  → { success: true, data: JobOpening[] }
// POST { action: "upsert", job_opening: JobOpening } → upsert one job opening
// POST { action: "delete", id: string }              → delete one job opening

import { NextRequest, NextResponse } from "next/server";
import {
  getJobOpenings,
  upsertJobOpening,
  deleteJobOpening,
  initHCMDB,
  type JobOpening,
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
    return ok(await getJobOpenings(bu));
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
      const job_opening = body.job_opening as JobOpening;
      if (!job_opening?.id) return err("job_opening.id required");
      await upsertJobOpening(job_opening);
      return ok({ id: job_opening.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteJobOpening(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
