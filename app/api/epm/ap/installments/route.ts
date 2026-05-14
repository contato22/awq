import { NextRequest, NextResponse } from "next/server";
import { createAPInstallments, initAPARDB, type BuCode, type SupplierType } from "@/lib/ap-ar-db";

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
      bu_code, supplier_name, supplier_type, description, category,
      reference_doc, issue_date, due_date, gross_amount,
      irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate,
      total_installments, source_system, created_by,
    } = body;

    if (!bu_code || !supplier_name || !description || !due_date || !gross_amount || !total_installments)
      return err("bu_code, supplier_name, description, due_date, gross_amount and total_installments are required");
    if (typeof total_installments !== "number" || total_installments < 2 || total_installments > 60)
      return err("total_installments must be between 2 and 60");
    if (typeof gross_amount !== "number" || gross_amount <= 0)
      return err("gross_amount must be a positive number");

    const items = await createAPInstallments({
      bu_code: bu_code as BuCode,
      supplier_name,
      supplier_type: (supplier_type ?? "other") as SupplierType,
      description,
      category: category ?? "Fornecedor",
      reference_doc,
      issue_date: issue_date ?? new Date().toISOString().slice(0, 10),
      due_date,
      gross_amount,
      irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate,
      total_installments,
      source_system,
      created_by,
    });

    return ok(items);
  } catch (e) { return err(String(e)); }
}
