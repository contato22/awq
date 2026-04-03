// ─── GET /api/ingest/transactions ─────────────────────────────────────────────
// Returns classified bank transactions with optional filters.
// Query params: documentId, entity, category, confidence, excludeIntercompany

import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions, getCashPositionByEntity } from "@/lib/financial-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const documentId         = searchParams.get("documentId");
  const entity             = searchParams.get("entity");
  const category           = searchParams.get("category");
  const confidence         = searchParams.get("confidence");
  const excludeIntercompany = searchParams.get("excludeIntercompany") === "true";
  const consolidatedOnly   = searchParams.get("consolidatedOnly") === "true";

  let txns = getAllTransactions();

  if (documentId)        txns = txns.filter((t) => t.documentId === documentId);
  if (entity)            txns = txns.filter((t) => t.entity === entity);
  if (category)          txns = txns.filter((t) => t.managerialCategory === category);
  if (confidence)        txns = txns.filter((t) => t.classificationConfidence === confidence);
  if (excludeIntercompany) txns = txns.filter((t) => !t.isIntercompany);
  if (consolidatedOnly)  txns = txns.filter((t) => !t.excludedFromConsolidated);

  // Sort by date descending
  txns = txns.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  // If requesting consolidated view, also return cash positions
  if (consolidatedOnly) {
    const positions = getCashPositionByEntity();
    return NextResponse.json({ transactions: txns, total: txns.length, cashPositions: positions });
  }

  return NextResponse.json({ transactions: txns, total: txns.length });
}
