// ─── AWQ Financial DB — persistence layer ────────────────────────────────────
//
// SOURCE OF TRUTH CLASSIFICATION:
//   This module is the canonical server-side store for all ingested financial data.
//
// STORAGE ADAPTERS (auto-selected at runtime):
//   DATABASE_URL set  → Neon (Postgres) via @neondatabase/serverless
//   DATABASE_URL unset → JSON files in public/data/financial/ (local dev)
//
// DO NOT import this module in client components — it uses Node's `fs` module
// (filesystem adapter) or Neon (DB adapter). Both are server-only.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { sql, USE_DB } from "./db";

// ─── Directory (filesystem adapter only) ─────────────────────────────────────

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

// Digital / fintech banks
// Traditional banks
export type BankName =
  | "Cora"
  | "Nubank"
  | "Inter"
  | "C6 Bank"
  | "PagBank"
  | "BTG Empresas"
  | "XP"
  | "Mercado Pago"
  | "Itaú"
  | "Bradesco"
  | "Banco do Brasil"
  | "Santander"
  | "Sicoob"
  | "Sicredi"
  | "Outro";
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

// ─── Conciliação Bancária — DFC / DRE explicit classification ─────────────────
//
// cashflowClass: DFC activity per CPC 03 / IFRS IAS 7.
//   Stored per-transaction so DFC can be generated from raw data without
//   relying on implicit category-set membership in financial-query.ts.
//
// dreEffect: Managerial DRE line assignment (gerencial, cash-basis approximation).
//   Not GAAP accrual DRE — a cash-basis DRE proxy until invoice/NF pipeline exists.
//
// reconciliationStatus: per-transaction conciliation lifecycle.
//   Set by financial-classifier (initial) and financial-reconciler (intercompany).
//   Drives the reconciliation review queue (em_revisao / pendente items).

export type CashflowClass =
  | "operacional"        // FCO — operating cash flows
  | "investimento"       // FCInv — investing activities
  | "financiamento"      // FCFin — financing activities
  | "exclusao";          // eliminated from consolidated (intercompany, reserves)

export type DREEffect =
  | "receita"            // top-line revenue
  | "custo"              // direct cost of services (COGS)
  | "opex"               // operating expenses (SG&A, overhead)
  | "financeiro"         // financial income/expense (yield, interest, IOF)
  | "imposto"            // taxes and levies
  | "nao_aplicavel";     // not a P&L item (equity movements, patrimonial, intercompany)

export type ReconciliationStatus =
  | "pendente"           // awaiting classification or manual review
  | "classificado"       // classified by rule engine (confirmed or probable confidence)
  | "conciliado"         // reconciled — intercompany match or full confirmation
  | "em_revisao"         // requires human review (ambiguous classification)
  | "rejeitado";         // rejected / excluded from all reporting

