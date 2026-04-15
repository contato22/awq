// ─── PATCH /api/transactions/[id] ────────────────────────────────────────────
// Allows the reconciliation UI to update classification and status fields.
//
// ALLOWED fields (reconciliation-writable):
//   managerialCategory, classificationNote, counterpartyName,
//   classificationConfidence, isIntercompany, excludedFromConsolidated,
//   reconciliationStatus
//
// PROTECTED fields (immutable after extraction):
//   amount, transactionDate, descriptionOriginal, documentId,
//   accountName, bank, entity, direction, id
//
// Returns the full updated transaction on success.

import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions, updateTransaction } from "@/lib/financial-db";
import type { ManagerialCategory, ClassificationConfidence, ReconciliationStatus } from "@/lib/financial-db";

const PROTECTED = new Set([
  "amount", "transactionDate", "descriptionOriginal", "documentId",
  "accountName", "bank", "entity", "direction", "id", "runningBalance",
  "intercompanyMatchId", "extractedAt",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  // Reject attempts to modify protected fields
  const forbidden = Object.keys(body).filter((k) => PROTECTED.has(k));
  if (forbidden.length > 0) {
    return NextResponse.json(
      { error: `Campos protegidos não podem ser alterados: ${forbidden.join(", ")}` },
      { status: 400 }
    );
  }

  // Build a typed patch — only accept known reconciliation fields
  const patch: Partial<{
    managerialCategory: ManagerialCategory;
    classificationNote: string | null;
    counterpartyName: string | null;
    classificationConfidence: ClassificationConfidence;
    isIntercompany: boolean;
    excludedFromConsolidated: boolean;
    reconciliationStatus: ReconciliationStatus;
    classifiedAt: string;
  }> = {};

  if ("managerialCategory" in body)       patch.managerialCategory       = body.managerialCategory as ManagerialCategory;
  if ("classificationNote" in body)       patch.classificationNote       = body.classificationNote as string | null;
  if ("counterpartyName" in body)         patch.counterpartyName         = body.counterpartyName as string | null;
  if ("classificationConfidence" in body) patch.classificationConfidence = body.classificationConfidence as ClassificationConfidence;
  if ("isIntercompany" in body)           patch.isIntercompany           = Boolean(body.isIntercompany);
  if ("excludedFromConsolidated" in body) patch.excludedFromConsolidated = Boolean(body.excludedFromConsolidated);
  if ("reconciliationStatus" in body)     patch.reconciliationStatus     = body.reconciliationStatus as ReconciliationStatus;

  // Always stamp classifiedAt when reconciliation fields change
  patch.classifiedAt = new Date().toISOString();

  try {
    await updateTransaction(id, patch);

    // Return the updated record so the UI can reflect it immediately
    const all = await getAllTransactions();
    const updated = all.find((t) => t.id === id);
    if (!updated) {
      return NextResponse.json({ error: "Transação não encontrada após salvar" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/transactions/${id}]`, err);
    return NextResponse.json({ error: "Falha ao salvar transação" }, { status: 500 });
  }
}
