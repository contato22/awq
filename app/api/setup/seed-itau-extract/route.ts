// POST /api/setup/seed-itau-extract
//
// Seed one-shot do extrato Itaú AWQ Holding (Ag 0807 / Conta 0099101-3)
// período 03/03/2026 – 02/06/2026, recebido em 02/06/2026.
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

const FILE_HASH = "seed-itau-awq-080700991013-2026-03-03-2026-06-02";
const ACCOUNT_NAME = "Conta Itaú Empresas AWQ";
const ACCOUNT_NUMBER = "0807 / 0099101-3";
const BANK = "Itaú" as const;
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }

// Transações extraídas do PDF, ordem cronológica.
// amount > 0 = crédito; amount < 0 = débito.
const RAW: RawTxn[] = [
  { date: "2026-03-20", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                amount: -39.18 },
  { date: "2026-03-20", desc: "PIX RECEBIDO AWQ20/03 AWQ 44.859.574/0001-95",                      amount: 5000.00 },
  { date: "2026-03-20", desc: "TAR MANUT CONTA 02/26",                                              amount: -87.00 },
  { date: "2026-03-20", desc: "APLICACAO CDB DI",                                                   amount: -2500.00 },
  { date: "2026-03-23", desc: "PIX RECEBIDO AWQ21/03 AWQ 44.859.574/0001-95",                      amount: 739.18 },
  { date: "2026-03-23", desc: "APLICACAO CDB DI",                                                   amount: -2150.00 },
  { date: "2026-03-30", desc: "PIX ENVIADO 57.346.305 PEDRO HENRIQUE MANGIA FURTADO 57.346.305/0001-77", amount: -1000.00 },
  { date: "2026-03-30", desc: "PIX RECEBIDO AWQ30/03 AWQ 44.859.574/0001-95",                      amount: 5000.00 },
  { date: "2026-03-30", desc: "PIX ENVIADO GUSTAVO DELGADO BRAGA 117.137.017-23",                  amount: -1500.00 },
  { date: "2026-03-30", desc: "APLICACAO CDB DI",                                                   amount: -3000.00 },
  { date: "2026-03-31", desc: "PIX ENVIADO THAIS COUTINHO AGUIAR 121.573.317-86",                  amount: -200.00 },
  { date: "2026-04-01", desc: "PIX RECEBIDO AWQ01/04 AWQ 44.859.574/0001-95",                      amount: 5000.00 },
  { date: "2026-04-01", desc: "APLICACAO CDB DI",                                                   amount: -3000.00 },
  { date: "2026-04-02", desc: "PIX RECEBIDO AWQ02/04 AWQ 44.859.574/0001-95",                      amount: 4000.00 },
  { date: "2026-04-02", desc: "TAR PIX PGTO TRANSF",                                                amount: -21.60 },
  { date: "2026-04-02", desc: "TAR MANUT CONTA 03/26",                                              amount: -87.00 },
  { date: "2026-04-02", desc: "APLICACAO CDB DI",                                                   amount: -5000.00 },
  { date: "2026-04-06", desc: "PIX ENVIADO FELIPPE DA SILVA LOPES 118.570.157-54",                 amount: -360.00 },
  { date: "2026-04-06", desc: "PIX ENVIADO JONNATHAN LIMA DUARTE 159.247.957-05",                  amount: -800.00 },
  { date: "2026-04-09", desc: "RESGATE CDB DI",                                                     amount: 773.58 },
  { date: "2026-04-10", desc: "PIX RECEBIDO AWQ10/04 AWQ 44.859.574/0001-95",                      amount: 2338.51 },
  { date: "2026-04-10", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -2000.00 },
  { date: "2026-04-13", desc: "PIX RECEBIDO MATEUS 13/04 MATEUS MARIANO MONTONI 140.941.877-40",   amount: 1000.00 },
  { date: "2026-04-13", desc: "APLICACAO CDB DI",                                                   amount: -1145.00 },
  { date: "2026-04-14", desc: "PIX ENVIADO JONNATHAN LIMA DUARTE 159.247.957-05",                  amount: -1000.00 },
  { date: "2026-04-17", desc: "RESGATE CDB DI",                                                     amount: 2500.63 },
  { date: "2026-04-17", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -2500.00 },
  { date: "2026-04-20", desc: "PIX RECEBIDO MARIA I20/04 MARIA ISABEL DE JESUS CONTE 137.364.317-08", amount: 1500.00 },
  { date: "2026-04-20", desc: "PIX ENVIADO 61.633.667 LUAN CANTO DA SILVA 61.633.667/0001-16",     amount: -700.00 },
  { date: "2026-04-22", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -200.00 },
  { date: "2026-04-27", desc: "PIX ENVIADO JONNATHAN LIMA DUARTE 159.247.957-05",                  amount: -2000.00 },
  { date: "2026-04-27", desc: "PIX RECEBIDO MARIA I27/04 MARIA ISABEL DE JESUS CONTE 137.364.317-08", amount: 1500.00 },
  { date: "2026-04-28", desc: "PIX RECEBIDO CENTRO 28/04 CENTRO DE ENSINO MODERNO LTDA 32.186.991/0001-35", amount: 1500.00 },
  { date: "2026-04-28", desc: "PIX ENVIADO PAULO CESAR JACINTO 655.469.387-49",                    amount: -150.00 },
  { date: "2026-04-30", desc: "PIX RECEBIDO AWQ30/04 AWQ 44.859.574/0001-95",                      amount: 4500.00 },
  { date: "2026-04-30", desc: "PIX ENVIADO 61.633.667 LUAN CANTO DA SILVA 61.633.667/0001-16",     amount: -800.00 },
  { date: "2026-04-30", desc: "APLICACAO CDB DI",                                                   amount: -1150.00 },
  { date: "2026-05-04", desc: "PIX ENVIADO JOAO PEDRO GOMES PINHEIRO 151.134.747-38",              amount: -1350.00 },
  { date: "2026-05-04", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -651.30 },
  { date: "2026-05-04", desc: "PIX ENVIADO 58.665.244 MARIA CAROLINA MACHADO MARTINS 58.665.244/0001-73", amount: -55.00 },
  { date: "2026-05-04", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -500.00 },
  { date: "2026-05-05", desc: "TAR PIX PGTO TRANSF",                                                amount: -39.40 },
  { date: "2026-05-05", desc: "TAR MANUT CONTA 04/26",                                              amount: -87.00 },
  { date: "2026-05-06", desc: "PIX ENVIADO 61.633.667 LUAN CANTO DA SILVA 61.633.667/0001-16",     amount: -300.00 },
  { date: "2026-05-06", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -300.00 },
  { date: "2026-05-07", desc: "PIX ENVIADO CARLOS RODRIGO FERREIRA 016.194.797-29",                amount: -120.00 },
  { date: "2026-05-07", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -198.60 },
  { date: "2026-05-08", desc: "PIX RECEBIDO AWQ08/05 AWQ 44.859.574/0001-95",                      amount: 4700.00 },
  { date: "2026-05-08", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -2400.00 },
  { date: "2026-05-08", desc: "APLICACAO CDB DI",                                                   amount: -1100.00 },
  { date: "2026-05-11", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                 amount: -1000.00 },
  { date: "2026-05-11", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                 amount: -600.00 },
  { date: "2026-05-22", desc: "RESGATE CDB DI",                                                     amount: 93.02 },
  { date: "2026-05-22", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                 amount: -90.00 },
  { date: "2026-05-22", desc: "RESGATE CDB DI",                                                     amount: 500.50 },
  { date: "2026-05-22", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                 amount: -500.00 },
  { date: "2026-05-25", desc: "RESGATE CDB DI",                                                     amount: 500.70 },
  { date: "2026-05-25", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -500.00 },
  { date: "2026-05-25", desc: "RESGATE CDB DI",                                                     amount: 500.77 },
  { date: "2026-05-25", desc: "PIX ENVIADO MIGUEL COSTA DE SOUZA 134.390.427-74",                  amount: -500.00 },
  { date: "2026-05-26", desc: "RECEBIMENTOS CURSO FLAMA VESTIBULARES LTDA 32.010.340/0001-90",     amount: 1000.00 },
  { date: "2026-05-26", desc: "PIX ENVIADO AWQ 44.859.574/0001-95",                                 amount: -500.00 },
];

async function runSeed(uploadedBy: string) {
  // Idempotency: if a document with this fileHash already exists, bail.
  const existing = await getAllDocuments();
  if (existing.some((d) => d.fileHash === FILE_HASH)) {
    return { status: "already_seeded", fileHash: FILE_HASH };
  }

  const docId = newId();
  const now = new Date().toISOString();

  const doc: FinancialDocument = {
    id:               docId,
    filename:         "Extrato_080700991013_02062026_Parte1.pdf",
    fileHash:         FILE_HASH,
    bank:             BANK,
    accountName:      ACCOUNT_NAME,
    accountNumber:    ACCOUNT_NUMBER,
    entity:           ENTITY,
    periodStart:      "2026-03-03",
    periodEnd:        "2026-06-02",
    openingBalance:   39.18,
    closingBalance:   504.99,
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: RAW.length,
    parserConfidence: "high",
    extractionNotes:  "Seed manual a partir do PDF Itaú AWQ Holding (Ag 0807, Conta 0099101-3). Hand-extracted by /api/setup/seed-itau-extract.",
    blobUrl:          null,
  };

  // Compute running balance walking forward from openingBalance
  // (PDF is reverse-chronological with daily SALDO TOTAL DISPONÍVEL DIA — we walk in cron order)
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