// Gerencial category taxonomy — every transaction must resolve to one of these.
// "unclassified" is only acceptable if confidence = "unclassifiable".
// ─── Taxonomia DRE Gerencial (completa) ───────────────────────────────────────
//
// ENTRADAS (receitas e créditos)
//   receita_recorrente           — mensalidade/retainer de cliente recorrente
//   receita_projeto              — projeto fechado (produção, campanha, entrega)
//   receita_consultoria          — honorários de consultoria / advisory
//   receita_producao             — produção audiovisual / conteúdo (ex: AT FILMS)
//   receita_social_media         — social media management recorrente
//   receita_revenue_share        — revenue share / participação em resultados
//   receita_fee_venture          — fee recorrente de advisory/incubação da Venture (ex: ENERDY)
//   receita_eventual             — receita avulsa / one-off não recorrente
//   rendimento_financeiro        — juros, rendimentos CDB/LCI/LCA, dividendos
//   aporte_socio                 — capitalização direta do sócio
//   transferencia_interna_recebida — transferência intercompany recebida
//   ajuste_bancario_credito      — estorno, ajuste ou crédito bancário avulso
//   recebimento_ambiguo          — crédito não classificado, pendente revisão
//
// SAÍDAS (despesas e débitos)
//   fornecedor_operacional       — fornecedor/prestador operacional geral
//   freelancer_terceiro          — freelancer, autônomo, MEI contratado
//   folha_remuneracao            — salário CLT, benefícios, FGTS, INSS folha
//   prolabore_retirada           — pró-labore ou retirada do sócio
//   imposto_tributo              — DAS, DARF, ISS, Simples Nacional, IRPJ, CSLL
//   juros_multa_iof              — IOF, multas, juros bancários/fiscais
//   tarifa_bancaria              — tarifa de conta, TED, Pix manual, manutenção
//   software_assinatura          — SaaS, ferramentas digitais, licenças
//   marketing_midia              — tráfego pago, Meta/Google Ads, mídia comprada
//   deslocamento_combustivel     — combustível, Uber, táxi, transporte
//   alimentacao_representacao    — alimentação (operacional ou representação)
//   viagem_hospedagem            — passagem aérea, hotel, hospedagem
//   aluguel_locacao              — aluguel de imóvel ou equipamento, coworking
//   energia_agua_internet        — contas de concessionária (energia, água, net)
//   servicos_contabeis_juridicos — contabilidade, escritório jurídico, compliance
//   cartao_compra_operacional    — compra operacional via cartão corporativo
//   despesa_pessoal_misturada    — despesa pessoal do sócio na conta PJ (flag)
//   aplicacao_financeira         — aplicação em CDB, LCI, LCA, fundo de investimento
//   transferencia_interna_enviada — transferência intercompany enviada
//   reserva_limite_cartao        — reserva de limite para cartão de crédito garantido
//   despesa_ambigua              — débito não classificado, pendente revisão
//   unclassified                 — não classificado (só com confidence=unclassifiable)

export type ManagerialCategory =
  // ── Entradas ──────────────────────────────────────────────────────────────
  | "receita_recorrente"
  | "receita_projeto"
  | "receita_consultoria"
  | "receita_producao"
  | "receita_social_media"
  | "receita_revenue_share"
  | "receita_fee_venture"
  | "receita_eventual"
  | "rendimento_financeiro"
  | "aporte_socio"
  | "transferencia_interna_recebida"
  | "ajuste_bancario_credito"
  | "recebimento_ambiguo"
  // ── Saídas ────────────────────────────────────────────────────────────────
  | "fornecedor_operacional"
  | "freelancer_terceiro"
  | "folha_remuneracao"
  | "prolabore_retirada"
  | "imposto_tributo"
  | "juros_multa_iof"
  | "tarifa_bancaria"
  | "software_assinatura"
  | "marketing_midia"
  | "deslocamento_combustivel"
  | "alimentacao_representacao"
  | "viagem_hospedagem"
  | "aluguel_locacao"
  | "energia_agua_internet"
  | "servicos_contabeis_juridicos"
  | "cartao_compra_operacional"
  | "despesa_pessoal_misturada"
  | "aplicacao_financeira"
  | "resgate_financeiro"
  | "transferencia_interna_enviada"
  | "reserva_limite_cartao"
  | "despesa_ambigua"
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
  blobUrl: string | null;       // Vercel Blob URL for the PDF (null = filesystem or not set)
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
  // ── DFC / DRE / Conciliação Bancária classification
  cashflowClass:         CashflowClass | null;    // DFC activity (CPC 03)
  dreEffect:             DREEffect | null;         // DRE gerencial line
  reconciliationStatus:  ReconciliationStatus;     // per-transaction lifecycle status
  // ── Metadata
  extractedAt: string;
  classifiedAt: string | null;
}

// ─── Row mappers (DB adapter) ─────────────────────────────────────────────────

type Row = Record<string, unknown>;
const s  = (v: unknown): string       => v as string;
const sn = (v: unknown): string | null => (v != null ? (v as string) : null);

