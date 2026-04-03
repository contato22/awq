// ─── GET /api/ingest/documents ────────────────────────────────────────────────
// Returns all financial documents with optional filters.
// Query params: entity, bank, status

import { NextRequest, NextResponse } from "next/server";
import { getAllDocuments } from "@/lib/financial-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const entity = searchParams.get("entity");
  const bank   = searchParams.get("bank");
  const status = searchParams.get("status");

  let docs = getAllDocuments();

  if (entity) docs = docs.filter((d) => d.entity === entity);
  if (bank)   docs = docs.filter((d) => d.bank === bank);
  if (status) docs = docs.filter((d) => d.status === status);

  return NextResponse.json({ documents: docs, total: docs.length });
}
