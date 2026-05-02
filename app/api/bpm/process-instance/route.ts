// ─── GET /api/bpm/process-instance?id=&status=&process_code= ─────────────────
// Fetch a single instance (by id) or list all instances (with optional filters).
// Response: { success, data: ProcessInstance | ProcessInstance[] }

import { NextRequest, NextResponse } from "next/server";
import { initBpmDB, getProcessInstance, getAllInstances, getTasksForInstance } from "@/lib/bpm-db";
import type { InstanceStatus } from "@/lib/bpm-types";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp = req.nextUrl.searchParams;
    const id = sp.get("id");

    if (id) {
      const instance = await getProcessInstance(id);
      if (!instance) return err("Instance not found", 404);
      const tasks = await getTasksForInstance(id);
      return ok({ instance, tasks });
    }

    // List with filters
    const status  = sp.get("status")       as InstanceStatus | null;
    const code    = sp.get("process_code") ?? undefined;
    const by      = sp.get("initiated_by") ?? undefined;

    const instances = await getAllInstances({
      status: status ?? undefined,
      process_code: code,
      initiated_by: by,
    });
    return ok(instances);
  } catch (e) {
    console.error("[bpm/process-instance]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
