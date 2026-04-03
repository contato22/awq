// ─── AWQ Financial DB — JSON-backed persistence layer ─────────────────────────
//
// SOURCE OF TRUTH CLASSIFICATION:
//   This module is the canonical server-side store for all ingested financial data.
//   It replaces hardcoded snapshots with traceable, document-backed records.
//
// STORAGE STRATEGY:
//   Files are written to public/data/financial/ (readable by static builds as JSON).
//   On Vercel: filesystem is ephemeral between deployments — upgrade to Postgres/Neon
//   when persistence across deployments is required. All APIs return empty state
//   gracefully if files are missing (no crashes, no silent corruption).
//
// FILES:
//   public/data/financial/documents.json     → FinancialDocument[]
//   public/data/financial/transactions.json  → BankTransaction[]
//
// DO NOT import this module in client components — it uses Node's `fs` module.

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── Directory ────────────────────────────────────────────────────────────────

const DATA_DIR   = path.join(process.cwd(), "public", "data", "financial");
const DOCS_FILE  = path.join(DATA_DIR, "documents.json");
const TXN_FILE   = path.join(DATA_DIR, "transactions.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, "utf-8").trim();
    if (!content) return fallback;
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(file: string, data: unknown): void {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BankName = "Cora" | "Itaú" | "Outro";
export type EntityLayer =
  | "AWQ_Holding"
  | "JACQES"
  | "Caza_Vision"
  | "Intercompany"
  | "Socio_PF"
  | "Unknown";

export type DocumentStatus =
  | "received"
  | "extracting"
  | "classifying"
  | "reconciling"
  | "done"
  | "error";

export type ClassificationConfidence =
  | "confirmed"
  | "probable"
  | "ambiguous"
  | "unclassifiable";

// Gerencial category taxonomy — every transaction must resolve to one of these.
// "unclassified" is only acceptable if confidence = "unclassifiable".
export type ManagerialCategory =
  | "receita_recorrente"
  | "receita_projeto"
  | "receita_eventual"
  | "aporte_socio"
  | "transferencia_interna_recebida"
  | "transferencia_interna_enviada"
  | "fornecedor_operacional"
  | "freelancer_terceiro"
  | "folha_remuneracao"
  | "prolabore_retirada"
  | "imposto_tributo"
  | "tarifa_bancaria"
  | "software_assinatura"
  | "marketing_midia"
  | "deslocamento_combustivel"
  | "alimentacao_representacao"
  | "despesa_pessoal_misturada"
  | "aplicacao_financeira"
  | "resgate_financeiro"
  | "despesa_ambigua"
  | "recebimento_ambiguo"
  | "unclassified";

export interface FinancialDocument {
  id: string;
  filename: string;
  fileHash: string;             // sha256 — used for deduplication
  bank: BankName;
  accountName: string;          // e.g. "Conta PJ AWQ", "Conta PJ Caza Vision"
  accountNumber: string | null; // masked if available
  entity: EntityLayer;
  periodStart: string | null;   // YYYY-MM-DD
  periodEnd: string | null;     // YYYY-MM-DD
  openingBalance: number | null;
  closingBalance: number | null;
  uploadedAt: string;           // ISO timestamp
  uploadedBy: string;           // email
  status: DocumentStatus;
  errorMessage: string | null;
  transactionCount: number;
  parserConfidence: "high" | "medium" | "low" | null;
  extractionNotes: string | null;
}

export interface BankTransaction {
  // ── Identity
  id: string;
  documentId: string;
  // ── Raw extraction
  bank: string;
  accountName: string;
  entity: EntityLayer;
  transactionDate: string;         // YYYY-MM-DD
  descriptionOriginal: string;     // verbatim from extrato
  amount: number;                  // positive = credit, negative = debit
  direction: "credit" | "debit";
  runningBalance: number | null;
  // ── Classification
  counterpartyName: string | null;
  managerialCategory: ManagerialCategory;
  classificationConfidence: ClassificationConfidence;
  classificationNote: string | null;
  // ── Reconciliation
  isIntercompany: boolean;
  intercompanyMatchId: string | null;
  excludedFromConsolidated: boolean;
  // ── Metadata
  extractedAt: string;
  classifiedAt: string | null;
}

// ─── Documents CRUD ───────────────────────────────────────────────────────────

export function getAllDocuments(): FinancialDocument[] {
  return readJSON<FinancialDocument[]>(DOCS_FILE, []);
}

export function getDocument(id: string): FinancialDocument | null {
  return getAllDocuments().find((d) => d.id === id) ?? null;
}

export function saveDocument(doc: FinancialDocument): void {
  const all = getAllDocuments();
  const idx = all.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    all[idx] = doc;
  } else {
    all.unshift(doc);
  }
  writeJSON(DOCS_FILE, all);
}

export function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  patch?: Partial<FinancialDocument>
): void {
  const all = getAllDocuments();
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status, ...(patch ?? {}) };
  writeJSON(DOCS_FILE, all);
}

