// POST /api/admin/full-reconcile?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
//
// Reconciliação completa em uma chamada:
//   1. Re-sync Cora (AWQ_Holding + JACQES + ENERDY) no intervalo informado —
//      reimporta tx que estavam sendo filtradas antes do fix do parseDate
//      (#394) e popula bank_transactions com runningBalance correto.
//   2. Backfill dos snapshots de saldo diário (daily_balance_snapshots) no
//      mesmo intervalo, usando os runningBalance recém-importados.
//
// Defaults:
//   startDate = 2025-01-01 (cobre histórico desde 2025)
//   endDate   = hoje (BRT)
//
// Idempotente — Cora sync usa id estável; snapshots usam UPSERT na PK.

import { NextRequest, NextResponse } from "next/server";
import {
  fetchCoraStatement, isCoraConfigured, isCoraJacqesConfigured, isCoraEnerdyConfigured,
} from "@/lib/cora-api";
import { getAllTransactions, saveTransactions } from "@/lib/financial-db";
import { classifyTransaction } from "@/lib/financial-classifier";
import { backfillSnapshots } from "@/lib/balance-snapshots";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";
import { USE_SUPABASE, USE_ERP_ADMIN } from "@/lib/supabase";
import { USE_DB } from "@/lib/db";
import { todayBRT } from "@/lib/date-brt";
import { getAuthIdentity, unauthorized } from "@/lib/api-auth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
// Reconciliação de 2 anos pode demorar: 24+ chunks × ~2s Cora API + saves.
// Vercel Pro permite até 300s; Hobby 60s.
export const maxDuration = 300;

// Quebra [start, end] em chunks de até `chunkDays` dias.
// Cora API rejeita / dá rate-limit em range muito grande — chunkar evita.
function chunkDateRange(start: string, end: string, chunkDays = 31): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  const endTs = new Date(`${end}T00:00:00Z`).getTime();
  let cur = new Date(`${start}T00:00:00Z`).getTime();
  while (cur <= endTs) {
    const chunkEnd = Math.min(cur + (chunkDays - 1) * 86_400_000, endTs);
    chunks.push({
      from: new Date(cur).toISOString().slice(0, 10),
      to:   new Date(chunkEnd).toISOString().slice(0, 10),
    });
    cur = chunkEnd + 86_400_000;
  }
  return chunks;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

interface SyncResult {
  entity: string;
  accountName: string;
  synced: number;
  skipped: number;
  total: number;
  error?: string;
}

