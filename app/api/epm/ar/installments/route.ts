import { NextRequest, NextResponse } from "next/server";
import { createARInstallments, initAPARDB, type BuCode } from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initAPARDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const {
      bu_code, customer_name, description, category,
      reference_doc, issue_date, due_date, gross_amount,
      customer_doc, iss_rate, total_installments, source_system, created_by,
    } = body;

    if (!bu_code || !customer_name || !description || !due_date || !gross_amount || !total_installments)
      return err("bu_code, customer_name, description, due_date, gross_amount and total_installments are required");
    if (typeof total_installments !== "number" || total_installments < 2 || total_installments > 60)
      return err("total_installments must be between 2 and 60");
    if (typeof gross_amount !== "number" || gross_amount <= 0)
      return err("gross_amount must be a positive number");

    const items = await createARInstallments({
      bu_code: bu_code as BuCode,
      customer_name, customer_doc, description,
      category: category ?? "Serviço Recorrente",
      reference_doc,
      issue_date: issue_date ?? new Date().toISOString().slice(0, 10),
      due_date, gross_amount, iss_rate,
      total_installments,
      source_system, created_by,
    });

    return ok(items);
  } catch (e) { return err(String(e)); }
}
