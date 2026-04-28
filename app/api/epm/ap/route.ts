// ─── API /api/epm/ap — Accounts Payable CRUD ─────────────────────────────────
// GET  /api/epm/ap?bu_code=&status=&view=kpis
// POST /api/epm/ap  { ...NewAPInput }
// PATCH /api/epm/ap { id, action: "pay"|"cancel"|"delete", ...paymentData }
//
// Response: { success: boolean, data: T, error?: string }

import { NextRequest, NextResponse } from "next/server";
import {
  getAllAP,
  addAP,
  payAP,
  cancelAP,
  deleteAP,
  getAPARKPIs,
  initAPARDB,
  type BuCode,
  type APStatus,
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
    const status  = (sp.get("status")  ?? undefined) as APStatus | undefined;

    if (view === "kpis") {
      return ok(await getAPARKPIs(bu_code));
    }

    return ok(await getAllAP(bu_code || status ? { bu_code, status } : undefined));
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const {
      bu_code, supplier_name, supplier_type, description, category,
      reference_doc, issue_date, due_date, gross_amount,
      supplier_doc, irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate,
      source_system, created_by,
    } = body;

    if (!bu_code || !supplier_name || !description || !due_date || !gross_amount)
      return err("bu_code, supplier_name, description, due_date and gross_amount are required");
    if (typeof gross_amount !== "number" || gross_amount <= 0)
      return err("gross_amount must be a positive number");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date))
      return err("due_date must be YYYY-MM-DD");

    const item = await addAP({
      bu_code, supplier_name, supplier_doc,
      supplier_type: supplier_type ?? "other",
      description, category: category ?? "Fornecedor",
      reference_doc, issue_date: issue_date ?? new Date().toISOString().slice(0, 10), due_date,
      gross_amount,
      irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate,
      source_system, created_by,
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

    if (action === "pay") {
      const { paid_date, paid_amount, payment_ref } = body;
      if (!paid_date || !paid_amount)
        return err("paid_date and paid_amount are required for action=pay");
      const item = await payAP(id, { paid_date, paid_amount, payment_ref });
      if (!item) return err("AP item not found", 404);
      return ok(item);
    }

    if (action === "cancel") {
      const ok2 = await cancelAP(id);
      if (!ok2) return err("AP item not found", 404);
      return ok({ id, status: "CANCELLED" });
    }

    if (action === "delete") {
      const ok2 = await deleteAP(id);
      if (!ok2) return err("AP item not found", 404);
      return ok({ id, deleted: true });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e));
  }
}
