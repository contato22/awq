// POST/GET /api/setup/seed-cora-june
//
// Seed manual das transações Cora AWQ Holding de Junho 2026 (02-03/06)
// enquanto o sync via API Cora não traz o extrato. Valores informados
// pelo usuario a partir do extrato visivel no app da Cora.
//
// Idempotente: usa fileHash deterministico — re-rodar nao duplica.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  saveDocument,
  saveTransactions,
  getAllDocuments,
  newId,
  type BankTransaction,
  type FinancialDocument,
} from "@/lib/financial-db";
import { classifyTransaction } from "@/lib/financial-classifier";
import { reconcileIntercompany } from "@/lib/financial-reconciler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_HASH = "seed-cora-awq-holding-2026-06-02-2026-06-03";
const ACCOUNT_NAME = "Conta PJ AWQ Holding";
const ACCOUNT_NUMBER = "Cora · AWQ_Holding";
const BANK = "Cora" as const;
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }

// Valores informados pelo usuario (3 jun 2026) a partir do extrato Cora.
// amount > 0 = credito; amount < 0 = debito.
const RAW: RawTxn[] = [
  { date: "2026-06-02", desc: "Pix recebido", amount:  3500.00 },
  { date: "2026-06-02", desc: "Pix enviado",  amount: -1800.00 },
  { date: "2026-06-03", desc: "Pix recebido", amount:  3200.00 },
  { date: "2026-06-03", desc: "Pix enviado",  amount: -1406.00 },
];

async function runSeed(uploadedBy: string) {
  const existing = await getAllDocuments();
  if (existing.some((d) => d.fileHash === FILE_HASH)) {
    return { status: "already_seeded", fileHash: FILE_HASH };
  }

  const docId = newId();
  const now = new Date().toISOString();

  const doc: FinancialDocument = {
    id:               docId,
    filename:         "cora-awq-holding-jun-2026.manual",
    fileHash:         FILE_HASH,
    bank:             BANK,
    accountName:      ACCOUNT_NAME,
    accountNumber:    ACCOUNT_NUMBER,
    entity:           ENTITY,
    periodStart:      "2026-06-02",
    periodEnd:        "2026-06-03",
    openingBalance:   0,
    closingBalance:   3494.00, // 3500 - 1800 + 3200 - 1406
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: RAW.length,
    parserConfidence: "high",
    extractionNotes:  "Seed manual Cora AWQ Holding Jun/2026 — valores informados pelo usuario enquanto o sync Cora nao traz o extrato.",
    blobUrl:          null,
  };

  let running = doc.openingBalance ?? 0;

  const rawTxns: BankTransaction[] = RAW.map((r) => {
    const direction: "credit" | "debit" = r.amount >= 0 ? "credit" : "debit";
    const abs = Math.abs(r.amount);
    running = Math.round((running + r.amount) * 100) / 100;
    const classification = classifyTransaction(r.desc, abs, direction, ENTITY);
    return {
      id:                       newId(),
      documentId:               docId,
      bank:                     BANK,
      accountName:              ACCOUNT_NAME,
      entity:                   classification.entity,
      transactionDate:          r.date,
      descriptionOriginal:      r.desc,
      amount:                   abs,
      direction,
      runningBalance:           running,
      counterpartyName:         classification.counterpartyName,
      managerialCategory:       classification.category,
      classificationConfidence: classification.confidence,
      classificationNote:       classification.note,
      isIntercompany:           false,
      intercompanyMatchId:      null,
      excludedFromConsolidated: false,
      reconciliationStatus:     classification.confidence === "probable" ? "em_revisao" : "pendente",
      extractedAt:              now,
      classifiedAt:             now,
    };
  });

  const { updated: reconciled, matches } = reconcileIntercompany(rawTxns);

  await saveDocument(doc);
  await saveTransactions(reconciled);

  return {
    status: "seeded",
    documentId: docId,
    transactionCount: reconciled.length,
    intercompanyMatches: matches.length,
    period: { start: doc.periodStart, end: doc.periodEnd },
    openingBalance: doc.openingBalance,
    closingBalance: doc.closingBalance,
    sumOfTransactions: Math.round(RAW.reduce((s, r) => s + r.amount, 0) * 100) / 100,
  };
}

async function handle(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = (token?.email as string | undefined) ?? null;
  if (!email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  try {
    const result = await runSeed(email);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha no seed" },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET  = handle;
