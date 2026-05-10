// ─── GET/POST /api/awq/erp/expenses — Expense Reports ────────────────────────
//
// GET  → { success: true, data: ExpenseReport[] }
// POST { action: "upsert", expense: ExpenseReport } → upsert one report
// POST { action: "delete", id: string }             → delete one report

import { NextRequest, NextResponse } from "next/server";
import {
  getExpenseReports,
  upsertExpenseReport,
  deleteExpenseReport,
  initERPDB,
  type ExpenseReport,
} from "@/lib/erp-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initERPDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getExpenseReports(bu));
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
      const expense = body.expense as ExpenseReport;
      if (!expense?.id) return err("expense.id required");
      await upsertExpenseReport(expense);
      return ok({ id: expense.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteExpenseReport(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
