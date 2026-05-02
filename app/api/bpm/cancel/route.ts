// POST /api/bpm/cancel — Cancela uma instância de workflow em andamento

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbGetInstance, dbUpdateInstance, dbAddHistory } from "@/lib/bpm-db";
import { generateId, USER_NAMES } from "@/lib/bpm-process-definitions";

export const runtime = "nodejs";

interface CancelPayload {
  instance_id: string;
  cancelled_by: string;
  reason?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as CancelPayload;

    if (!body.instance_id || !body.cancelled_by) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true });
    }

    await initBpmDB();
    const instance = await dbGetInstance(body.instance_id);
    if (!instance) {
      return NextResponse.json({ success: false, error: "Instance not found" }, { status: 404 });
    }

    if (!["pending", "in_progress"].includes(instance.status)) {
      return NextResponse.json({ success: false, error: "Instance is not active" }, { status: 400 });
    }

    await dbUpdateInstance(body.instance_id, {
      status:       "cancelled",
      completed_at: now,
    });

    // Cancel pending tasks directly in DB
    if (sql) {
      await sql`
        UPDATE bpm_process_tasks
        SET status = 'cancelled', updated_at = NOW()
        WHERE instance_id = ${body.instance_id} AND status = 'pending'
      `;
    }

    await dbAddHistory({
      history_id:        generateId("hist"),
      instance_id:       body.instance_id,
      action:            "cancelled",
      action_description: `Workflow cancelado por ${USER_NAMES[body.cancelled_by] ?? body.cancelled_by}${body.reason ? `. Motivo: ${body.reason}` : ""}`,
      performed_by:      body.cancelled_by,
      performed_at:      now,
      action_data:       { reason: body.reason },
    });

    return NextResponse.json({ success: true, data: { status: "cancelled" } });
  } catch (err) {
    console.error("[bpm/cancel]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
