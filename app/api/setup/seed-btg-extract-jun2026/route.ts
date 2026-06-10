// POST/GET /api/setup/seed-btg-extract-jun2026
//
// Seed one-shot do extrato BTG AWQ Holding (Banco 208 / Ag 50 / Conta 019228733)
// período 01/06/2026 – 10/06/2026, gerado em 10/06/2026.
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

const FILE_HASH = "seed-btg-awq-208-50-019228733-2026-06-01-2026-06-10";
const ACCOUNT_NAME = "Conta BTG Empresas AWQ";
const ACCOUNT_NUMBER = "208 / 50 / 019228733";
const BANK = "BTG Empresas" as const;
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }

// Transações extraídas do PDF (ordem cronológica, saldo abertura 01/06 = R$ 500,00).
// amount > 0 = crédito; amount < 0 = débito.
const RAW: RawTxn[] = [
  { date: "2026-06-02", desc: "Pix recebido de AWQ · Banco 403 · CNPJ 44.859.574/0001-95",                          amount:  1800.00 },
  { date: "2026-06-03", desc: "Valor de Rendimento Remunera+",                                                         amount:     0.01 },
  { date: "2026-06-03", desc: "Pix recebido de AWQ · Banco 403 · CNPJ 44.859.574/0001-95",                          amount:  1000.00 },
  { date: "2026-06-03", desc: "Débito na Conta Corrente",                                                               amount: -2800.00 },
  { date: "2026-06-03", desc: "Aplicação Conta Remunerada",                                                             amount:  2800.00 },
  { date: "2026-06-08", desc: "Valor de Rendimento Remunera+",                                                         amount:     0.02 },
  { date: "2026-06-09", desc: "Valor de Rendimento Remunera+",                                                         amount:     0.01 },
  { date: "2026-06-09", desc: "Compra no débito 7184 - Alem Tejo Cafe",                                               amount:   -19.80 },
  { date: "2026-06-09", desc: "Resgate Conta Remunerada",                                                               amount:   -19.80 },
  { date: "2026-06-09", desc: "Crédito na Conta Corrente",                                                              amount:    19.80 },
  { date: "2026-06-10", desc: "Valor de Rendimento Remunera+",                                                         amount:     0.01 },
  { date: "2026-06-10", desc: "Pix recebido de MARIA ISABEL DE JESUS CONTE · Banco 033 · CPF ***.364.317-**",       amount:  3000.00 },
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
    filename:         "50_019228733_2.pdf",
    fileHash:         FILE_HASH,
    bank:             BANK,
    accountName:      ACCOUNT_NAME,
    accountNumber:    ACCOUNT_NUMBER,
    entity:           ENTITY,
    periodStart:      "2026-06-01",
    periodEnd:        "2026-06-10",
    openingBalance:   500.00,
    closingBalance:   6280.25,
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: RAW.length,
    parserConfidence: "high",
    extractionNotes:  "Seed manual a partir do PDF BTG Empresas AWQ Holding (Banco 208 / Ag 50 / Conta 019228733), gerado 10/06/2026. Hand-extracted by /api/setup/seed-btg-extract-jun2026.",
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
