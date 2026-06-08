// POST /api/setup/backfill-snapshots
//
// Preenche daily_balance_snapshots para todo o histórico disponível em
// bank_transactions (a partir de 2022-01-01). Idempotente — re-rodar faz upsert.
// Necessário sempre que um extrato histórico é ingerido fora do fluxo do cron diário.

import { NextRequest, NextResponse } from "next/server";
import { backfillSnapshots } from "@/lib/balance-snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(_req: NextRequest) {
  try {
    const from = "2022-01-01";
    const to   = new Date().toISOString().slice(0, 10);
    const result = await backfillSnapshots(from, to);
    return NextResponse.json({ from, to, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha no backfill" },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET  = handle;
