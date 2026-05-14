// ─── POST /api/bpm/escalate-task ─────────────────────────────────────────────
// Escalate a pending task to a higher-level approver (CEO/CFO by default).
// Body: { task_id, escalated_by, escalate_to?, reason? }

import { NextRequest, NextResponse } from "next/server";
import {
  initBpmDB,
  getProcessTask,
  updateProcessTask,
  getProcessInstance,
  addHistoryEntry,
  createNotification,
} from "@/lib/bpm-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body: { task_id: string; escalated_by: string; escalate_to?: string; reason?: string } = await req.json();

    if (!body.task_id || !body.escalated_by) {
      return err("Missing required fields: task_id, escalated_by");
    }

    const task = await getProcessTask(body.task_id);
    if (!task) return err("Task not found", 404);
    if (task.status !== "pending") return err(`Task is already ${task.status}`);

    const instance = await getProcessInstance(task.instance_id);
    if (!instance) return err("Instance not found", 500);

    const escalateTo = body.escalate_to ?? "5"; // Default: Miguel (CEO)
    const now = new Date().toISOString();

    await updateProcessTask(body.task_id, {
      escalated: true,
      escalated_to: escalateTo,
      escalated_at: now,
      assigned_to: escalateTo,
    });

    await addHistoryEntry({
      instance_id: instance.instance_id,
      action: "escalated",
      action_description: `Task "${task.step_name}" escalada de ${body.escalated_by} para ${escalateTo}`,
      step_id: task.step_id,
      step_name: task.step_name,
      performed_by: body.escalated_by,
      performed_at: now,
      action_data: { escalated_to: escalateTo, reason: body.reason },
    });

    // Notify new assignee
    await createNotification({
      user_id: escalateTo,
      notification_type: "escalated",
      related_entity_type: "process_task",
      related_entity_id: task.task_id,
      title: `Tarefa escalada: ${instance.process_name}`,
      message: `A tarefa "${task.step_name}" foi escalada para você. Processo: ${instance.instance_code}.`,
      action_url: `/awq/bpm/tasks/${task.task_id}`,
      is_read: false, read_at: null,
      send_email: true, email_sent: false, email_sent_at: null,
      priority: "high",
    });

    return ok({ escalated: true, escalated_to: escalateTo });
  } catch (e) {
    console.error("[bpm/escalate-task]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
