// ─── POST /api/bpm/cancel-instance ───────────────────────────────────────────
// Cancel a running process instance (and all pending tasks).
// Body: { instance_id, cancelled_by, reason? }

import { NextRequest, NextResponse } from "next/server";
import {
  initBpmDB,
  getProcessInstance,
  updateProcessInstance,
  updateProcessTask,
  getTasksForInstance,
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
    const body: { instance_id: string; cancelled_by: string; reason?: string } = await req.json();

    if (!body.instance_id || !body.cancelled_by) {
      return err("Missing required fields: instance_id, cancelled_by");
    }

    const instance = await getProcessInstance(body.instance_id);
    if (!instance) return err("Instance not found", 404);
    if (instance.status !== "in_progress") return err(`Cannot cancel instance with status: ${instance.status}`);

    const now = new Date().toISOString();

    // Cancel all pending tasks
    const tasks = await getTasksForInstance(body.instance_id);
    for (const task of tasks) {
      if (task.status === "pending") {
        await updateProcessTask(task.task_id, { status: "cancelled" });
      }
    }

    // Cancel instance
    await updateProcessInstance(body.instance_id, {
      status: "cancelled",
      final_decision: "cancelled",
      rejection_reason: body.reason ?? null,
      completed_at: now,
    });

    await addHistoryEntry({
      instance_id: body.instance_id,
      action: "cancelled",
      action_description: `Processo cancelado por ${body.cancelled_by}`,
      step_id: null,
      step_name: null,
      performed_by: body.cancelled_by,
      performed_at: now,
      action_data: { reason: body.reason },
    });

    // Notify initiator if different from canceller
    if (instance.initiated_by !== body.cancelled_by) {
      await createNotification({
        user_id: instance.initiated_by,
        notification_type: "rejected",
        related_entity_type: "process_instance",
        related_entity_id: instance.instance_id,
        title: `Processo cancelado: ${instance.process_name}`,
        message: `O processo ${instance.instance_code} foi cancelado. Motivo: ${body.reason ?? "Não informado"}.`,
        action_url: `/awq/bpm/instances/${instance.instance_id}`,
        is_read: false, read_at: null,
        send_email: true, email_sent: false, email_sent_at: null,
        priority: instance.priority,
      });
    }

    return ok({ cancelled: true, instance_code: instance.instance_code });
  } catch (e) {
    console.error("[bpm/cancel-instance]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
