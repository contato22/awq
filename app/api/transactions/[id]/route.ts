// ─── PATCH /api/transactions/[id] ────────────────────────────────────────────
// Updates a single bank transaction (reconciliation status, category, etc).
// Called by BankReconciliationBoard when the user clicks "Conciliar" or edits a row.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { updateTransaction, getAllTransactions } from "@/lib/financial-db";
import type { BankTransaction } from "@/lib/financial-db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const authToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!authToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({})) as Partial<BankTransaction>;

  // Whitelist mutable fields — identity/bank fields are immutable after import
  const patch: Partial<BankTransaction> = {};
  if (body.reconciliationStatus     !== undefined) patch.reconciliationStatus     = body.reconciliationStatus;
  if (body.managerialCategory        !== undefined) patch.managerialCategory        = body.managerialCategory;
  if (body.counterpartyName          !== undefined) patch.counterpartyName          = body.counterpartyName;
  if (body.classificationNote        !== undefined) patch.classificationNote        = body.classificationNote;
  if (body.classificationConfidence  !== undefined) patch.classificationConfidence  = body.classificationConfidence;
  if (body.excludedFromConsolidated  !== undefined) patch.excludedFromConsolidated  = body.excludedFromConsolidated;
  if (body.isIntercompany            !== undefined) patch.isIntercompany            = body.isIntercompany;
  if (body.intercompanyMatchId       !== undefined) patch.intercompanyMatchId       = body.intercompanyMatchId;
  if (body.classifiedAt              !== undefined) patch.classifiedAt              = body.classifiedAt;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nenhum campo editável informado" }, { status: 400 });
  }

  // Stamp classifiedAt automatically when category or status changes
  if ((patch.reconciliationStatus || patch.managerialCategory) && !patch.classifiedAt) {
    patch.classifiedAt = new Date().toISOString();
  }

  try {
    await updateTransaction(id, patch);

    // Return the updated record so the client can merge it into local state
    const all = await getAllTransactions();
    const updated = all.find((t) => t.id === id);
    if (!updated) {
      return NextResponse.json({ error: "Transação não encontrada após update" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/transactions/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao atualizar transação" },
      { status: 500 },
    );
  }
}