function rowToDocument(r: Row): FinancialDocument {
  return {
    id:               s(r.id),
    filename:         s(r.filename),
    fileHash:         s(r.file_hash),
    bank:             s(r.bank) as BankName,
    accountName:      s(r.account_name),
    accountNumber:    sn(r.account_number),
    entity:           s(r.entity) as EntityLayer,
    periodStart:      sn(r.period_start),
    periodEnd:        sn(r.period_end),
    openingBalance:   r.opening_balance != null ? Number(r.opening_balance) : null,
    closingBalance:   r.closing_balance != null ? Number(r.closing_balance) : null,
    uploadedAt:       s(r.uploaded_at),
    uploadedBy:       s(r.uploaded_by),
    status:           s(r.status) as DocumentStatus,
    errorMessage:     sn(r.error_message),
    transactionCount: Number(r.transaction_count),
    parserConfidence: sn(r.parser_confidence) as FinancialDocument["parserConfidence"],
    extractionNotes:  sn(r.extraction_notes),
    blobUrl:          sn(r.blob_url),
  };
}

function rowToTransaction(r: Row): BankTransaction {
  return {
    id:                        s(r.id),
    documentId:                s(r.document_id),
    bank:                      s(r.bank),
    accountName:               s(r.account_name),
    entity:                    s(r.entity) as EntityLayer,
    transactionDate:           s(r.transaction_date),
    descriptionOriginal:       s(r.description_original),
    amount:                    Number(r.amount),
    direction:                 s(r.direction) as "credit" | "debit",
    runningBalance:            r.running_balance != null ? Number(r.running_balance) : null,
    counterpartyName:          sn(r.counterparty_name),
    managerialCategory:        s(r.managerial_category) as ManagerialCategory,
    classificationConfidence:  s(r.classification_confidence) as ClassificationConfidence,
    classificationNote:        sn(r.classification_note),
    isIntercompany:            Boolean(r.is_intercompany),
    intercompanyMatchId:       sn(r.intercompany_match_id),
    excludedFromConsolidated:  Boolean(r.excluded_from_consolidated),
    cashflowClass:             sn(r.cashflow_class) as CashflowClass | null,
    dreEffect:                 sn(r.dre_effect) as DREEffect | null,
    reconciliationStatus:      (sn(r.reconciliation_status) as ReconciliationStatus | null) ?? "pendente",
    extractedAt:               s(r.extracted_at),
    classifiedAt:              sn(r.classified_at),
  };
}

// ─── Documents CRUD ───────────────────────────────────────────────────────────

export async function getAllDocuments(): Promise<FinancialDocument[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM financial_documents ORDER BY uploaded_at DESC`;
    return rows.map(rowToDocument);
  }
  return readJSON<FinancialDocument[]>(DOCS_FILE, []).map((d) => ({
    ...d,
    blobUrl: (d as FinancialDocument & { blobUrl?: string | null }).blobUrl ?? null,
  }));
}

export async function getDocument(id: string): Promise<FinancialDocument | null> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM financial_documents WHERE id = ${id} LIMIT 1`;
    return rows.length > 0 ? rowToDocument(rows[0]) : null;
  }
  const docs = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const doc = docs.find((d) => d.id === id);
  return doc ? { ...doc, blobUrl: doc.blobUrl ?? null } : null;
}