export function findDuplicateDocument(fileHash: string): FinancialDocument | null {
  return getAllDocuments().find((d) => d.fileHash === fileHash) ?? null;
}

// ─── Transactions CRUD ────────────────────────────────────────────────────────

export function getAllTransactions(): BankTransaction[] {
  return readJSON<BankTransaction[]>(TXN_FILE, []);
}

export function getTransactionsByDocument(documentId: string): BankTransaction[] {
  return getAllTransactions().filter((t) => t.documentId === documentId);
}

export function getTransactionsByEntity(entity: EntityLayer): BankTransaction[] {
  return getAllTransactions().filter((t) => t.entity === entity);
}

export function saveTransactions(transactions: BankTransaction[]): void {
  const all = getAllTransactions();
  // Replace existing transactions for these documentIds, then prepend new ones
  const docIds = new Set(transactions.map((t) => t.documentId));
  const kept = all.filter((t) => !docIds.has(t.documentId));
  writeJSON(TXN_FILE, [...transactions, ...kept]);
}

export function updateTransaction(
  id: string,
  patch: Partial<BankTransaction>
): void {
  const all = getAllTransactions();
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  writeJSON(TXN_FILE, all);
}

// ─── Consolidation queries ─────────────────────────────────────────────────────

export interface ConsolidatedCashPosition {
  entity: EntityLayer;
  bank: string;
  accountName: string;
  openingBalance: number;
  totalCredits: number;
  totalDebits: number;
  netCash: number;
  internalTransfersIn: number;
  internalTransfersOut: number;
  intercompanyEliminated: number;
  operationalNetCash: number;   // credits - debits, excluding intercompany
}

export function getCashPositionByEntity(): ConsolidatedCashPosition[] {
  const docs = getAllDocuments().filter((d) => d.status === "done");
  const txns = getAllTransactions();

  const entityMap = new Map<string, ConsolidatedCashPosition>();

  for (const doc of docs) {
    const key = `${doc.entity}__${doc.bank}__${doc.accountName}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        entity: doc.entity,
        bank: doc.bank,
        accountName: doc.accountName,
        openingBalance: doc.openingBalance ?? 0,
        totalCredits: 0,
        totalDebits: 0,
        netCash: 0,
        internalTransfersIn: 0,
        internalTransfersOut: 0,
        intercompanyEliminated: 0,
        operationalNetCash: 0,
      });
    }
  }

  const docIds = new Set(docs.map((d) => d.id));
  const relevantTxns = txns.filter((t) => docIds.has(t.documentId));

  for (const txn of relevantTxns) {
    const doc = docs.find((d) => d.id === txn.documentId);
    if (!doc) continue;
    const key = `${doc.entity}__${doc.bank}__${doc.accountName}`;
    const pos = entityMap.get(key);
    if (!pos) continue;

    const amt = Math.abs(txn.amount);
    if (txn.direction === "credit") {
      pos.totalCredits += amt;
    } else {
      pos.totalDebits += amt;
    }

    if (txn.isIntercompany) {
      pos.intercompanyEliminated += amt;
      if (txn.direction === "credit") pos.internalTransfersIn += amt;
      else pos.internalTransfersOut += amt;
    }
  }

  for (const pos of Array.from(entityMap.values())) {
    pos.netCash = pos.totalCredits - pos.totalDebits;
    pos.operationalNetCash =
      (pos.totalCredits - pos.internalTransfersIn) -
      (pos.totalDebits - pos.internalTransfersOut);
  }

  return Array.from(entityMap.values());
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function hashBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function newId(): string {
  return crypto.randomBytes(8).toString("hex") + Date.now().toString(36);
}
