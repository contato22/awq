// POST/GET /api/setup/seed-itau-extract-jun2026
//
// Seed one-shot do extrato Itaú AWQ Holding (Ag 0807 / Conta 0099101-3)
// período 02/06/2026 – 02/06/2026 (transações novas além do seed anterior que ia até 26/05).
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

const FILE_HASH = "seed-itau-awq-080700991013-2026-06-02-2026-06-02";
const ACCOUNT_NAME = "Conta Itaú Empresas AWQ";
const ACCOUNT_NUMBER = "0807 / 0099101-3";
const BANK = "Itaú" as const;
const ENTITY = "AWQ_Holding" as const;

interface RawTxn { date: string; desc: string; amount: number }

// Transações NOVAS do extrato Itaú (02/06/2026).
// As entradas de 11/05 a 26/05 já constam no seed anterior (seed-itau-extract, período até 26/05).
// amount > 0 = crédito; amount < 0 = débito.
const RAW: RawTxn[] = [
  { date: "2026-06-02", desc: "TAR MANUT CONTA 05/26",  amount:  -87.00 },
  { date: "2026-06-02", desc: "TAR PIX PGTO TRANSF",    amount:  -39.50 },
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
    periodStart:      "2026-06-02",
    periodEnd:        "2026-06-02",
    openingBalance:   504.99,
    closingBalance:   378.49,
    uploadedAt:       now,
    uploadedBy,
    status:           "done",
    errorMessage:     null,
    transactionCount: RAW.length,
    parserConfidence: "high",
    extractionNotes:  "Seed manual a partir do PDF Itaú AWQ Holding (Ag 0807, Conta 0099101-3), gerado 10/06/2026. Contém apenas transações novas (02/06) não cobertas pelo seed anterior. Hand-extracted by /api/setup/seed-itau-extract-jun2026.",
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
  // Uses the ERP anon key (public, hardcoded in lib/supabase.ts) — no extra GitHub Secret needed.
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
