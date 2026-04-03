// ─── POST /api/ingest/process ──────────────────────────────────────────────────
//
// Runs the full ingestion pipeline for a document and streams progress via SSE:
//
//   Stage 1: extracting   — Claude reads the PDF, extracts raw transactions
//   Stage 2: classifying  — rule engine classifies each transaction
//   Stage 3: reconciling  — intercompany detector runs
//   Stage 4: done / error — final status written, transaction count updated
//
// REQUEST BODY:
//   { documentId: string }
//
// RESPONSE: text/event-stream
//   { stage, message, progress? }   — progress events
//   { done: true, summary }          — final success event
//   { error: string }                — failure event
//
// API KEY: uses server ANTHROPIC_API_KEY (never expose client key to server processing)

import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import {
  getDocument,
  updateDocumentStatus,
  saveTransactions,
  newId,
} from "@/lib/financial-db";
import type { BankTransaction, EntityLayer } from "@/lib/financial-db";
import { parsePDF } from "@/lib/bank-parsers";
import { classifyTransaction, inferEntityFromAccount } from "@/lib/financial-classifier";
import { reconcileIntercompany, buildConsolidationSummary } from "@/lib/financial-reconciler";

export const runtime = "nodejs";

const PDF_DIR = path.join(process.cwd(), "public", "data", "financial", "pdfs");

function sse(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest): Promise<Response> {
  let documentId: string | undefined;
  try {
    const body = await req.json() as { documentId?: string };
    documentId = body.documentId;
  } catch {
    return new Response(
      sse({ error: "Corpo da requisição inválido. Envie JSON com { documentId }." }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  if (!documentId) {
    return new Response(
      sse({ error: "documentId obrigatório" }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // Narrowed to string — safe to use in closures below
  const docId: string = documentId;

  const doc = getDocument(docId);
  if (!doc) {
    return new Response(
      sse({ error: `Documento ${documentId} não encontrado.` }),
      { status: 404, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // API key is optional — rule-based parser runs without it.
  // Claude Vision fallback activates automatically when key is present.
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(event)));
      };

      try {
        // ── Stage 1: Extract ──────────────────────────────────────────────────
        send({ stage: "extracting", message: "Enviando PDF para Claude para extração..." });
        updateDocumentStatus(docId, "extracting");

        // Find PDF file
        if (!fs.existsSync(PDF_DIR)) {
          throw new Error(`Diretório de PDFs não encontrado (${PDF_DIR}). Nenhum arquivo foi enviado ainda ou o servidor foi reiniciado.`);
        }
        const pdfFiles = fs.readdirSync(PDF_DIR).filter((f) => f.startsWith(docId));
        if (pdfFiles.length === 0) {
          throw new Error(`PDF não encontrado em disco para documentId ${docId}. O arquivo pode ter sido perdido.`);
        }
        const pdfPath = path.join(PDF_DIR, pdfFiles[0]);
        const pdfBuffer = fs.readFileSync(pdfPath);

        send({
          stage: "extracting",
          message: `PDF carregado (${Math.round(pdfBuffer.length / 1024)}KB). Iniciando extração...`,
          hasApiKey: !!apiKey,
        });

        // Pass the buffer directly — parsePDF accepts Buffer or base64.
        // apiKey is optional; Claude Vision fallback only runs if key is set.
        const parsed = await parsePDF(pdfBuffer, doc.bank, apiKey);

        send({
          stage: "extracting",
          message: `Extração concluída. ${parsed.transactions.length} lançamentos encontrados. Confiança: ${parsed.parserConfidence}.`,
          confidence: parsed.parserConfidence,
          transactionCount: parsed.transactions.length,
          extractionNotes: parsed.extractionNotes,
        });

        if (parsed.transactions.length === 0) {
          updateDocumentStatus(docId, "error", {
            errorMessage: `Nenhum lançamento extraído. ${parsed.extractionNotes}`,
            parserConfidence: parsed.parserConfidence,
            extractionNotes: parsed.extractionNotes,
          });
          send({
            error: `Nenhum lançamento encontrado no PDF. ${parsed.extractionNotes}`,
            stage: "error",
          });
          send({ done: true, success: false });
          controller.close();
          return;
        }

        // Update document with extraction metadata
        updateDocumentStatus(docId, "classifying", {
          periodStart: parsed.periodStart,
          periodEnd: parsed.periodEnd,
          openingBalance: parsed.openingBalance,
          closingBalance: parsed.closingBalance,
          accountNumber: parsed.accountNumber,
          parserConfidence: parsed.parserConfidence,
          extractionNotes: parsed.extractionNotes,
          transactionCount: parsed.transactions.length,
        });

        // ── Stage 2: Classify ─────────────────────────────────────────────────
        send({ stage: "classifying", message: `Classificando ${parsed.transactions.length} lançamentos...` });

        const accountEntity: EntityLayer = inferEntityFromAccount(doc.bank, doc.accountName);
        const now = new Date().toISOString();

        const rawTransactions: BankTransaction[] = parsed.transactions.map((t) => {
          const classification = classifyTransaction(
            t.descriptionOriginal,
            t.amount,
            t.direction,
            accountEntity
          );

          return {
            id: newId(),
            documentId: docId,
            bank: parsed.bank || doc.bank,
            accountName: doc.accountName,
            entity: classification.entity,
            transactionDate: t.transactionDate,
            descriptionOriginal: t.descriptionOriginal,
            amount: t.amount,
            direction: t.direction,
            runningBalance: t.runningBalance,
            counterpartyName: classification.counterpartyName,
            managerialCategory: classification.category,
            classificationConfidence: classification.confidence,
            classificationNote: classification.note ?? t.extractionNote,
            isIntercompany: false,
            intercompanyMatchId: null,
            excludedFromConsolidated: false,
            extractedAt: now,
            classifiedAt: now,
          };
        });

        const ambiguousCount = rawTransactions.filter(
          (t) => t.classificationConfidence === "ambiguous"
        ).length;
        const confirmedCount = rawTransactions.filter(
          (t) => t.classificationConfidence === "confirmed"
        ).length;

        send({
          stage: "classifying",
          message: `Classificação concluída. ${confirmedCount} confirmados, ${ambiguousCount} ambíguos.`,
          confirmed: confirmedCount,
          ambiguous: ambiguousCount,
        });

        updateDocumentStatus(docId, "reconciling");

        // ── Stage 3: Reconcile ────────────────────────────────────────────────
        send({ stage: "reconciling", message: "Verificando transferências intercompany..." });

        const { matches, updated: reconciledTransactions } =
          reconcileIntercompany(rawTransactions);

        const summary = buildConsolidationSummary(reconciledTransactions, matches);

        send({
          stage: "reconciling",
          message: `Reconciliação concluída. ${matches.length} transferências intercompany identificadas.`,
          intercompanyMatches: matches.length,
          amountEliminated: summary.amountEliminated,
        });

        // ── Stage 4: Persist ──────────────────────────────────────────────────
        saveTransactions(reconciledTransactions);
        updateDocumentStatus(docId, "done", {
          transactionCount: reconciledTransactions.length,
        });

        send({
          stage: "done",
          message: `Pipeline concluído com sucesso.`,
          done: true,
          success: true,
          summary: {
            documentId: docId,
            transactionCount: reconciledTransactions.length,
            parserConfidence: parsed.parserConfidence,
            intercompanyMatches: matches.length,
            amountEliminated: summary.amountEliminated,
            ambiguous: summary.ambiguous,
            extractionNotes: parsed.extractionNotes,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateDocumentStatus(docId, "error", { errorMessage: msg });
        send({ stage: "error", error: msg, done: true, success: false });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
