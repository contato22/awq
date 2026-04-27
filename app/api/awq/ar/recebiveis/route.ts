// GET  /api/awq/ar/recebiveis
// POST /api/awq/ar/recebiveis

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listARReceivables, createARReceivable } from "@/lib/ar-db";
import type { PaymentMethod, ARStatus, CollectionStage } from "@/lib/ar-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "ar_module", "AR — Recebíveis");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const items = await listARReceivables({
    bu:          searchParams.get("bu")          ?? undefined,
    status:      searchParams.get("status")      ?? undefined,
    customer_id: searchParams.get("customer_id") ?? undefined,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "ar_module", "AR — Recebíveis");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  try {
    const body     = await req.json() as Record<string, unknown>;
    const str      = (k: string, def = "") => String(body[k] ?? def).trim();
    const num      = (k: string, def = 0)  => Number(body[k] ?? def) || def;
    const bool     = (k: string, def = false) => body[k] != null ? Boolean(body[k]) : def;
    const nullable = (k: string) => str(k) || null;

    if (!str("description")) return NextResponse.json({ error: "description é obrigatório" }, { status: 400 });
    if (!str("due_date"))    return NextResponse.json({ error: "due_date é obrigatório" },    { status: 400 });
    if (!body.net_amount)    return NextResponse.json({ error: "net_amount é obrigatório" },  { status: 400 });

    const gross = Number(body.gross_amount ?? body.net_amount ?? 0) || 0;
    const net   = Number(body.net_amount   ?? body.gross_amount ?? 0) || 0;

    const item = await createARReceivable({
      customer_id:            nullable("customer_id"),
      bu:                     str("bu", "awq"),
      nf_number:              str("nf_number"),
      nf_series:              str("nf_series"),
      nf_date:                nullable("nf_date"),
      nf_key:                 str("nf_key"),
      service_code:           str("service_code"),
      description:            str("description"),
      gross_amount:           gross,
      discount_amount:        num("discount_amount"),
      iss_amount:             num("iss_amount"),
      pis_amount:             num("pis_amount"),
      cofins_amount:          num("cofins_amount"),
      net_amount:             net,
      due_date:               str("due_date"),
      installment_number:     num("installment_number", 1),
      installment_total:      num("installment_total", 1),
      payment_method:         str("payment_method", "pix") as PaymentMethod,
      boleto_number:          str("boleto_number"),
      boleto_barcode:         str("boleto_barcode"),
      boleto_url:             str("boleto_url"),
      received_date:          nullable("received_date"),
      received_amount:        body.received_amount != null ? Number(body.received_amount) : null,
      bank_fee:               num("bank_fee"),
      net_received:           body.net_received   != null ? Number(body.net_received)    : null,
      bank_transaction_id:    str("bank_transaction_id"),
      reconciled:             bool("reconciled"),
      reconciled_at:          nullable("reconciled_at"),
      status:                 str("status", "pending") as ARStatus,
      days_overdue:           num("days_overdue"),
      collection_stage:       str("collection_stage", "none") as CollectionStage,
      last_collection_action: nullable("last_collection_action"),
      next_collection_action: nullable("next_collection_action"),
      notes:                  str("notes"),
      created_by:             str("created_by"),
      updated_by:             str("created_by"),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
