// ─── GET/POST /api/awq/hcm/training ──────────────────────────────────────────
//
// GET  → { success: true, data: TrainingCourse[] }
// POST { action: "upsert", training_course: TrainingCourse } → upsert one course
// POST { action: "delete", id: string }                      → delete one course

import { NextRequest, NextResponse } from "next/server";
import {
  getTrainingCourses,
  upsertTrainingCourse,
  deleteTrainingCourse,
  initHCMDB,
  type TrainingCourse,
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
    return ok(await getTrainingCourses(bu));
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
      const training_course = body.training_course as TrainingCourse;
      if (!training_course?.id) return err("training_course.id required");
      await upsertTrainingCourse(training_course);
      return ok({ id: training_course.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteTrainingCourse(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
