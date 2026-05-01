// ─── API /api/epm/ar — Accounts Receivable CRUD ───────────────────────────────
// GET  /api/epm/ar?bu_code=&status=&view=kpis
// POST /api/epm/ar  { ...NewARInput }
// PATCH /api/epm/ar { id, action: "receive"|"cancel"|"delete"|"update", ... }
//
// Response: { success: boolean, data: T, error?: string }

import { NextRequest, NextResponse } from "next/server";
import {
  getAllAR,
  addAR,
  receiveAR,
  cancelAR,
  deleteAR,
  updateAR,
  getAPARKPIs,
  initAPARDB,
  type BuCode,
  type ARStatus,
  type ARUpdateInput,
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
      bu_code, customer_id, customer_name, customer_doc,
      description, category, cost_center, reference_doc,
      issue_date, due_date, gross_amount,
      ar_code, invoice_number, invoice_series, invoice_date,
      discount_amount,
      irrf_withheld_rate, inss_withheld_rate, iss_withheld_rate,
      pis_withheld_rate, cofins_withheld_rate, csll_withheld_rate,
      iss_rate, pis_rate, cofins_rate, irpj_amount, csll_amount,
      tax_regime, simples_rate,
      revenue_account_id, revenue_type, nature_of_operation,
      project_id, service_category, contract_type,
      revenue_recognition_date, service_period_start, service_period_end,
      accrual_month, is_deferred_revenue, deferred_periods,
      payment_method, bank_account_id, payment_reference,
      is_installment, installment_number, total_installments, parent_ar_id,
      is_recurring, recurrence_frequency, contract_value,
      contract_start_date, contract_end_date, mrr, arr,
      late_fee_rate, interest_rate,
      invoice_xml_url, invoice_pdf_url, danfe_url, contract_url,
      boleto_url, boleto_barcode,
      opportunity_id, sales_rep_id, commission_rate, commission_amount,
      notes, customer_notes, tags,
      source_system, created_by,
    } = body;

    if (!bu_code || !customer_name || !description || !due_date || !gross_amount)
      return err("bu_code, customer_name, description, due_date and gross_amount are required");
    if (typeof gross_amount !== "number" || gross_amount <= 0)
      return err("gross_amount must be a positive number");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date))
      return err("due_date must be YYYY-MM-DD");

    const item = await addAR({
      bu_code, customer_id, customer_name, customer_doc,
      description, category: category ?? "Serviço Recorrente",
      cost_center, reference_doc,
      issue_date: issue_date ?? new Date().toISOString().slice(0, 10),
      due_date, gross_amount,
      ar_code, invoice_number, invoice_series, invoice_date,
      discount_amount,
      irrf_withheld_rate, inss_withheld_rate, iss_withheld_rate,
      pis_withheld_rate, cofins_withheld_rate, csll_withheld_rate,
      iss_rate, pis_rate, cofins_rate, irpj_amount, csll_amount,
      tax_regime, simples_rate,
      revenue_account_id, revenue_type, nature_of_operation,
      project_id, service_category, contract_type,
      revenue_recognition_date, service_period_start, service_period_end,
      accrual_month, is_deferred_revenue, deferred_periods,
      payment_method, bank_account_id, payment_reference,
      is_installment, installment_number, total_installments, parent_ar_id,
      is_recurring, recurrence_frequency, contract_value,
      contract_start_date, contract_end_date, mrr, arr,
      late_fee_rate, interest_rate,
      invoice_xml_url, invoice_pdf_url, danfe_url, contract_url,
      boleto_url, boleto_barcode,
      opportunity_id, sales_rep_id, commission_rate, commission_amount,
      notes, customer_notes, tags,
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

    if (action === "receive") {
      const {
        received_date, received_amount, receipt_ref,
        payment_method, payment_reference,
      } = body;
      if (!received_date || !received_amount)
        return err("received_date and received_amount are required for action=receive");
      const item = await receiveAR(id, {
        received_date,
        received_amount,
        receipt_ref: receipt_ref ?? payment_reference,
      });
      if (!item) return err("AR item not found", 404);
      // Also persist payment_method if provided
      if (payment_method) {
        await updateAR(id, { payment_method, payment_reference: receipt_ref ?? payment_reference });
      }
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

    if (action === "update") {
      const updates: ARUpdateInput = {};
      const fields: (keyof ARUpdateInput)[] = [
        "customer_name", "description", "category", "cost_center", "reference_doc", "due_date",
        "invoice_number", "invoice_series", "invoice_date",
        "revenue_account_id", "revenue_type", "nature_of_operation",
        "project_id", "service_category", "contract_type",
        "accrual_month", "service_period_start", "service_period_end",
        "revenue_recognition_date", "is_deferred_revenue", "deferred_periods",
        "is_installment", "installment_number", "total_installments", "parent_ar_id",
        "is_recurring", "recurrence_frequency", "contract_value",
        "contract_start_date", "contract_end_date", "mrr", "arr",
        "payment_method", "bank_account_id", "payment_reference",
        "collection_status", "collection_attempts", "last_collection_date",
        "late_fee_rate", "late_fee_amount", "interest_rate", "interest_amount",
        "invoice_xml_url", "invoice_pdf_url", "danfe_url", "contract_url",
        "boleto_url", "boleto_barcode",
        "opportunity_id", "sales_rep_id", "commission_rate", "commission_amount", "commission_paid",
        "notes", "customer_notes", "tags", "updated_by",
      ];
      for (const f of fields) {
        if (body[f] !== undefined) (updates as Record<string, unknown>)[f] = body[f];
      }
      const item = await updateAR(id, updates);
      if (!item) return err("AR item not found", 404);
      return ok(item);
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e));
  }
}
