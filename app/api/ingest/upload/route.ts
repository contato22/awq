// ─── POST /api/ingest/upload ───────────────────────────────────────────────────
//
// Receives a PDF bank statement via multipart/form-data and:
//   1. Validates the file (type, size)
//   2. Computes SHA-256 hash for deduplication
//   3. Saves document metadata to financial-db (Neon or filesystem)
//   4. Stores the PDF: Vercel Blob (BLOB_READ_WRITE_TOKEN set) or local filesystem
//   5. Returns the document ID for subsequent processing
//
// FIELDS (form-data):
//   file        – the PDF file (required)
//   bank        – "Cora" | "Itaú" | "Outro" (required)
//   accountName – human label e.g. "Conta PJ AWQ" (required)
//   entity      – "AWQ_Holding" | "JACQES" | "Caza_Vision" (optional, inferred if absent)
//
// AUTHENTICATION:
//   Middleware (middleware.ts) enforces JWT presence for all non-auth routes.
//   This route uses getToken() to extract the user email from the JWT for audit trail.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";
import fs from "fs";
import path from "path";
import {
  hashBuffer,
  newId,
  saveDocument,
  findDuplicateDocument,
} from "@/lib/financial-db";
import { inferEntityFromAccount } from "@/lib/financial-classifier";
import { USE_BLOB, initDB } from "@/lib/db";
import type { BankName, EntityLayer, FinancialDocument } from "@/lib/financial-db";

export const runtime = "nodejs";

const PDF_DIR = path.join(process.cwd(), "public", "data", "financial", "pdfs");
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function ensurePDFDir() {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Ensure DB schema exists (idempotent) ──
  await initDB();

  // ── Auth: extract JWT + RBAC guard ──
  const token     = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userEmail = (token?.email as string | undefined) ?? "anonymous";
  const userRole  = (token?.role  as string | undefined) ?? "anonymous";

  const { result: guardResult, reason: guardReason } = guard(
    userEmail, userRole, "/api/ingest/upload", "dados_infra", "import", "Extrato bancário PDF"
  );
  if (guardResult === "blocked") {
    return NextResponse.json(
      { error: "Acesso negado", code: "RBAC_DENIED", reason: guardReason },
      { status: 403 }
    );
  }

  // ── Parse multipart form ──
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Formato inválido. Envie multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const bank = (formData.get("bank") as string | null) ?? "Outro";
  const accountName = (formData.get("accountName") as string | null) ?? "";
  const entityOverride = formData.get("entity") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Campo 'file' obrigatório (arquivo PDF)." },
      { status: 400 }
    );
  }
  if (!accountName.trim()) {
    return NextResponse.json(
      { error: "Campo 'accountName' obrigatório." },
      { status: 400 }
    );
  }
  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Apenas arquivos PDF são aceitos." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. Máximo: 20MB.` },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Falha ao ler o arquivo." }, { status: 400 });
  }

  const fileHash = hashBuffer(buffer);

  // ── Deduplication ──
  try {
    const existing = await findDuplicateDocument(fileHash);
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
  } catch {
    // Dedup check failed — proceed with upload rather than blocking the user
  }

  // ── Infer entity ──
  const entity: EntityLayer = entityOverride
    ? (entityOverride as EntityLayer)
    : inferEntityFromAccount(bank, accountName);

  const docId = newId();
  const safeFilename = `${docId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // ── Store PDF: Vercel Blob or filesystem ──
  let blobUrl: string | null = null;

  try {
    if (USE_BLOB) {
      // Vercel Blob — persistent across deployments
      const { put } = await import("@vercel/blob");
      const result = await put(`financial-pdfs/${safeFilename}`, buffer, {
        access: "private",
        contentType: "application/pdf",
      });
      blobUrl = result.url;
    } else {
      // Local filesystem (development or single-instance deploy)
      ensurePDFDir();
      fs.writeFileSync(path.join(PDF_DIR, safeFilename), buffer);
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao armazenar o arquivo: ${err instanceof Error ? err.message : "erro desconhecido"}` },
      { status: 500 }
    );
  }

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
    blobUrl,
  };

  try {
    await saveDocument(doc);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao registrar documento: ${err instanceof Error ? err.message : "erro desconhecido"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ documentId: docId, document: doc }, { status: 201 });
}
