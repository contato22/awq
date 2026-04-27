// GET  /api/awq/ar/clientes
// POST /api/awq/ar/clientes

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listARCustomers, createARCustomer } from "@/lib/ar-db";
import type { ARCustomerType, PaymentTerms, PaymentMethod, RiskRating, ARCustomerStatus } from "@/lib/ar-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "ar_module", "AR — Clientes");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const customers = await listARCustomers({
    bu:     searchParams.get("bu")     ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "ar_module", "AR — Clientes");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const str  = (k: string, def = "") => String(body[k] ?? def).trim();
    const num  = (k: string, def = 0)  => Number(body[k] ?? def) || def;
    const bool = (k: string, def = false) => body[k] != null ? Boolean(body[k]) : def;
    const nullable = (k: string) => str(k) || null;

    if (!str("legal_name"))     return NextResponse.json({ error: "legal_name é obrigatório" },     { status: 400 });
    if (!str("document_number")) return NextResponse.json({ error: "document_number é obrigatório" }, { status: 400 });

    const customer = await createARCustomer({
      legal_name:                   str("legal_name"),
      trade_name:                   str("trade_name"),
      document_type:                str("document_type", "cnpj"),
      document_number:              str("document_number"),
      state_registration:           str("state_registration"),
      municipal_registration:       str("municipal_registration"),
      customer_type:                str("customer_type", "b2b") as ARCustomerType,
      industry:                     str("industry"),
      segment:                      str("segment"),
      primary_contact_name:         str("primary_contact_name"),
      primary_contact_email:        str("primary_contact_email"),
      primary_contact_phone:        str("primary_contact_phone"),
      billing_contact_name:         str("billing_contact_name"),
      billing_contact_email:        str("billing_contact_email"),
      billing_contact_phone:        str("billing_contact_phone"),
      address_street:               str("address_street"),
      address_number:               str("address_number"),
      address_complement:           str("address_complement"),
      address_neighborhood:         str("address_neighborhood"),
      address_city:                 str("address_city"),
      address_state:                str("address_state"),
      address_zip_code:             str("address_zip_code"),
      address_country:              str("address_country", "BRA"),
      billing_address_same_as_main: bool("billing_address_same_as_main", true),
      billing_address_street:       str("billing_address_street"),
      billing_address_number:       str("billing_address_number"),
      billing_address_complement:   str("billing_address_complement"),
      billing_address_neighborhood: str("billing_address_neighborhood"),
      billing_address_city:         str("billing_address_city"),
      billing_address_state:        str("billing_address_state"),
      billing_address_zip_code:     str("billing_address_zip_code"),
      default_payment_terms:        str("default_payment_terms", "30_days") as PaymentTerms,
      default_payment_method:       str("default_payment_method", "pix") as PaymentMethod,
      price_table:                  str("price_table"),
      discount_percentage:          num("discount_percentage"),
      banco:                        str("banco"),
      agencia:                      str("agencia"),
      conta:                        str("conta"),
      pix_key:                      str("pix_key"),
      credit_limit:                 num("credit_limit"),
      current_receivable:           num("current_receivable"),
      credit_score:                 num("credit_score", 500),
      credit_analysis_date:         nullable("credit_analysis_date"),
      risk_rating:                  str("risk_rating", "medium") as RiskRating,
      avg_days_to_pay:              num("avg_days_to_pay"),
      on_time_payment_rate:         num("on_time_payment_rate", 100),
      total_revenue_lifetime:       num("total_revenue_lifetime"),
      last_purchase_date:           nullable("last_purchase_date"),
      status:                       str("status", "active") as ARCustomerStatus,
      is_blocked:                   bool("is_blocked"),
      block_reason:                 str("block_reason"),
      relationship_start_date:      nullable("relationship_start_date"),
      relationship_end_date:        nullable("relationship_end_date"),
      bu:                           str("bu", "awq"),
      notes:                        str("notes"),
      created_by:                   str("created_by"),
      updated_by:                   str("created_by"),
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
