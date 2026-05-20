// ─── POST /api/cora/sync ───────────────────────────────────────────────────────
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
import { getToken } from "next-auth/jwt";
import { fetchCoraStatement, isCoraConfigured } from "@/lib/cora-api";
import { getAllTransactions, saveTransactions } from "@/lib/financial-db";
import { classifyTransaction } from "@/lib/financial-classifier";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";

export const runtime = "nodejs";

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
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!authToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // ── Cora configured? ──────────────────────────────────────────────────────
  if (!isCoraConfigured()) {
    return NextResponse.json(
      {
        error: "Integração Cora não configurada.",
        hint: "Configure as variáveis CORA_CLIENT_ID, CORA_CERT e CORA_KEY no painel do Vercel (ou .env.local).",
      },
      { status: 501 },
    );
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({})) as {
    accountName?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
  };

  const accountName = body.accountName ?? "Conta PJ AWQ Holding";
  const entity      = (body.entity ?? "AWQ_Holding") as EntityLayer;
  const startDate   = isValidDate(body.startDate ?? "") ? body.startDate! : daysAgo(30);
  const endDate     = isValidDate(body.endDate   ?? "") ? body.endDate!   : today();

  // ── Fetch from Cora ───────────────────────────────────────────────────────
  let coraEntries: Awaited<ReturnType<typeof fetchCoraStatement>>;
  try {
    coraEntries = await fetchCoraStatement(startDate, endDate);
  } catch (err) {
    console.error("[POST /api/cora/sync] fetch failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar extrato da Cora" },
      { status: 502 },
    );
  }

  // ── Deduplication ─────────────────────────────────────────────────────────
  const existing = await getAllTransactions();
  const existingIds = new Set(existing.map((t) => t.id));

  const docId = `cora-api-${startDate}-${endDate}`;
  const now   = new Date().toISOString();

  const newTransactions: BankTransaction[] = [];
  let skipped = 0;

  for (const entry of coraEntries) {
    const txId = `cora-${entry.id}`;
    if (existingIds.has(txId)) { skipped++; continue; }

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

  // ── Save ──────────────────────────────────────────────────────────────────
  if (newTransactions.length > 0) {
    try {
      await saveTransactions(newTransactions);
    } catch (err) {
      console.error("[POST /api/cora/sync] save failed", err);
      return NextResponse.json(
        { error: "Transações recebidas da Cora mas falha ao salvar no banco de dados." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    synced:  newTransactions.length,
    skipped,
    total:   coraEntries.length,
    period:  { startDate, endDate },
  });
}
