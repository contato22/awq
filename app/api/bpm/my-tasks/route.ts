// ─── GET /api/bpm/my-tasks?user_id=&filter= ───────────────────────────────────
// Returns pending tasks (work queue) for a given user.
// Query: user_id (required), filter: all | overdue | today | upcoming
// Response: { success, data, stats }

import { NextRequest, NextResponse } from "next/server";
import { initBpmDB, getPendingTasksForUser } from "@/lib/bpm-db";
import type { WorkQueueItem, WorkQueueStats } from "@/lib/bpm-types";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: Record<string, unknown>) { return NextResponse.json({ success: true, ...data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("user_id");
    const filter = (sp.get("filter") ?? "all") as "all" | "overdue" | "today" | "upcoming";

    if (!userId) return err("user_id is required");

    let tasks = await getPendingTasksForUser(userId);

    // Apply filter
    const now = Date.now();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd  = new Date(now + 7 * 24 * 60 * 60 * 1000);

    if (filter === "overdue") {
      tasks = tasks.filter((t) => t.sla_breached);
    } else if (filter === "today") {
      tasks = tasks.filter((t) => t.sla_due_date && new Date(t.sla_due_date) <= todayEnd);
    } else if (filter === "upcoming") {
      tasks = tasks.filter((t) => !t.sla_breached);
    }

    const stats: WorkQueueStats = {
      total: tasks.length,
      overdue: tasks.filter((t) => t.sla_breached).length,
      due_today: tasks.filter((t) => t.sla_due_date && new Date(t.sla_due_date) <= todayEnd).length,
      due_this_week: tasks.filter((t) => t.sla_due_date && new Date(t.sla_due_date) <= weekEnd).length,
    };

    return ok({ data: tasks, stats });
  } catch (e) {
    console.error("[bpm/my-tasks]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
