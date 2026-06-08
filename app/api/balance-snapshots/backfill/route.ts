// POST /api/balance-snapshots/backfill?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Reconstrói histórico de saldos diários a partir do running_balance das tx
// em bank_transactions. Idempotente — UPSERT na PK (date, entity, account_key).
//
// Sem `from`: usa a data mais antiga de bank_transactions.
// Sem `to`:   usa hoje (BRT).

import { NextRequest, NextResponse } from "next/server";
import { backfillSnapshots } from "@/lib/balance-snapshots";
import { getAllTransactions } from "@/lib/financial-db";
import { todayBRT } from "@/lib/date-brt";
import { getAuthIdentity, unauthorized } from "@/lib/api-auth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const identity = await getAuthIdentity(req);
  if (!identity) return unauthorized();

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam   = req.nextUrl.searchParams.get("to");
  const to = toParam ?? todayBRT();

  let from = fromParam;
  if (!from) {
    const txns = await getAllTransactions();
    from = txns.reduce(
      (min, t) => (t.transactionDate < min ? t.transactionDate : min),
      to,
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from/to devem ser YYYY-MM-DD" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "from deve ser <= to" }, { status: 400 });
  }

  const result = await backfillSnapshots(from, to);
  return NextResponse.json({ range: { from, to }, ...result });
}

export const GET = POST;
