// POST/GET /api/setup/seed-btg-extract-jun2026
//
// Seed one-shot do extrato BTG AWQ Holding (Banco 208 / Ag 50 / Conta 019228733)
// período 08/06/2026 – 10/06/2026 (transações novas além do seed anterior que ia até 03/06).
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

const FILE_HASH = "seed-btg-awq-208-50-019228733-2026-06-08-2026-06-10";
const ACCOUNT_NAME = "Conta BTG Empresas AWQ";
const ACCOUNT_NUMBER = "208 / 50 / 019228733";
const BANK = "BTG Empresas" as const;
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }

// Transações NOVAS do extrato BTG (08–10/06/2026).
// As entradas de 02/06 e 03/06 já constam no seed anterior (seed-btg-extract, período até 03/06).
// amount > 0 = crédito; amount < 0 = débito.
const RAW: RawTxn[] = [
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
    periodStart:      "2026-06-08",
    periodEnd:        "2026-06-10",
    openingBalance:   3300.01,
    closingBalance:   6280.25,
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: RAW.length,
    parserConfidence: "high",
    extractionNotes:  "Seed manual a partir do PDF BTG Empresas AWQ Holding (Banco 208 / Ag 50 / Conta 019228733), gerado 10/06/2026. Contém apenas transações novas (08–10/06) não cobertas pelo seed anterior. Hand-extracted by /api/setup/seed-btg-extract-jun2026.",
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

  // Allow GitHub Actions post-deploy trigger via x-seed-secret header.
  // Uses ERP anon key (public, hardcoded in lib/supabase.ts) — no extra GitHub Secret needed.
  const ERP_ANON = process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY
    || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";
  const seedSecret = req.headers.get("x-seed-secret");
  const validSecret = seedSecret === ERP_ANON;

  if (!email && !validSecret) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const caller = email ?? "github-actions";
  try {
    const result = await runSeed(caller);
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
