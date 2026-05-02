// POST /api/bpm/my-tasks — Retorna work queue do usuário

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbListPendingTasksForUser } from "@/lib/bpm-db";
import type { GetMyTasksPayload, ProcessTask } from "@/lib/bpm-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as GetMyTasksPayload;

    if (!body.user_id) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true, data: [], stats: { total: 0, overdue: 0, due_today: 0, due_this_week: 0 } });
    }

    await initBpmDB();
    let tasks = await dbListPendingTasksForUser(body.user_id);

    // Apply filter
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now + 7 * 24 * 60 * 60 * 1000);

    if (body.filter === "overdue") {
      tasks = tasks.filter((t) => t.sla_breached);
    } else if (body.filter === "today") {
      tasks = tasks.filter((t) => new Date(t.sla_due_date) <= todayEnd);
    } else if (body.filter === "upcoming") {
      tasks = tasks.filter((t) => !t.sla_breached);
    }

    const stats = computeStats(tasks, todayEnd, weekEnd);

    return NextResponse.json({ success: true, data: tasks, stats });
  } catch (err) {
    console.error("[bpm/my-tasks]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

function computeStats(tasks: ProcessTask[], todayEnd: Date, weekEnd: Date) {
  return {
    total:         tasks.length,
    overdue:       tasks.filter((t) => t.sla_breached).length,
    due_today:     tasks.filter((t) => new Date(t.sla_due_date) <= todayEnd).length,
    due_this_week: tasks.filter((t) => new Date(t.sla_due_date) <= weekEnd).length,
  };
}
