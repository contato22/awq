// ─── POST /api/bpm/sla-check ──────────────────────────────────────────────────
// Cron job endpoint: marks overdue tasks/instances as sla_breached,
// creates SLA breach notifications.
// Intended to be called by a Vercel Cron or GitHub Actions schedule.
// Body: { secret? } — optionally validate a CRON_SECRET env var.
// Response: { success, data: { breached_count } }

import { NextRequest, NextResponse } from "next/server";
import {
  initBpmDB,
  markOverdueTasks,
  getAllInstances,
  getTasksForInstance,
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
    // Optional secret guard (set CRON_SECRET in env)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const body = await req.json().catch(() => ({})) as { secret?: string };
      const authHeader = req.headers.get("authorization") ?? "";
      if (body.secret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return err("Unauthorized", 401);
      }
    }

    await ensureDB();

    // 1. Mark overdue tasks
    const breachedCount = await markOverdueTasks();

    // 2. Notify assignees of newly breached tasks (in-progress instances)
    const activeInstances = await getAllInstances({ status: "in_progress" });
    let notifSent = 0;

    for (const inst of activeInstances) {
      if (!inst.sla_breached) continue;

      const tasks = await getTasksForInstance(inst.instance_id);
      for (const task of tasks) {
        if (task.status === "pending" && task.sla_breached) {
          await createNotification({
            user_id: task.assigned_to,
            notification_type: "sla_breached",
            related_entity_type: "process_task",
            related_entity_id: task.task_id,
            title: `SLA vencido: ${inst.process_name}`,
            message: `A tarefa "${task.step_name}" (${inst.instance_code}) está com SLA vencido. Ação imediata necessária.`,
            action_url: `/awq/bpm/tasks/${task.task_id}`,
            is_read: false, read_at: null,
            send_email: true, email_sent: false, email_sent_at: null,
            priority: "urgent",
          });
          notifSent++;
        }
      }
    }

    return ok({ breached_count: breachedCount, notifications_sent: notifSent, checked_at: new Date().toISOString() });
  } catch (e) {
    console.error("[bpm/sla-check]", e);
    return err(String(e), 500);
  }
}

// Also support GET for simple health/trigger
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
