// ─── GET /api/suppliers/[id]    — buscar fornecedor
// ─── PUT /api/suppliers/[id]    — atualizar fornecedor
// ─── DELETE /api/suppliers/[id] — inativar fornecedor (soft delete)

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initSuppliersDB, getSupplier, updateSupplier, softDeleteSupplier } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "financeiro", "Fornecedores");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  const { id } = await ctx.params;
  const supplier = await getSupplier(Number(id));
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PUT(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "financeiro", "Fornecedores");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  const { id } = await ctx.params;
  const body   = await req.json() as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  const fields = [
    "legal_name","trade_name","document_type","document_number","state_registration","municipal_registration",
    "supplier_type","industry","category",
    "primary_contact_name","primary_contact_email","primary_contact_phone",
    "secondary_contact_name","secondary_contact_email","secondary_contact_phone",
    "address_street","address_number","address_complement","address_neighborhood",
    "address_city","address_state","address_zip_code","address_country",
    "bank_code","bank_name","bank_branch","bank_account","bank_account_type","bank_account_holder",
    "pix_key_type","pix_key","default_payment_terms","default_payment_method",
    "credit_limit","current_debt","risk_rating","is_blocked","block_reason",
    "requires_nf","withhold_irrf","withhold_iss","withhold_inss","withhold_pis_cofins_csll",
    "avg_delivery_days","quality_rating","on_time_delivery_rate",
    "status","relationship_start_date","relationship_end_date","notes","updated_by",
  ];

  for (const f of fields) {
    if (f in body) patch[f] = body[f];
  }

  // sanitize document_number
  if (typeof patch.document_number === "string") {
    patch.document_number = patch.document_number.replace(/\D/g, "");
  }

  const updated = await updateSupplier(Number(id), patch as never);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "financeiro", "Fornecedores");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  const { id } = await ctx.params;
  const body   = await req.json().catch(() => ({})) as Record<string, unknown>;
  await softDeleteSupplier(Number(id), body.by ? String(body.by) : undefined);
  return NextResponse.json({ ok: true });
}
