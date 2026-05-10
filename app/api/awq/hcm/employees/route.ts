// ─── GET/POST /api/awq/hcm/employees ─────────────────────────────────────────
//
// GET  → { success: true, data: Employee[] }
// POST { action: "upsert", employee: Employee } → upsert one employee
// POST { action: "delete", id: string }         → delete one employee

import { NextRequest, NextResponse } from "next/server";
import {
  getEmployees,
  upsertEmployee,
  deleteEmployee,
  initHCMDB,
  type Employee,
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
    return ok(await getEmployees(bu));
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
      const employee = body.employee as Employee;
      if (!employee?.id) return err("employee.id required");
      await upsertEmployee(employee);
      return ok({ id: employee.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteEmployee(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