export async function saveDocument(doc: FinancialDocument): Promise<void> {
  if (USE_DB && sql) {
    await sql`
      INSERT INTO financial_documents (
        id, filename, file_hash, bank, account_name, account_number,
        entity, period_start, period_end, opening_balance, closing_balance,
        uploaded_at, uploaded_by, status, error_message, transaction_count,
        parser_confidence, extraction_notes, blob_url
      ) VALUES (
        ${doc.id}, ${doc.filename}, ${doc.fileHash}, ${doc.bank},
        ${doc.accountName}, ${doc.accountNumber},
        ${doc.entity}, ${doc.periodStart}, ${doc.periodEnd},
        ${doc.openingBalance}, ${doc.closingBalance},
        ${doc.uploadedAt}, ${doc.uploadedBy}, ${doc.status},
        ${doc.errorMessage}, ${doc.transactionCount},
        ${doc.parserConfidence}, ${doc.extractionNotes}, ${doc.blobUrl}
      )
      ON CONFLICT (id) DO UPDATE SET
        filename           = EXCLUDED.filename,
        bank               = EXCLUDED.bank,
        account_name       = EXCLUDED.account_name,
        account_number     = EXCLUDED.account_number,
        entity             = EXCLUDED.entity,
        period_start       = EXCLUDED.period_start,
        period_end         = EXCLUDED.period_end,
        opening_balance    = EXCLUDED.opening_balance,
        closing_balance    = EXCLUDED.closing_balance,
        status             = EXCLUDED.status,
        error_message      = EXCLUDED.error_message,
        transaction_count  = EXCLUDED.transaction_count,
        parser_confidence  = EXCLUDED.parser_confidence,
        extraction_notes   = EXCLUDED.extraction_notes,
        blob_url           = EXCLUDED.blob_url
    `;
    return;
  }
  const all = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const idx = all.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    all[idx] = doc;
  } else {
    all.unshift(doc);
  }
  writeJSON(DOCS_FILE, all);
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  patch?: Partial<FinancialDocument>
): Promise<void> {
  if (USE_DB && sql) {
    const p = patch ?? {};
    await sql`
      UPDATE financial_documents SET
        status             = ${status},
        error_message      = COALESCE(${p.errorMessage ?? null}, error_message),
        period_start       = COALESCE(${p.periodStart ?? null}, period_start),
        period_end         = COALESCE(${p.periodEnd ?? null}, period_end),
        opening_balance    = COALESCE(${p.openingBalance ?? null}, opening_balance),
        closing_balance    = COALESCE(${p.closingBalance ?? null}, closing_balance),
        account_number     = COALESCE(${p.accountNumber ?? null}, account_number),
        parser_confidence  = COALESCE(${p.parserConfidence ?? null}, parser_confidence),
        extraction_notes   = COALESCE(${p.extractionNotes ?? null}, extraction_notes),
        transaction_count  = COALESCE(${p.transactionCount ?? null}, transaction_count),
        blob_url           = COALESCE(${p.blobUrl ?? null}, blob_url)
      WHERE id = ${id}
    `;
    return;
  }
  const all = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status, ...(patch ?? {}) };
  writeJSON(DOCS_FILE, all);
}

export async function findDuplicateDocument(fileHash: string): Promise<FinancialDocument | null> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM financial_documents WHERE file_hash = ${fileHash} LIMIT 1`;
    return rows.length > 0 ? rowToDocument(rows[0]) : null;
  }
  const docs = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const doc = docs.find((d) => d.fileHash === fileHash);
  return doc ? { ...doc, blobUrl: doc.blobUrl ?? null } : null;
}

// ─── Transactions CRUD ────────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<BankTransaction[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM bank_transactions ORDER BY transaction_date DESC`;
    return rows.map(rowToTransaction);
  }
  return readJSON<BankTransaction[]>(TXN_FILE, []);
}

