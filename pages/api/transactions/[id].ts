// ─── PATCH /api/transactions/[id] ─────────────────────────────────────────────
// Updates mutable reconciliation fields on a single bank transaction.
// Protected fields (raw extraction data) cannot be changed via this endpoint.

import type { NextApiRequest, NextApiResponse } from "next";
import { updateTransaction, getAllTransactions } from "@/lib/financial-db";

const PROTECTED_FIELDS = new Set([
  "id",
  "documentId",
  "bank",
  "accountName",
  "entity",
  "transactionDate",
  "descriptionOriginal",
  "amount",
  "direction",
  "runningBalance",
  "intercompanyMatchId",
  "extractedAt",
]);

const ALLOWED_FIELDS = new Set([
  "managerialCategory",
  "classificationNote",
  "counterpartyName",
  "classificationConfidence",
  "isIntercompany",
  "excludedFromConsolidated",
  "reconciliationStatus",
  "classifiedAt",
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ error: "ID inválido" });
  }

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("body must be an object");
    }
  } catch {
    return res.status(400).json({ error: "Body JSON inválido" });
  }

  const forbidden = Object.keys(body).filter((k) => PROTECTED_FIELDS.has(k));
  if (forbidden.length > 0) {
    return res.status(400).json({
      error: `Campos protegidos não podem ser alterados: ${forbidden.join(", ")}`,
      forbidden,
    });
  }

  const unknown = Object.keys(body).filter((k) => !ALLOWED_FIELDS.has(k));
  if (unknown.length > 0) {
    return res.status(400).json({
      error: `Campos desconhecidos: ${unknown.join(", ")}`,
      unknown,
    });
  }

  try {
    await updateTransaction(id, body as Parameters<typeof updateTransaction>[1]);

    const all = await getAllTransactions();
    const updated = all.find((t) => t.id === id);
    if (!updated) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }
    return res.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/transactions/${id}]`, err);
    return res.status(500).json({ error: "Falha ao atualizar transação" });
  }
}
