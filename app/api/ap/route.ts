// ─── GET /api/ap  — listar contas a pagar
// ─── POST /api/ap — criar conta a pagar

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { ownerOnly } from "@/lib/owner-only";
import { initAPDB, listAP, createAP, refreshOverdueAP } from "@/lib/ap-db";
import { initSuppliersDB } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = (await apiGuard(req, "view", "financeiro", "Contas a Pagar")) ?? (await ownerOnly(req));
  if (denied) return denied;
  if (!sql) return NextResponse.json([], { status: 200 });

  await initSuppliersDB();
  await initAPDB();
  await refreshOverdueAP();

  const { searchParams } = new URL(req.url);
  const items = await listAP({
    bu:          searchParams.get("bu")          ?? undefined,
    status:      (searchParams.get("status")     ?? undefined) as never,
    supplier_id: searchParams.get("supplier_id") ? Number(searchParams.get("supplier_id")) : undefined,
    from:        searchParams.get("from")        ?? undefined,
    to:          searchParams.get("to")          ?? undefined,
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = (await apiGuard(req, "create", "financeiro", "Contas a Pagar")) ?? (await ownerOnly(req));
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  await initAPDB();

  const body = await req.json() as Record<string, unknown>;

  if (!body.supplier_id || !body.gross_amount || !body.due_date) {
    return NextResponse.json({ error: "supplier_id, gross_amount e due_date são obrigatórios" }, { status: 400 });
  }

  const gross    = Number(body.gross_amount);
  const discount = Number(body.discount_amount ?? 0);
  const irrf     = Number(body.irrf_withheld ?? 0);
  const iss      = Number(body.iss_withheld ?? 0);
  const inss     = Number(body.inss_withheld ?? 0);
  const pisCsll  = Number(body.pis_cofins_csll_withheld ?? 0);
  const net      = body.net_amount != null
    ? Number(body.net_amount)
    : gross - discount - irrf - iss - inss - pisCsll;

  const item = await createAP({
    supplier_id:              Number(body.supplier_id),
    bu:                       String(body.bu ?? "financeiro"),
    project_id:               body.project_id != null ? Number(body.project_id) : undefined,
    purchase_order_id:        body.purchase_order_id != null ? Number(body.purchase_order_id) : undefined,
    document_type:            body.document_type ? (body.document_type as never) : undefined,
    document_number:          body.document_number ? String(body.document_number) : undefined,
    document_series:          body.document_series ? String(body.document_series) : undefined,
    document_date:            body.document_date ? String(body.document_date) : undefined,
    nf_key:                   body.nf_key ? String(body.nf_key) : undefined,
    gross_amount:             gross,
    discount_amount:          discount,
    irrf_withheld:            irrf,
    iss_withheld:             iss,
    inss_withheld:            inss,
    pis_cofins_csll_withheld: pisCsll,
    net_amount:               net,
    due_date:                 String(body.due_date),
    installment_number:       body.installment_number != null ? Number(body.installment_number) : undefined,
    installment_total:        body.installment_total  != null ? Number(body.installment_total)  : undefined,
    payment_method:           body.payment_method ? (body.payment_method as never) : undefined,
    payment_date:             body.payment_date ? String(body.payment_date) : undefined,
    paid_amount:              body.paid_amount != null ? Number(body.paid_amount) : undefined,
    payment_reference:        body.payment_reference ? String(body.payment_reference) : undefined,
    payment_bank_code:        body.payment_bank_code ? String(body.payment_bank_code) : undefined,
    payment_bank_branch:      body.payment_bank_branch ? String(body.payment_bank_branch) : undefined,
    payment_bank_account:     body.payment_bank_account ? String(body.payment_bank_account) : undefined,
    status:                   (body.status as never) ?? "pending",
    requires_approval:        body.requires_approval !== false,
    approved_by:              body.approved_by ? String(body.approved_by) : undefined,
    approved_at:              body.approved_at ? String(body.approved_at) : undefined,
    approval_level:           body.approval_level != null ? Number(body.approval_level) : undefined,
    cost_center:              body.cost_center ? String(body.cost_center) : undefined,
    description:              body.description ? String(body.description) : undefined,
    notes:                    body.notes ? String(body.notes) : undefined,
    created_by:               body.created_by ? String(body.created_by) : undefined,
    updated_by:               body.created_by ? String(body.created_by) : undefined,
  }, body.created_by ? String(body.created_by) : undefined);

  return NextResponse.json(item, { status: 201 });
}
