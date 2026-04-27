// ─── GET /api/suppliers  — listar fornecedores
// ─── POST /api/suppliers — criar fornecedor

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { ownerOnly } from "@/lib/owner-only";
import { initSuppliersDB, listSuppliers, createSupplier, nextSupplierCode } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = (await apiGuard(req, "view", "financeiro", "Fornecedores")) ?? (await ownerOnly(req));
  if (denied) return denied;
  if (!sql) return NextResponse.json([], { status: 200 });

  await initSuppliersDB();

  const { searchParams } = new URL(req.url);
  const suppliers = await listSuppliers({
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = (await apiGuard(req, "create", "financeiro", "Fornecedores")) ?? (await ownerOnly(req));
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();

  const body = await req.json() as Record<string, unknown>;
  if (!body.legal_name || !body.document_number || !body.document_type) {
    return NextResponse.json({ error: "legal_name, document_number e document_type são obrigatórios" }, { status: 400 });
  }

  const code = (body.supplier_code as string) || (await nextSupplierCode());

  const supplier = await createSupplier({
    supplier_code:            code,
    legal_name:               String(body.legal_name),
    trade_name:               body.trade_name ? String(body.trade_name) : undefined,
    document_type:            (body.document_type as "cpf" | "cnpj"),
    document_number:          String(body.document_number).replace(/\D/g, ""),
    state_registration:       body.state_registration ? String(body.state_registration) : undefined,
    municipal_registration:   body.municipal_registration ? String(body.municipal_registration) : undefined,
    supplier_type:            body.supplier_type ? (body.supplier_type as never) : undefined,
    industry:                 body.industry ? String(body.industry) : undefined,
    category:                 body.category ? String(body.category) : undefined,
    primary_contact_name:     body.primary_contact_name ? String(body.primary_contact_name) : undefined,
    primary_contact_email:    body.primary_contact_email ? String(body.primary_contact_email) : undefined,
    primary_contact_phone:    body.primary_contact_phone ? String(body.primary_contact_phone) : undefined,
    secondary_contact_name:   body.secondary_contact_name ? String(body.secondary_contact_name) : undefined,
    secondary_contact_email:  body.secondary_contact_email ? String(body.secondary_contact_email) : undefined,
    secondary_contact_phone:  body.secondary_contact_phone ? String(body.secondary_contact_phone) : undefined,
    address_street:           body.address_street ? String(body.address_street) : undefined,
    address_number:           body.address_number ? String(body.address_number) : undefined,
    address_complement:       body.address_complement ? String(body.address_complement) : undefined,
    address_neighborhood:     body.address_neighborhood ? String(body.address_neighborhood) : undefined,
    address_city:             body.address_city ? String(body.address_city) : undefined,
    address_state:            body.address_state ? String(body.address_state) : undefined,
    address_zip_code:         body.address_zip_code ? String(body.address_zip_code) : undefined,
    address_country:          body.address_country ? String(body.address_country) : "BRA",
    bank_code:                body.bank_code ? String(body.bank_code) : undefined,
    bank_name:                body.bank_name ? String(body.bank_name) : undefined,
    bank_branch:              body.bank_branch ? String(body.bank_branch) : undefined,
    bank_account:             body.bank_account ? String(body.bank_account) : undefined,
    bank_account_type:        body.bank_account_type ? (body.bank_account_type as never) : undefined,
    bank_account_holder:      body.bank_account_holder ? String(body.bank_account_holder) : undefined,
    pix_key_type:             body.pix_key_type ? (body.pix_key_type as never) : undefined,
    pix_key:                  body.pix_key ? String(body.pix_key) : undefined,
    default_payment_terms:    body.default_payment_terms ? (body.default_payment_terms as never) : undefined,
    default_payment_method:   body.default_payment_method ? (body.default_payment_method as never) : undefined,
    credit_limit:             body.credit_limit != null ? Number(body.credit_limit) : undefined,
    current_debt:             Number(body.current_debt ?? 0),
    risk_rating:              body.risk_rating ? (body.risk_rating as never) : undefined,
    is_blocked:               Boolean(body.is_blocked ?? false),
    block_reason:             body.block_reason ? String(body.block_reason) : undefined,
    requires_nf:              body.requires_nf !== false,
    withhold_irrf:            Boolean(body.withhold_irrf ?? false),
    withhold_iss:             Boolean(body.withhold_iss ?? false),
    withhold_inss:            Boolean(body.withhold_inss ?? false),
    withhold_pis_cofins_csll: Boolean(body.withhold_pis_cofins_csll ?? false),
    avg_delivery_days:        body.avg_delivery_days != null ? Number(body.avg_delivery_days) : undefined,
    quality_rating:           body.quality_rating != null ? Number(body.quality_rating) : undefined,
    on_time_delivery_rate:    body.on_time_delivery_rate != null ? Number(body.on_time_delivery_rate) : undefined,
    status:                   (body.status as never) ?? "active",
    relationship_start_date:  body.relationship_start_date ? String(body.relationship_start_date) : undefined,
    relationship_end_date:    body.relationship_end_date ? String(body.relationship_end_date) : undefined,
    notes:                    body.notes ? String(body.notes) : undefined,
    created_by:               body.created_by ? String(body.created_by) : undefined,
    updated_by:               body.created_by ? String(body.created_by) : undefined,
  });

  return NextResponse.json(supplier, { status: 201 });
}
