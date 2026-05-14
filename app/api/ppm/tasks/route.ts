import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask, updateTask } from "@/lib/ppm-db";
import type { TaskStatus } from "@/lib/ppm-types";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const tasks = await listTasks(
      p.get("project_id") ?? undefined,
      { status: (p.get("status") ?? undefined) as TaskStatus | undefined },
    );
    return ok(tasks);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) return err("project_id is required");
    if (!body.task_name)  return err("task_name is required");

    const task = await createTask({
      ...body,
      task_type:      body.task_type     ?? "task",
      sort_order:     body.sort_order    ?? 0,
      status:         body.status        ?? "not_started",
      completion_pct: body.completion_pct ?? 0,
      is_deliverable: body.is_deliverable ?? false,
    });
    return ok(task);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { task_id, ...patch } = body;
    if (!task_id) return err("task_id is required");
    const updated = await updateTask(task_id, patch);
    if (!updated) return err("Task not found", 404);
    return ok(updated);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
