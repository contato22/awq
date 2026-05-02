// POST /api/bpm/escalate — Escalona uma tarefa para outro aprovador

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbGetTask, dbUpdateTask, dbAddHistory, dbCreateNotification } from "@/lib/bpm-db";
import { generateId, USER_NAMES } from "@/lib/bpm-process-definitions";
import type { BpmNotification } from "@/lib/bpm-types";

export const runtime = "nodejs";

interface EscalatePayload {
  task_id: string;
  escalated_to: string;
  escalated_by: string;
  reason?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as EscalatePayload;

    if (!body.task_id || !body.escalated_to || !body.escalated_by) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true });
    }

    await initBpmDB();
    const task = await dbGetTask(body.task_id);
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    await dbUpdateTask(body.task_id, {
      status:       "escalated",
      assigned_to:  body.escalated_to,
      escalated:    true,
      escalated_to: body.escalated_to,
      escalated_at: now,
    });

    await dbAddHistory({
      history_id:        generateId("hist"),
      instance_id:       task.instance_id,
      action:            "escalated",
      action_description: `Task "${task.step_name}" escalonada para ${USER_NAMES[body.escalated_to] ?? body.escalated_to} por ${USER_NAMES[body.escalated_by] ?? body.escalated_by}`,
      step_id:           task.step_id,
      step_name:         task.step_name,
      performed_by:      body.escalated_by,
      performed_at:      now,
      action_data:       { escalated_to: body.escalated_to, reason: body.reason },
    });

    const notif: BpmNotification = {
      notification_id:    generateId("notif"),
      user_id:            body.escalated_to,
      notification_type:  "escalated",
      related_entity_type: "process_task",
      related_entity_id:  body.task_id,
      title:              `Tarefa escalonada: ${task.step_name}`,
      message:            `Uma tarefa foi escalonada para você${body.reason ? `: ${body.reason}` : ""}`,
      action_url:         `/awq/bpm/tasks/${body.task_id}`,
      is_read:            false,
      priority:           "high",
      created_at:         now,
    };
    await dbCreateNotification(notif);

    return NextResponse.json({ success: true, data: { status: "escalated", notification: notif } });
  } catch (err) {
    console.error("[bpm/escalate]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
