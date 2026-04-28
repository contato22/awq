// ─── API /api/epm/ar — Accounts Receivable CRUD ───────────────────────────────
// GET  /api/epm/ar?bu_code=&status=&view=kpis
// POST /api/epm/ar  { ...NewARInput }
// PATCH /api/epm/ar { id, action: "receive"|"cancel"|"delete", ...receiptData }
//
// Response: { success: boolean, data: T, error?: string }

import { NextRequest, NextResponse } from "next/server";
import {
  getAllAR,
  addAR,
  receiveAR,
  cancelAR,
  deleteAR,
  getAPARKPIs,
  initAPARDB,
  type BuCode,
  type ARStatus,
} from "@/lib/ap-ar-db";

let _dbReady = false;
async function ensureDB() {
  if (!_dbReady) { await initAPARDB(); _dbReady = true; }
}

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp      = req.nextUrl.searchParams;
    const view    = sp.get("view");
    const bu_code = (sp.get("bu_code") ?? undefined) as BuCode | undefined;
    const status  = (sp.get("status")  ?? undefined) as ARStatus | undefined;

    if (view === "kpis") {
      return ok(await getAPARKPIs(bu_code));
    }

    return ok(await getAllAR(bu_code || status ? { bu_code, status } : undefined));
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const {
      bu_code, customer_name, description, category,
      reference_doc, issue_date, due_date, gross_amount,
      customer_doc, iss_rate, source_system, created_by,
    } = body;

    if (!bu_code || !customer_name || !description || !due_date || !gross_amount)
      return err("bu_code, customer_name, description, due_date and gross_amount are required");
    if (typeof gross_amount !== "number" || gross_amount <= 0)
      return err("gross_amount must be a positive number");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date))
      return err("due_date must be YYYY-MM-DD");

    const item = await addAR({
      bu_code, customer_name, customer_doc, description,
      category: category ?? "Serviço Recorrente",
      reference_doc, issue_date: issue_date ?? new Date().toISOString().slice(0, 10), due_date,
      gross_amount, iss_rate, source_system, created_by,
    });

    return ok(item);
  } catch (e) {
    return err(String(e));
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { id, action } = body;

    if (!id || !action) return err("id and action are required");

    if (action === "receive") {
      const { received_date, received_amount, receipt_ref } = body;
      if (!received_date || !received_amount)
        return err("received_date and received_amount are required for action=receive");
      const item = await receiveAR(id, { received_date, received_amount, receipt_ref });
      if (!item) return err("AR item not found", 404);
      return ok(item);
    }

    if (action === "cancel") {
      const ok2 = await cancelAR(id);
      if (!ok2) return err("AR item not found", 404);
      return ok({ id, status: "CANCELLED" });
    }

    if (action === "delete") {
      const ok2 = await deleteAR(id);
      if (!ok2) return err("AR item not found", 404);
      return ok({ id, deleted: true });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e));
  }
}
