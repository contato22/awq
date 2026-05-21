// POST /api/cora/billet
//   { action: "create", opportunity_id, amount, due_date, payer_name, payer_document,
//                        description?, reference_code?, account? }
//   { action: "cancel",  billet_id }
//   { action: "refresh", billet_id }
//
// GET  /api/cora/billet?opportunity_id=xxx

import { NextRequest, NextResponse } from "next/server";
import { createCoraBillet, getCoraBillet, cancelCoraBillet } from "@/lib/cora-api";
import { erpAdmin, erpAnon } from "@/lib/supabase";
import type { CoraBillet } from "@/lib/crm-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = erpAdmin ?? erpAnon;

// ─── GET — list billets for an opportunity ────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const opportunityId = req.nextUrl.searchParams.get("opportunity_id");
  if (!opportunityId) {
    return NextResponse.json({ success: false, error: "opportunity_id obrigatório" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ success: false, error: "DB não configurado" }, { status: 503 });
  }

  const { data, error } = await db
    .from("cora_billets")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data as CoraBillet[] });
}

// ─── POST — create / cancel / refresh ────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "create") return handleCreate(body);
  if (action === "cancel") return handleCancel(body);
  if (action === "refresh") return handleRefresh(body);

  return NextResponse.json({ success: false, error: `Ação desconhecida: ${action}` }, { status: 400 });
}

// ─── Create ───────────────────────────────────────────────────────────────────

async function handleCreate(body: Record<string, unknown>): Promise<NextResponse> {
  const opportunityId  = String(body.opportunity_id ?? "");
  const amount         = Number(body.amount);
  const dueDate        = String(body.due_date ?? "");
  const payerName      = String(body.payer_name ?? "");
  const payerDocument  = String(body.payer_document ?? "").replace(/\D/g, "");
  const description    = body.description ? String(body.description) : undefined;
  const account        = (body.account as "AWQ_Holding" | "JACQES") ?? "AWQ_Holding";

  if (!opportunityId || !amount || !dueDate || !payerName || !payerDocument) {
    return NextResponse.json(
      { success: false, error: "Campos obrigatórios: opportunity_id, amount, due_date, payer_name, payer_document" },
      { status: 400 },
    );
  }

  if (amount <= 0) {
    return NextResponse.json({ success: false, error: "Valor deve ser maior que zero" }, { status: 400 });
  }

  try {
    const result = await createCoraBillet({
      amount,
      due_date: dueDate,
      payer: { name: payerName, document: payerDocument },
      description,
      reference_code: opportunityId,
      account,
    });

    const row: Omit<CoraBillet, "billet_id"> = {
      opportunity_id:  opportunityId,
      cora_invoice_id: result.id,
      cora_account:    account,
      amount:          result.amount,
      due_date:        result.due_date || dueDate,
      status:          result.status,
      barcode:         result.barcode,
      pix_key:         result.pix_key,
      pdf_url:         result.pdf_url,
      payer_name:      payerName,
      payer_document:  payerDocument,
      description:     description ?? null,
      created_at:      result.created_at,
      paid_at:         result.paid_at,
    };

    if (db) {
      const { data: saved, error: dbErr } = await db
        .from("cora_billets")
        .insert(row)
        .select()
        .single();

      if (dbErr) {
        console.error("[billet] DB insert error:", dbErr.message);
        // Return the Cora result anyway so the user sees the barcode
        return NextResponse.json({ success: true, data: row, warning: "Salvo apenas na Cora (DB error)" });
      }

      return NextResponse.json({ success: true, data: saved as CoraBillet });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

async function handleCancel(body: Record<string, unknown>): Promise<NextResponse> {
  const billetId = String(body.billet_id ?? "");
  if (!billetId) {
    return NextResponse.json({ success: false, error: "billet_id obrigatório" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ success: false, error: "DB não configurado" }, { status: 503 });
  }

  const { data: existing, error: fetchErr } = await db
    .from("cora_billets")
    .select("*")
    .eq("billet_id", billetId)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ success: false, error: "Boleto não encontrado" }, { status: 404 });
  }

  const billet = existing as CoraBillet;

  try {
    await cancelCoraBillet(billet.cora_invoice_id, billet.cora_account);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }

  const { data: updated, error: updErr } = await db
    .from("cora_billets")
    .update({ status: "CANCELLED" })
    .eq("billet_id", billetId)
    .select()
    .single();

  if (updErr) {
    return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: updated as CoraBillet });
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

async function handleRefresh(body: Record<string, unknown>): Promise<NextResponse> {
  const billetId = String(body.billet_id ?? "");
  if (!billetId) {
    return NextResponse.json({ success: false, error: "billet_id obrigatório" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ success: false, error: "DB não configurado" }, { status: 503 });
  }

  const { data: existing, error: fetchErr } = await db
    .from("cora_billets")
    .select("*")
    .eq("billet_id", billetId)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ success: false, error: "Boleto não encontrado" }, { status: 404 });
  }

  const billet = existing as CoraBillet;

  try {
    const fresh = await getCoraBillet(billet.cora_invoice_id, billet.cora_account);

    const { data: updated, error: updErr } = await db
      .from("cora_billets")
      .update({
        status:  fresh.status,
        paid_at: fresh.paid_at,
        barcode: fresh.barcode ?? billet.barcode,
        pdf_url: fresh.pdf_url ?? billet.pdf_url,
        pix_key: fresh.pix_key ?? billet.pix_key,
      })
      .eq("billet_id", billetId)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated as CoraBillet });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
