// ─── GET /api/transactions ────────────────────────────────────────────────────
// Returns all bank transactions from the canonical store (JSON or Postgres).
// Used by client components (ReconciliationReviewTable) to load the full list.

import { NextResponse } from "next/server";
import { getAllTransactions } from "@/lib/financial-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const transactions = await getAllTransactions();
    return NextResponse.json(transactions);
  } catch (err) {
    console.error("[GET /api/transactions]", err);
    return NextResponse.json({ error: "Falha ao carregar transações" }, { status: 500 });
  }
}
