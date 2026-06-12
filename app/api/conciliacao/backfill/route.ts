// ─── POST /api/conciliacao/backfill ──────────────────────────────────────────
// Migra as transações do schema legado (bank_transactions) para o novo
// (bank_transaction). Idempotente por (bu, e2e_id) via surrogate legacy:<id>.
//
// Fix 1: o BU de cada transação é resolvido de bu_bank_account pelo account_id
//        (= entity legada). Conta não mapeada → NÃO ingere (falha fechada).
// Fix 2: transações legadas rotuladas 'ENERDY' são SINALIZADAS para classificação
//        (ledger provisório needs_classification=true), não auto-classificadas.

import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions } from "@/lib/financial-db";
import { legacyTxToInput } from "@/lib/recon-ingest";
import {
  upsertBankTransactions, getBankAccountMap, ensureEnerdyClassificationQueue, dedupeKey,
} from "@/lib/recon-db";
import type { BU, ReconBankTxInput } from "@/lib/recon-types";

export const runtime     = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("x-user-email")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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

  let accountMap: Map<string, BU>;
  try {
    accountMap = await getBankAccountMap();
  } catch (err) {
    const pgErr = err as { message?: string; code?: string };
    const detail = pgErr?.message ?? (err instanceof Error ? err.message : String(err));
    const isMissingTable = pgErr?.code === "42P01" || detail.includes("does not exist");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Tabela bu_bank_account ausente. Rode as migrations 003/004/005 no Supabase."
          : `Falha ao carregar bu_bank_account: ${detail}`,
        missingMigration: isMissingTable,
      },
      { status: 500 },
    );
  }

  // Particiona por BU resolvido da tabela; coleta as entities não mapeadas.
  const byBu = new Map<BU, ReconBankTxInput[]>();
  const enerdyKeysByBu = new Map<BU, string[]>();
  const unmapped = new Map<string, number>(); // entity → contagem rejeitada

  for (const t of legacy) {
    if (!t.transactionDate || !t.id) continue;
    const bu = accountMap.get(t.entity);
    if (!bu) {
      unmapped.set(t.entity, (unmapped.get(t.entity) ?? 0) + 1);
      continue; // falha fechada: não ingere conta não mapeada
    }
    const input = legacyTxToInput({
      id: t.id,
      entity: t.entity,
      transactionDate: t.transactionDate,
      amount: t.amount,
      direction: t.direction,
      counterpartyName: t.counterpartyName,
      descriptionOriginal: t.descriptionOriginal,
      accountName: t.entity, // account_id = entity → casa com bu_bank_account
    });
    if (!byBu.has(bu)) byBu.set(bu, []);
    byBu.get(bu)!.push(input);
    if (t.entity === "ENERDY") {
      if (!enerdyKeysByBu.has(bu)) enerdyKeysByBu.set(bu, []);
      enerdyKeysByBu.get(bu)!.push(dedupeKey(input));
    }
  }

  try {
    let synced = 0, skipped = 0, total = 0, enerdyQueued = 0;
    for (const [bu, inputs] of byBu) {
      const r = await upsertBankTransactions(bu, inputs);
      synced += r.synced; skipped += r.skipped; total += r.total;
      const enerdyKeys = enerdyKeysByBu.get(bu);
      if (enerdyKeys && enerdyKeys.length > 0) {
        enerdyQueued += await ensureEnerdyClassificationQueue(bu, enerdyKeys);
      }
    }
    return NextResponse.json({
      legacyRead: legacy.length,
      synced, skipped, total,
      enerdyQueuedForClassification: enerdyQueued,
      unmappedAccounts: Object.fromEntries(unmapped), // entities não ingeridas (falha fechada)
    });
  } catch (err) {
    const pgErr = err as { message?: string; code?: string };
    const detail = pgErr?.message ?? (err instanceof Error ? err.message : String(err));
    const isMissingTable = pgErr?.code === "42P01" || detail.includes("does not exist");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Tabela bank_transaction ausente. Rode as migrations 003/004/005 no Supabase."
          : `Falha no backfill: ${detail}`,
        missingMigration: isMissingTable,
      },
      { status: 500 },
    );
  }
}
