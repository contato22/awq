// POST /api/setup/seed-santander-extracts
//
// Seed em lote dos extratos Santander AWQ Holding
// (Ag 0775 / Conta Corrente 13.002009-6 — AWQ PRODUCOES LTDA)
// período Jan/2022 → Mai/2026 (53 meses).
//
// Cria um financial_documents por mês + insere todas as bank_transactions.
// Idempotente: cada mês usa fileHash determinístico — re-rodar não duplica.

import { NextRequest, NextResponse } from "next/server";
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
import data from "@/data/santander-extracts/data.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANK = "Santander" as const;
const ACCOUNT_NAME   = "Conta Santander AWQ";
const ACCOUNT_NUMBER = "0775 / 13.002009-6";
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }
interface Month {
  year: number;
  month: number;
  monthLabel: string;
  fileId: string;
  filename: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  transactions: RawTxn[];
}

const MONTHS = (data as { months: Month[] }).months;

function fileHashFor(m: Month): string {
  return `seed-santander-awq-077513002009-${m.periodStart}-${m.periodEnd}`;
}

async function seedMonth(m: Month, uploadedBy: string, now: string, existingHashes: Set<string>) {
  const fileHash = fileHashFor(m);
  if (existingHashes.has(fileHash)) {
    return { period: `${m.year}-${String(m.month).padStart(2, "0")}`, status: "already_seeded" as const, transactionCount: 0 };
  }

  const docId = newId();

  const doc: FinancialDocument = {
    id:               docId,
    filename:         m.filename,
    fileHash,
    bank:             BANK,
    accountName:      ACCOUNT_NAME,
    accountNumber:    ACCOUNT_NUMBER,
    entity:           ENTITY,
    periodStart:      m.periodStart,
    periodEnd:        m.periodEnd,
    openingBalance:   m.openingBalance,
    closingBalance:   m.closingBalance,
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: m.transactions.length,
    parserConfidence: "high",
    extractionNotes:  `Seed automatizado a partir do PDF Santander (Ag 0775, CC 13.002009-6). Extraído por /api/setup/seed-santander-extracts.`,
    blobUrl:          null,
  };

  let running = doc.openingBalance ?? 0;

  const rawTxns: BankTransaction[] = m.transactions.map((r) => {
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
  if (reconciled.length > 0) {
    await saveTransactions(reconciled);
  }

  return {
    period: `${m.year}-${String(m.month).padStart(2, "0")}`,
    status: "seeded" as const,
    documentId: docId,
    transactionCount: reconciled.length,
    intercompanyMatches: matches.length,
    openingBalance: m.openingBalance,
    closingBalance: m.closingBalance,
  };
}

async function runSeed(uploadedBy: string) {
  const existing = await getAllDocuments();
  const existingHashes = new Set(existing.map((d) => d.fileHash));
  const now = new Date().toISOString();

  const results = [];
  let seeded = 0;
  let already = 0;
  let totalTxns = 0;

  for (const m of MONTHS) {
    const result = await seedMonth(m, uploadedBy, now, existingHashes);
    results.push(result);
    if (result.status === "seeded") {
      seeded += 1;
      totalTxns += result.transactionCount;
    } else {
      already += 1;
    }
  }

  return {
    totalMonths: MONTHS.length,
    seeded,
    alreadySeeded: already,
    totalTransactions: totalTxns,
    results,
  };
}

// Endpoint público (sem auth) — segue o padrão das rotas /api/cora/*-probe.
// Idempotência via fileHash impede duplicação se chamado mais de uma vez.
async function handle(_req: NextRequest) {
  try {
    const result = await runSeed("seed-santander-extracts");
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