export async function getTransactionsByDocument(documentId: string): Promise<BankTransaction[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM bank_transactions WHERE document_id = ${documentId} ORDER BY transaction_date DESC`;
    return rows.map(rowToTransaction);
  }
  return (await getAllTransactions()).filter((t) => t.documentId === documentId);
}

export async function getTransactionsByEntity(entity: EntityLayer): Promise<BankTransaction[]> {
  if (USE_DB && sql) {
    const rows = await sql`SELECT * FROM bank_transactions WHERE entity = ${entity} ORDER BY transaction_date DESC`;
    return rows.map(rowToTransaction);
  }
  return (await getAllTransactions()).filter((t) => t.entity === entity);
}

export async function saveTransactions(transactions: BankTransaction[]): Promise<void> {
  if (USE_DB && sql) {
    if (transactions.length === 0) return;
    const docIds = Array.from(new Set(transactions.map((t) => t.documentId)));
    for (const docId of docIds) {
      await sql`DELETE FROM bank_transactions WHERE document_id = ${docId}`;
    }
    // SCHEMA NOTE: bank_transactions table must have columns:
    //   cashflow_class TEXT, dre_effect TEXT,
    //   reconciliation_status TEXT NOT NULL DEFAULT 'pendente'
    // Migration: ALTER TABLE bank_transactions
    //   ADD COLUMN IF NOT EXISTS cashflow_class TEXT,
    //   ADD COLUMN IF NOT EXISTS dre_effect TEXT,
    //   ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pendente';
    for (const t of transactions) {
      await sql`
        INSERT INTO bank_transactions (
          id, document_id, bank, account_name, entity, transaction_date,
          description_original, amount, direction, running_balance,
          counterparty_name, managerial_category, classification_confidence,
          classification_note, is_intercompany, intercompany_match_id,
          excluded_from_consolidated, cashflow_class, dre_effect,
          reconciliation_status, extracted_at, classified_at
        ) VALUES (
          ${t.id}, ${t.documentId}, ${t.bank}, ${t.accountName}, ${t.entity},
          ${t.transactionDate}, ${t.descriptionOriginal}, ${t.amount},
          ${t.direction}, ${t.runningBalance}, ${t.counterpartyName},
          ${t.managerialCategory}, ${t.classificationConfidence},
          ${t.classificationNote}, ${t.isIntercompany}, ${t.intercompanyMatchId},
          ${t.excludedFromConsolidated}, ${t.cashflowClass ?? null},
          ${t.dreEffect ?? null}, ${t.reconciliationStatus},
          ${t.extractedAt}, ${t.classifiedAt}
        )
      `;
    }
    return;
  }
  const all = readJSON<BankTransaction[]>(TXN_FILE, []);
  // Replace existing transactions for these documentIds, then prepend new ones
  const docIds = new Set(transactions.map((t) => t.documentId));
  const kept = all.filter((t) => !docIds.has(t.documentId));
  writeJSON(TXN_FILE, [...transactions, ...kept]);
}

export async function updateTransaction(
  id: string,
  patch: Partial<BankTransaction>
): Promise<void> {
  if (USE_DB && sql) {
    const p = patch;
    await sql`
      UPDATE bank_transactions SET
        managerial_category        = COALESCE(${p.managerialCategory ?? null}, managerial_category),
        classification_confidence  = COALESCE(${p.classificationConfidence ?? null}, classification_confidence),
        classification_note        = COALESCE(${p.classificationNote ?? null}, classification_note),
        counterparty_name          = COALESCE(${p.counterpartyName ?? null}, counterparty_name),
        is_intercompany            = COALESCE(${p.isIntercompany ?? null}, is_intercompany),
        intercompany_match_id      = COALESCE(${p.intercompanyMatchId ?? null}, intercompany_match_id),
        excluded_from_consolidated = COALESCE(${p.excludedFromConsolidated ?? null}, excluded_from_consolidated),
        cashflow_class             = COALESCE(${p.cashflowClass ?? null}, cashflow_class),
        dre_effect                 = COALESCE(${p.dreEffect ?? null}, dre_effect),
        reconciliation_status      = COALESCE(${p.reconciliationStatus ?? null}, reconciliation_status),
        classified_at              = COALESCE(${p.classifiedAt ?? null}, classified_at)
      WHERE id = ${id}
    `;
    return;
  }
  const all = readJSON<BankTransaction[]>(TXN_FILE, []);
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
  investmentApplications: number;  // aplicacao_financeira debits (excluded from operational)
  investmentRedemptions: number;   // resgate_financeiro credits (excluded from operational)
  operationalNetCash: number;      // credits - debits, excluding intercompany AND investment
}

export async function getCashPositionByEntity(): Promise<ConsolidatedCashPosition[]> {
  const docs = (await getAllDocuments()).filter((d) => d.status === "done");
  const txns = await getAllTransactions();

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
        investmentApplications: 0,
        investmentRedemptions: 0,
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
    } else if (txn.managerialCategory === "aplicacao_financeira") {
      pos.investmentApplications += amt;  // debit — money leaving to investment vehicle
    } else if (txn.managerialCategory === "resgate_financeiro") {
      pos.investmentRedemptions += amt;   // credit — money returning from investment vehicle
    }
  }

  for (const pos of Array.from(entityMap.values())) {
    pos.netCash = pos.totalCredits - pos.totalDebits;
    // Operational net cash excludes BOTH intercompany transfers AND investment movements
    pos.operationalNetCash =
      (pos.totalCredits - pos.internalTransfersIn - pos.investmentRedemptions) -
      (pos.totalDebits - pos.internalTransfersOut - pos.investmentApplications);
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
