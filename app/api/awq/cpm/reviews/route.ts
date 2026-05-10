// ─── GET/POST /api/awq/cpm/reviews — Performance Reviews ─────────────────────
//
// GET  ?bu=   → { success: true, data: PerformanceReview[] }
// POST { action: "upsert", review: PerformanceReview }  → upsert one review
// POST { action: "delete", id: string }                  → delete one review

import { NextRequest, NextResponse } from "next/server";
import {
  getPerformanceReviews,
  upsertPerformanceReview,
  deletePerformanceReview,
  initCPMDB,
  type PerformanceReview,
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
    return ok(await getPerformanceReviews(bu));
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
      const review = body.review as PerformanceReview;
      if (!review?.id) return err("review.id required");
      await upsertPerformanceReview(review);
      return ok({ id: review.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deletePerformanceReview(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
