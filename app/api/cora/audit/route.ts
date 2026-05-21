// GET /api/cora/audit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&entity=AWQ_Holding|JACQES|all
//
// Compares what Cora returns for a period against what's already in bank_transactions.
// Returns counts and the list of Cora IDs that are missing from the DB.
//
// Used by the "Varredura" button in CoraStatusPanel to detect sync gaps.

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured, isCoraJacqesConfigured } from "@/lib/cora-api";
import { getAllTransactions } from "@/lib/financial-db";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 3600_000).toISOString().slice(0, 10);
}

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

interface AccountAudit {
  entity: string;
  accountName: string;
  coraTotal: number;
  dbTotal: number;
  missing: number;
  missingIds: string[];
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!isCoraConfigured()) {
    return NextResponse.json({ error: "Integração Cora não configurada." }, { status: 501 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = isValidDate(searchParams.get("startDate") ?? "") ? searchParams.get("startDate")! : daysAgo(30);
  const endDate   = isValidDate(searchParams.get("endDate")   ?? "") ? searchParams.get("endDate")!   : today();
  const entityParam = searchParams.get("entity") ?? "all";

  const accounts: Array<{ entity: "AWQ_Holding" | "JACQES"; accountName: string }> = [];
  if (entityParam === "all" || entityParam === "AWQ_Holding") {
    accounts.push({ entity: "AWQ_Holding", accountName: "Conta PJ AWQ Holding" });
  }
  if ((entityParam === "all" || entityParam === "JACQES") && isCoraJacqesConfigured()) {
    accounts.push({ entity: "JACQES", accountName: "Conta PJ JACQES" });
  }

  // Load all DB transactions once
  let allDbTxns: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try { allDbTxns = await getAllTransactions(); } catch { /* empty DB */ }
  const dbIdSet = new Set(allDbTxns.map((t) => t.id));

  // Filter DB transactions in date range per entity
  function dbIdsForEntityInRange(entity: string): Set<string> {
    return new Set(
      allDbTxns
        .filter((t) => t.entity === entity && t.transactionDate >= startDate && t.transactionDate <= endDate)
        .map((t) => t.id),
    );
  }

  const results: AccountAudit[] = [];

  for (const acc of accounts) {
    try {
      const coraResult = await fetchCoraStatement(startDate, endDate, acc.entity);
      const coraIds = coraResult.entries.map((e) => `cora-${e.id}`);
      const dbIdsInRange = dbIdsForEntityInRange(acc.entity);

      const missingIds = coraIds.filter((id) => !dbIdSet.has(id));

      results.push({
        entity:      acc.entity,
        accountName: acc.accountName,
        coraTotal:   coraIds.length,
        dbTotal:     dbIdsInRange.size,
        missing:     missingIds.length,
        missingIds,
      });
    } catch (err) {
      results.push({
        entity:      acc.entity,
        accountName: acc.accountName,
        coraTotal:   0,
        dbTotal:     0,
        missing:     0,
        missingIds:  [],
        error:       err instanceof Error ? err.message : String(err),
      });
    }
  }

  const totalMissing = results.reduce((s, r) => s + r.missing, 0);

  return NextResponse.json({
    period: { startDate, endDate },
    totalMissing,
    accounts: results,
  });
}
