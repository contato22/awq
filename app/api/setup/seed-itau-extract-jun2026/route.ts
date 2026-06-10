// POST/GET /api/setup/seed-itau-extract-jun2026
//
// Seed one-shot do extrato Itaú AWQ Holding (Ag 0807 / Conta 0099101-3)
// período 11/05/2026 – 10/06/2026, gerado em 10/06/2026.
//
// Idempotente: usa fileHash determinístico — re-rodar não duplica o documento.

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

const FILE_HASH = "seed-itau-awq-080700991013-2026-05-11-2026-06-10";
const ACCOUNT_NAME = "Conta Itaú Empresas AWQ";
const ACCOUNT_NUMBER = "0807 / 0099101-3";
const BANK = "Itaú" as const;
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }

// Transações extraídas do PDF (ordem cronológica, saldo anterior 10/05 = R$ 1.600,00).
// amount > 0 = crédito; amount < 0 = débito.
const RAW: RawTxn[] = [
  { date: "2026-05-11", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                    amount: -1000.00 },
  { date: "2026-05-11", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                    amount:  -600.00 },
  { date: "2026-05-22", desc: "RESGATE CDB DI",                                                          amount:    93.02 },
  { date: "2026-05-22", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                    amount:   -90.00 },
  { date: "2026-05-22", desc: "RESGATE CDB DI",                                                          amount:   500.50 },
  { date: "2026-05-22", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                    amount:  -500.00 },
  { date: "2026-05-25", desc: "RESGATE CDB DI",                                                          amount:   500.70 },
  { date: "2026-05-25", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                      amount:  -500.00 },
  { date: "2026-05-25", desc: "RESGATE CDB DI",                                                          amount:   500.77 },
  { date: "2026-05-25", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                      amount:  -500.00 },
  { date: "2026-05-26", desc: "RECEBIMENTOS CURSO FLAMA VESTIBULARES LTDA 32.010.340/0001-90",         amount:  1000.00 },
  { date: "2026-05-26", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                    amount:  -500.00 },
  { date: "2026-06-02", desc: "TAR MANUT CONTA 05/26",                                                   amount:   -87.00 },
  { date: "2026-06-02", desc: "TAR PIX PGTO TRANSF",                                                     amount:   -39.50 },
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
    filename:         "Extrato_080700991013_10062026_Parte1.pdf",
    fileHash:         FILE_HASH,
    bank:             BANK,
    accountName:      ACCOUNT_NAME,
    accountNumber:    ACCOUNT_NUMBER,
    entity:           ENTITY,
    periodStart:      "2026-05-11",
    periodEnd:        "2026-06-10",
    openingBalance:   1600.00,
    closingBalance:   378.49,
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: RAW.length,
    parserConfidence: "high",
    extractionNotes:  "Seed manual a partir do PDF Itaú AWQ Holding (Ag 0807, Conta 0099101-3), gerado 10/06/2026. Hand-extracted by /api/setup/seed-itau-extract-jun2026.",
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
