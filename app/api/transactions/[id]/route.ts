// ─── PATCH /api/transactions/[id] ────────────────────────────────────────────
//
// Updates classification metadata for a single bank transaction.
// Strict whitelist: NEVER updates amount, direction, transactionDate, or
// descriptionOriginal — raw financial data is immutable.
//
// Editable fields (classification only):
//   managerialCategory, classificationConfidence, classificationNote,
//   counterpartyName, cashflowClass, dreEffect, reconciliationStatus
//
// Used by ReconciliationReviewTable to resolve em_revisao/pendente items.
// Requires: owner / admin / finance role (dados_infra layer, edit action).

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { updateTransaction } from "@/lib/financial-db";
import type {
  CashflowClass,
  DREEffect,
  ReconciliationStatus,
  ManagerialCategory,
  ClassificationConfidence,
} from "@/lib/financial-db";

export const runtime = "nodejs";

type PatchBody = {
  managerialCategory?:       ManagerialCategory;
  classificationConfidence?: ClassificationConfidence;
  classificationNote?:       string | null;
  counterpartyName?:         string | null;
  cashflowClass?:            CashflowClass | null;
  dreEffect?:                DREEffect | null;
  reconciliationStatus?:     ReconciliationStatus;
};

const ALLOWED_FIELDS: (keyof PatchBody)[] = [
  "managerialCategory",
  "classificationConfidence",
  "classificationNote",
  "counterpartyName",
  "cashflowClass",
  "dreEffect",
  "reconciliationStatus",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(
    req, "update", "dados_infra", "Conciliação Bancária — Transação"
  );
  if (denied) return denied;

  const { id } = params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json() as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Strict whitelist — protect raw financial data from mutation
  const patch: PatchBody = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      (patch as Record<string, unknown>)[field] =
        (body as Record<string, unknown>)[field];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo editável fornecido. Campos válidos: " + ALLOWED_FIELDS.join(", ") },
      { status: 400 }
    );
  }

  await updateTransaction(id, patch);
  return NextResponse.json({ ok: true, id, updated: Object.keys(patch) });
}
