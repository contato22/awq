// ─── GET /api/transactions ────────────────────────────────────────────────────
// Returns all bank transactions from the canonical store (JSON or Postgres).
// Used by ReconciliationReviewTable to refresh data after edits.

import type { NextApiRequest, NextApiResponse } from "next";
import { getAllTransactions } from "@/lib/financial-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const transactions = await getAllTransactions();
    res.json(transactions);
  } catch (err) {
    console.error("[GET /api/transactions]", err);
    res.status(500).json({ error: "Falha ao carregar transações" });
  }
}
