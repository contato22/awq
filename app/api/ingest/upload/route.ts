// ─── POST /api/ingest/upload ───────────────────────────────────────────────────
//
// Receives a PDF bank statement via multipart/form-data and:
//   1. Validates the file (type, size)
//   2. Computes SHA-256 hash for deduplication
//   3. Saves document metadata to financial-db
//   4. Stores the PDF to public/data/financial/pdfs/
//   5. Returns the document ID for subsequent processing
//
// FIELDS (form-data):
//   file        – the PDF file (required)
//   bank        – "Cora" | "Itaú" | "Outro" (required)
//   accountName – human label e.g. "Conta PJ AWQ" (required)
//   entity      – "AWQ_Holding" | "JACQES" | "Caza_Vision" (optional, inferred if absent)
//
// AUTHENTICATION: requires NextAuth session (same guard as all /api routes)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs";
import path from "path";
import {
  hashBuffer,
  newId,
  saveDocument,
  findDuplicateDocument,
} from "@/lib/financial-db";
import { inferEntityFromAccount } from "@/lib/financial-classifier";
import type { BankName, EntityLayer, FinancialDocument } from "@/lib/financial-db";

// Re-export so Next.js doesn't try to parse the route as static
export const runtime = "nodejs";

const PDF_DIR = path.join(process.cwd(), "public", "data", "financial", "pdfs");
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function ensurePDFDir() {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth guard ──
  const session = await getServerSession();
  const userEmail = (session?.user as { email?: string } | undefined)?.email ?? "anonymous";

  // ── Parse multipart form ──
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido. Envie multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  const bank = (formData.get("bank") as string | null) ?? "Outro";
  const accountName = (formData.get("accountName") as string | null) ?? "";
  const entityOverride = formData.get("entity") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Campo 'file' obrigatório (arquivo PDF)." }, { status: 400 });
  }
  if (!accountName.trim()) {
    return NextResponse.json({ error: "Campo 'accountName' obrigatório." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    return NextResponse.json({ error: "Apenas arquivos PDF são aceitos." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: `Arquivo muito grande. Máximo: 20MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = hashBuffer(buffer);

  // ── Deduplication ──
  const existing = findDuplicateDocument(fileHash);
  if (existing) {
    return NextResponse.json(
      {
        duplicate: true,
        documentId: existing.id,
        message: `Este arquivo já foi enviado (${existing.filename}, ${existing.uploadedAt.slice(0, 10)}).`,
        document: existing,
      },
      { status: 200 }
    );
  }

  // ── Infer entity ──
  const entity: EntityLayer = entityOverride
    ? (entityOverride as EntityLayer)
    : inferEntityFromAccount(bank, accountName);

  // ── Save PDF to disk ──
  const docId = newId();
  const safeFilename = `${docId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  ensurePDFDir();
  fs.writeFileSync(path.join(PDF_DIR, safeFilename), buffer);

  // ── Save document record ──
  const doc: FinancialDocument = {
    id: docId,
    filename: file.name,
    fileHash,
    bank: bank as BankName,
    accountName: accountName.trim(),
    accountNumber: null,
    entity,
    periodStart: null,
    periodEnd: null,
    openingBalance: null,
    closingBalance: null,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userEmail,
    status: "received",
    errorMessage: null,
    transactionCount: 0,
    parserConfidence: null,
    extractionNotes: null,
  };
  saveDocument(doc);

  return NextResponse.json({ documentId: docId, document: doc }, { status: 201 });
}
