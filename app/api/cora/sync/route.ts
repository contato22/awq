// ─── POST /api/cora/sync —————————————————————————————————————————————————
//
// Synchronises bank statement data from the Cora API into the financial DB.
//
// Prerequisites:
//   Set CORA_CLIENT_ID, CORA_CERT, CORA_KEY in Vercel env vars.
//   Credentials are issued in the Cora app → Conta → Integrações via APIs.
//   Requires CoraPro plan.
//
// Request body (JSON):
//   {
//     accountName?: string   // "Conta PJ AWQ Holding" (default) or "Conta PJ JACQES"
//     entity?:     string   // "AWQ_Holding" (default) or "JACQES"
//     startDate?:  string   // YYYY-MM-DD (default: 30 days ago)
//     endDate?:    string   // YYYY-MM-DD (default: today)
//   }
//
// Response:
//   { synced: number, skipped: number, total: number, period: { startDate, endDate } }

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraStatement, isCoraConfigured } from "@/lib/cora-api";
import { getAllTransactions, saveTransactions } from "@/lib/financial-db";
import { classifyTransaction } from "@/lib/financial-classifier";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";
import { USE_SUPABASE, USE_ERP_ADMIN } from "@/lib/supabase";
import { USE_DB } from "@/lib/db";

export const runtime    = "nodejs";
export const maxDuration = 60; // sync de períodos longos (até 5+ meses)

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 3600_000).toISOString().slice(0, 10);
}

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth — middleware injects x-user-email after verifying the session ──────────
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // ── Cora configured? ———————————————————————————————————————————————————————————————
  if (!isCoraConfigured()) {
    return NextResponse.json(
      {
        error: "Integração Cora não configurada.",
        hint: "Configure as variáveis CORA_CLIENT_ID, CORA_CERT e CORA_KEY no painel do Vercel (ou .env.local).",
      },
      { status: 501 },
    );
  }

  // ── Database configured? ———————————————————————————————————————————————————————————————
  // Require service role (SUPABASE or ERP_ADMIN) or direct postgres — anon alone cannot bypass RLS.
  if (!USE_SUPABASE && !USE_ERP_ADMIN && !USE_DB) {
    return NextResponse.json(
      {
        error: "Banco de dados não configurado.",
        hint: "Configure ERP_SUPABASE_SERVICE_ROLE_KEY no painel do Vercel (Supabase → kkhxxsrgsewjfvnnssyf → Settings → API → service_role).",
      },
      { status: 501 },
    );
  }

  // ── Parse request ——————————————————————————————————————————————————————————
  const body = await req.json().catch(() => ({})) as {
    accountName?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    force?: boolean;
  };

  const accountName = body.accountName ?? "Conta PJ AWQ Holding";
  const entity      = (body.entity ?? "AWQ_Holding") as EntityLayer;
  const startDate   = isValidDate(body.startDate ?? "") ? body.startDate! : daysAgo(30);
  const endDate     = isValidDate(body.endDate   ?? "") ? body.endDate!   : today();
  const force       = body.force === true;

  // ── Fetch from Cora —————————————————————————————————————————————————————————
  let coraResult: Awaited<ReturnType<typeof fetchCoraStatement>>;
  try {
    coraResult = await fetchCoraStatement(startDate, endDate, entity as "AWQ_Holding" | "JACQES");
  } catch (err) {
    console.error("[POST /api/cora/sync] fetch failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar extrato da Cora" },
      { status: 502 },
    );
  }

  const coraEntries = coraResult.entries;

  // ── Deduplication ———————————————————————————————————————————————————————————
  let existing: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try { existing = await getAllTransactions(); } catch { /* no prior transactions */ }
  const existingIds = new Set(existing.map((t) => t.id));
  // Track records missing counterpartyName so sync can backfill them
  const nullCounterpartyIds = new Set(
    existing.filter((t) => !t.counterpartyName).map((t) => t.id),
  );

  const docId = `cora-api-${startDate}-${endDate}`;
  const now   = new Date().toISOString();

  const newTransactions: BankTransaction[] = [];
  let skipped = 0;

  for (const entry of coraEntries) {
    const txId = `cora-${entry.id}`;
    const isExisting = existingIds.has(txId);
    // Re-process existing records missing counterpartyName so we can backfill them
    const needsCounterpartyBackfill = isExisting && nullCounterpartyIds.has(txId) && !!entry.counterparty;
    // force=true bypasses dedup; also re-process records with null counterpartyName when Cora now provides it
    if (!force && isExisting && !needsCounterpartyBackfill) { skipped++; continue; }

    const classification = classifyTransaction(
      entry.description,
      entry.amount,
      entry.direction,
      entity,
    );

    newTransactions.push({
      id:                      txId,
      documentId:              docId,
      bank:                    "Cora",
      accountName,
      entity,
      transactionDate:         entry.date,
      descriptionOriginal:     entry.description,
      amount:                  entry.amount,
      direction:               entry.direction,
      runningBalance:          entry.balance,
      counterpartyName:        entry.counterparty ?? classification.counterpartyName,
      managerialCategory:      classification.category,
      classificationConfidence: classification.confidence,
      classificationNote:      classification.note,
      isIntercompany:          classification.category === "transferencia_interna_recebida" ||
                               classification.category === "transferencia_interna_enviada",
      intercompanyMatchId:     null,
      excludedFromConsolidated: classification.category === "transferencia_interna_recebida" ||
                                classification.category === "transferencia_interna_enviada" ||
                                classification.category === "aplicacao_financeira" ||
                                classification.category === "resgate_financeiro" ||
                                classification.category === "reserva_limite_cartao",
      reconciliationStatus:    "pendente",
      extractedAt:             now,
      classifiedAt:            classification.category !== "unclassified" ? now : null,
    });
  }

  // ── Save ————————————————————————————————————————————————————————————————————
  if (newTransactions.length > 0) {
    try {
      await saveTransactions(newTransactions);
    } catch (err) {
      console.error("[POST /api/cora/sync] save failed", err);
      // PostgrestError is a plain object {message, code, details, hint}, not instanceof Error
      const pgErr = err as { message?: string; code?: string };
      const detail = pgErr?.message ?? (err instanceof Error ? err.message : JSON.stringify(err));
      const isMissingTable = pgErr?.code === "42P01" || detail.includes("does not exist");
      return NextResponse.json(
        {
          error: isMissingTable
            ? "Tabelas financeiras não encontradas no banco. Execute a migração SQL no Supabase → SQL Editor antes de sincronizar."
            : `Falha ao salvar no banco de dados: ${detail}`,
          missingMigration: isMissingTable,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    synced:  newTransactions.length,
    skipped,
    total:   coraEntries.length,
    period:  { startDate, endDate },
    ...(coraEntries.length === 0 ? { _debug: coraResult._debug } : {}),
  });
}
