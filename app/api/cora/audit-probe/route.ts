// GET /api/cora/audit-probe?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
//
// Public (no-auth) version of /api/cora/audit used by GitHub Actions workflows
// to probe real Cora vs DB sync status from whitelisted IPs.
//
// Returns the same shape as /api/cora/audit but skips the NextAuth check.

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured, isCoraJacqesConfigured } from "@/lib/cora-api";
import { getAllTransactions } from "@/lib/financial-db";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

function today() {
  return new Date().toISOString().slice(0, 10);
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
  if (!isCoraConfigured()) {
    return NextResponse.json({ error: "Integração Cora não configurada." }, { status: 501 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = isValidDate(searchParams.get("startDate") ?? "") ? searchParams.get("startDate")! : "2026-01-01";
  const endDate   = isValidDate(searchParams.get("endDate")   ?? "") ? searchParams.get("endDate")!   : today();

  const accounts: Array<{ entity: "AWQ_Holding" | "JACQES"; accountName: string }> = [
    { entity: "AWQ_Holding", accountName: "Conta PJ AWQ Holding" },
  ];
  if (isCoraJacqesConfigured()) {
    accounts.push({ entity: "JACQES", accountName: "Conta PJ JACQES" });
  }

  let allDbTxns: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try { allDbTxns = await getAllTransactions(); } catch { /* empty DB */ }
  const dbIdSet = new Set(allDbTxns.map((t) => t.id));

  function dbCountForEntityInRange(entity: string): number {
    return allDbTxns.filter(
      (t) => t.entity === entity && t.transactionDate >= startDate && t.transactionDate <= endDate,
    ).length;
  }

  const results: AccountAudit[] = [];

  for (const acc of accounts) {
    try {
      const coraResult = await fetchCoraStatement(startDate, endDate, acc.entity);
      const coraIds    = coraResult.entries.map((e) => `cora-${e.id}`);
      const missingIds = coraIds.filter((id) => !dbIdSet.has(id));

      results.push({
        entity:      acc.entity,
        accountName: acc.accountName,
        coraTotal:   coraIds.length,
        dbTotal:     dbCountForEntityInRange(acc.entity),
        missing:     missingIds.length,
        missingIds:  missingIds.slice(0, 50),
      });
    } catch (err) {
      results.push({
        entity:      acc.entity,
        accountName: acc.accountName,
        coraTotal:   0,
        dbTotal:     dbCountForEntityInRange(acc.entity),
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
