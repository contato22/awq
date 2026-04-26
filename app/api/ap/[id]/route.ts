// ─── GET /api/ap/[id]    — buscar AP
// ─── PUT /api/ap/[id]    — atualizar AP
// ─── DELETE /api/ap/[id] — cancelar AP

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initAPDB, getAP, updateAP } from "@/lib/ap-db";
import { initSuppliersDB } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "financeiro", "Contas a Pagar");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  await initAPDB();

  const { id } = await ctx.params;
  const item = await getAP(Number(id));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "financeiro", "Contas a Pagar");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  await initAPDB();

  const { id }  = await ctx.params;
  const body    = await req.json() as Record<string, unknown>;
  const by      = body.updated_by ? String(body.updated_by) : undefined;

  const gross   = body.gross_amount != null ? Number(body.gross_amount) : undefined;
  const discount = body.discount_amount != null ? Number(body.discount_amount) : undefined;
  const irrf    = body.irrf_withheld != null ? Number(body.irrf_withheld) : undefined;
  const iss     = body.iss_withheld != null ? Number(body.iss_withheld) : undefined;
  const inss    = body.inss_withheld != null ? Number(body.inss_withheld) : undefined;
  const pisCsll = body.pis_cofins_csll_withheld != null ? Number(body.pis_cofins_csll_withheld) : undefined;

  // recompute net if gross or withholdings changed
  let net: number | undefined = body.net_amount != null ? Number(body.net_amount) : undefined;
  if (gross !== undefined && net === undefined) {
    const current = await getAP(Number(id));
    if (current) {
      net = gross
        - (discount ?? current.discount_amount)
        - (irrf    ?? current.irrf_withheld)
        - (iss     ?? current.iss_withheld)
        - (inss    ?? current.inss_withheld)
        - (pisCsll ?? current.pis_cofins_csll_withheld);
    }
  }

  const patch: Record<string, unknown> = {};
  const scalars = [
    "supplier_id","bu","project_id","purchase_order_id",
    "document_type","document_number","document_series","document_date","nf_key",
    "due_date","installment_number","installment_total",
    "payment_method","payment_date","paid_amount","payment_reference",
    "payment_bank_code","payment_bank_branch","payment_bank_account",
    "status","requires_approval","approved_by","approved_at","approval_level",
    "cost_center","description","notes",
  ];

  for (const f of scalars) {
    if (f in body) patch[f] = body[f];
  }
  if (gross    !== undefined) patch.gross_amount             = gross;
  if (discount !== undefined) patch.discount_amount          = discount;
  if (irrf     !== undefined) patch.irrf_withheld            = irrf;
  if (iss      !== undefined) patch.iss_withheld             = iss;
  if (inss     !== undefined) patch.inss_withheld            = inss;
  if (pisCsll  !== undefined) patch.pis_cofins_csll_withheld = pisCsll;
  if (net      !== undefined) patch.net_amount               = net;

  const updated = await updateAP(Number(id), patch as never, by);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "financeiro", "Contas a Pagar");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  await initAPDB();

  const { id } = await ctx.params;
  const body   = await req.json().catch(() => ({})) as Record<string, unknown>;
  const by     = body.by ? String(body.by) : undefined;

  await updateAP(Number(id), { status: "cancelled" }, by);
  return NextResponse.json({ ok: true });
}
