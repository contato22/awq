// PATCH /api/transactions/[id]
// Updates reconciliation status, category, counterparty, or linked AP/AR on a bank transaction.

import { NextRequest, NextResponse } from "next/server";
import { updateTransaction } from "@/lib/financial-db";
import type { BankTransaction } from "@/lib/financial-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const id = params.id;
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  let patch: Partial<BankTransaction>;
  try {
    patch = await req.json() as Partial<BankTransaction>;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  // Whitelist patchable fields
  const allowed: (keyof BankTransaction)[] = [
    "reconciliationStatus",
    "managerialCategory",
    "classificationConfidence",
    "classificationNote",
    "counterpartyName",
    "isIntercompany",
    "excludedFromConsolidated",
    "intercompanyMatchId",
    "classifiedAt",
  ];
  const safe = Object.fromEntries(
    Object.entries(patch).filter(([k]) => allowed.includes(k as keyof BankTransaction))
  ) as Partial<BankTransaction>;

  try {
    await updateTransaction(id, safe);
    return NextResponse.json({ success: true, id, patch: safe });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
