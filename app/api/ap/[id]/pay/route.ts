// ─── POST /api/ap/[id]/pay — registrar pagamento de uma conta a pagar

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initAPDB, payAP } from "@/lib/ap-db";
import { initSuppliersDB } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "financeiro", "Contas a Pagar");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  await initAPDB();

  const { id } = await ctx.params;
  const body   = await req.json() as Record<string, unknown>;

  if (!body.payment_date || body.paid_amount == null) {
    return NextResponse.json({ error: "payment_date e paid_amount são obrigatórios" }, { status: 400 });
  }

  const updated = await payAP(
    Number(id),
    {
      payment_date:        String(body.payment_date),
      paid_amount:         Number(body.paid_amount),
      payment_method:      body.payment_method ? String(body.payment_method) : undefined,
      payment_reference:   body.payment_reference ? String(body.payment_reference) : undefined,
      payment_bank_code:   body.payment_bank_code ? String(body.payment_bank_code) : undefined,
      payment_bank_branch: body.payment_bank_branch ? String(body.payment_bank_branch) : undefined,
      payment_bank_account: body.payment_bank_account ? String(body.payment_bank_account) : undefined,
      notes:               body.notes ? String(body.notes) : undefined,
    },
    body.by ? String(body.by) : undefined,
  );

  return NextResponse.json(updated);
}
