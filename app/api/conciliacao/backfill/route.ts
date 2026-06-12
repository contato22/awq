// ─── POST /api/conciliacao/backfill ──────────────────────────────────────────
// Migra as transações do schema legado (bank_transactions) para o novo
// (bank_transaction). Idempotente por (bu, e2e_id) via surrogate legacy:<id>.
// Rodar 2× não duplica. Todas as entities legadas pertencem ao grupo AWQ.

import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions } from "@/lib/financial-db";
import { legacyTxToInput } from "@/lib/recon-ingest";
import { upsertBankTransactions } from "@/lib/recon-db";

export const runtime     = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("x-user-email")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  // Backfill é Holding-only (AWQ). Roles BU-locked não disparam.
  const lockedBU = req.headers.get("x-bu-lock");
  if (lockedBU && lockedBU !== "AWQ") {
    return NextResponse.json({ error: `Backfill é AWQ-only; usuário ${lockedBU} bloqueado` }, { status: 403 });
  }

  let legacy: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try {
    legacy = await getAllTransactions();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao ler schema legado" },
      { status: 500 },
    );
  }

  const inputs = legacy
    .filter((t) => t.transactionDate && t.id)
    .map((t) =>
      legacyTxToInput({
        id: t.id,
        entity: t.entity,
        transactionDate: t.transactionDate,
        amount: t.amount,
        direction: t.direction,
        counterpartyName: t.counterpartyName,
        descriptionOriginal: t.descriptionOriginal,
        accountName: t.accountName,
      }),
    );

  try {
    const result = await upsertBankTransactions("AWQ", inputs);
    return NextResponse.json({ bu: "AWQ", legacyRead: legacy.length, ...result });
  } catch (err) {
    const pgErr = err as { message?: string; code?: string };
    const detail = pgErr?.message ?? (err instanceof Error ? err.message : String(err));
    const isMissingTable = pgErr?.code === "42P01" || detail.includes("does not exist");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Tabela bank_transaction ausente. Rode as migrations 003/004 no Supabase."
          : `Falha no backfill: ${detail}`,
        missingMigration: isMissingTable,
      },
      { status: 500 },
    );
  }
}