function describeErr(err: unknown): string {
  if (err instanceof Error) {
    // Inclui name + message + 3 primeiras linhas do stack pra rastrear origem
    const stack = err.stack ? ` :: ${err.stack.split("\n").slice(0, 3).join(" | ")}` : "";
    return `${err.name}: ${err.message}${stack}`;
  }
  // Erros vindos do Supabase ou httpsRequest podem ser plain objects:
  // { message, code, details, ... } — serializa pra preservar contexto
  if (typeof err === "object" && err !== null) {
    try { return JSON.stringify(err); } catch { /* circular ref */ }
  }
  return String(err);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const identity = await getAuthIdentity(req);
  if (!identity) return unauthorized();

  if (!isCoraConfigured()) {
    return NextResponse.json({ error: "Cora não configurada" }, { status: 501 });
  }
  if (!USE_SUPABASE && !USE_ERP_ADMIN && !USE_DB) {
    return NextResponse.json({ error: "Banco de dados não configurado" }, { status: 501 });
  }

  const startDate = isValidDate(req.nextUrl.searchParams.get("startDate") ?? "")
    ? req.nextUrl.searchParams.get("startDate")!
    : "2025-01-01";
  const endDate   = isValidDate(req.nextUrl.searchParams.get("endDate") ?? "")
    ? req.nextUrl.searchParams.get("endDate")!
    : todayBRT();

  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate deve ser <= endDate" }, { status: 400 });
  }

  // ── 1. Re-sync Cora ────────────────────────────────────────────────────
  const accounts: Array<{ entity: EntityLayer; accountName: string }> = [
    { entity: "AWQ_Holding", accountName: "Conta PJ AWQ Holding" },
  ];
  if (isCoraJacqesConfigured()) accounts.push({ entity: "JACQES", accountName: "Conta PJ JACQES" });
  if (isCoraEnerdyConfigured()) accounts.push({ entity: "ENERDY", accountName: "Cora Enerdy" });

  let existing: BankTransaction[] = [];
  try { existing = await getAllTransactions(); } catch { /* empty */ }
  const existingDates = new Map(existing.map((t) => [t.id, t.transactionDate]));

  const now = new Date().toISOString();
  const syncResults: SyncResult[] = [];
  let totalSynced = 0;

  const chunks = chunkDateRange(startDate, endDate, 31);

  for (const acc of accounts) {
    let accSynced = 0;
    let accSkipped = 0;
    let accTotal = 0;
    const chunkErrors: Array<{ chunk: string; error: string }> = [];

    for (const chunk of chunks) {
      try {
        const stmt = await fetchCoraStatement(
          chunk.from, chunk.to, acc.entity as "AWQ_Holding" | "JACQES" | "ENERDY",
        );
        accTotal += stmt.entries.length;
        const docId = `cora-reconcile-${chunk.from}-${chunk.to}`;
        const newTxns: BankTransaction[] = [];

        for (const entry of stmt.entries) {
          const txId = `cora-${entry.id}`;
          const storedDate = existingDates.get(txId);
          if (storedDate !== undefined && storedDate === entry.date) { accSkipped++; continue; }

          const cls = classifyTransaction(entry.description, entry.amount, entry.direction, acc.entity);

          newTxns.push({
            id:                       txId,
            documentId:               docId,
            bank:                     "Cora",
            accountName:              acc.accountName,
            entity:                   acc.entity,
            transactionDate:          entry.date,
            descriptionOriginal:      entry.description,
            amount:                   entry.amount,
            direction:                entry.direction,
            runningBalance:           entry.balance,
            counterpartyName:         entry.counterparty ?? cls.counterpartyName,
            managerialCategory:       cls.category,
            classificationConfidence: cls.confidence,
            classificationNote:       cls.note,
            isIntercompany:
              cls.category === "transferencia_interna_recebida" ||
              cls.category === "transferencia_interna_enviada",
            intercompanyMatchId:      null,
            excludedFromConsolidated:
              cls.category === "transferencia_interna_recebida" ||
              cls.category === "transferencia_interna_enviada" ||
              cls.category === "aplicacao_financeira"           ||
              cls.category === "resgate_financeiro"             ||
              cls.category === "reserva_limite_cartao",
            reconciliationStatus:     "pendente",
            extractedAt:              now,
            classifiedAt:             cls.category !== "unclassified" ? now : null,
          });
          existingDates.set(txId, entry.date);
        }

        if (newTxns.length > 0) {
          try { await saveTransactions(newTxns); accSynced += newTxns.length; }
          catch (saveErr) {
            chunkErrors.push({ chunk: `${chunk.from}_save`, error: describeErr(saveErr) });
          }
        }
      } catch (err) {
        // Erro num chunk não derruba os outros — continua e reporta no fim.
        chunkErrors.push({ chunk: `${chunk.from}→${chunk.to}`, error: describeErr(err) });
      }
    }

    totalSynced += accSynced;
    syncResults.push({
      entity: acc.entity, accountName: acc.accountName,
      synced: accSynced, skipped: accSkipped, total: accTotal,
      ...(chunkErrors.length > 0 ? { error: chunkErrors.map(e => `[${e.chunk}] ${e.error}`).join(" || ") } : {}),
    });
  }

  // ── 2. Backfill dos snapshots ─────────────────────────────────────────
  let snapshotResult: { ok: boolean; saved: number; days: number; accounts: number; error?: string };
  try {
    snapshotResult = await backfillSnapshots(startDate, endDate);
  } catch (err) {
    snapshotResult = {
      ok: false, saved: 0, days: 0, accounts: 0,
      error: describeErr(err),
    };
  }

  return NextResponse.json({
    ok: syncResults.every((r) => !r.error) && snapshotResult.ok,
    range: { startDate, endDate, chunks: chunks.length },
    sync: { totalSynced, accounts: syncResults },
    snapshots: snapshotResult,
    executedAt: now,
  }, { status: 200 });
}
