// ─── AWQ Financial DB — persistence layer ────────────────────────────────────
//
// SOURCE OF TRUTH CLASSIFICATION:
//   This module is the canonical server-side store for all ingested financial data.
//
// STORAGE ADAPTERS (auto-selected at runtime):
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set  → Supabase (Postgres) via @supabase/supabase-js
//   env vars unset → JSON files in public/data/financial/ (local dev)
//
// DO NOT import this module in client components — it uses Node's `fs` module
// (filesystem adapter) or Supabase (DB adapter). Both are server-only.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

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

// Reconciliation workflow status — set by the finance team after reviewing each transaction.
export type ReconciliationStatus =
  | "pendente"
  | "em_revisao"
  | "conciliado"
  | "descartado";

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
  reconciliationStatus: ReconciliationStatus;
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
    reconciliationStatus:      (sn(r.reconciliation_status) ?? "pendente") as ReconciliationStatus,
    extractedAt:               s(r.extracted_at),
    classifiedAt:              sn(r.classified_at),
  };
}

// ─── Documents CRUD ───────────────────────────────────────────────────────────

export async function getAllDocuments(): Promise<FinancialDocument[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("financial_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    const rows = (data as Row[]).map(rowToDocument);
    // Seed fallback: fresh Supabase deployment — return local JSON seed until real data is ingested
    if (rows.length === 0) {
      return readJSON<FinancialDocument[]>(DOCS_FILE, []).map((d) => ({
        ...d,
        blobUrl: (d as FinancialDocument & { blobUrl?: string | null }).blobUrl ?? null,
      }));
    }
    return rows;
  }
  return readJSON<FinancialDocument[]>(DOCS_FILE, []).map((d) => ({
    ...d,
    blobUrl: (d as FinancialDocument & { blobUrl?: string | null }).blobUrl ?? null,
  }));
}

export async function getDocument(id: string): Promise<FinancialDocument | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("financial_documents")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // no rows
      throw error;
    }
    return rowToDocument(data as Row);
  }
  const docs = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const doc = docs.find((d) => d.id === id);
  return doc ? { ...doc, blobUrl: doc.blobUrl ?? null } : null;
}

export async function saveDocument(doc: FinancialDocument): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from("financial_documents")
      .upsert(
        {
          id:                doc.id,
          filename:          doc.filename,
          file_hash:         doc.fileHash,
          bank:              doc.bank,
          account_name:      doc.accountName,
          account_number:    doc.accountNumber,
          entity:            doc.entity,
          period_start:      doc.periodStart,
          period_end:        doc.periodEnd,
          opening_balance:   doc.openingBalance,
          closing_balance:   doc.closingBalance,
          uploaded_at:       doc.uploadedAt,
          uploaded_by:       doc.uploadedBy,
          status:            doc.status,
          error_message:     doc.errorMessage,
          transaction_count: doc.transactionCount,
          parser_confidence: doc.parserConfidence,
          extraction_notes:  doc.extractionNotes,
          blob_url:          doc.blobUrl,
        },
        { onConflict: "id" }
      )
      .select()
      .single();
    if (error) throw error;
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
  if (supabase) {
    const p = patch ?? {};
    const updatePayload: Record<string, unknown> = { status };
    if (p.errorMessage     !== undefined) updatePayload.error_message     = p.errorMessage;
    if (p.periodStart      !== undefined) updatePayload.period_start      = p.periodStart;
    if (p.periodEnd        !== undefined) updatePayload.period_end        = p.periodEnd;
    if (p.openingBalance   !== undefined) updatePayload.opening_balance   = p.openingBalance;
    if (p.closingBalance   !== undefined) updatePayload.closing_balance   = p.closingBalance;
    if (p.accountNumber    !== undefined) updatePayload.account_number    = p.accountNumber;
    if (p.parserConfidence !== undefined) updatePayload.parser_confidence = p.parserConfidence;
    if (p.extractionNotes  !== undefined) updatePayload.extraction_notes  = p.extractionNotes;
    if (p.transactionCount !== undefined) updatePayload.transaction_count = p.transactionCount;
    if (p.blobUrl          !== undefined) updatePayload.blob_url          = p.blobUrl;
    const { error } = await supabase
      .from("financial_documents")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return;
  }
  const all = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status, ...(patch ?? {}) };
  writeJSON(DOCS_FILE, all);
}

export async function findDuplicateDocument(fileHash: string): Promise<FinancialDocument | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("financial_documents")
      .select("*")
      .eq("file_hash", fileHash)
      .limit(1)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // no rows
      throw error;
    }
    return rowToDocument(data as Row);
  }
  const docs = readJSON<FinancialDocument[]>(DOCS_FILE, []);
  const doc = docs.find((d) => d.fileHash === fileHash);
  return doc ? { ...doc, blobUrl: doc.blobUrl ?? null } : null;
}

// ─── Transactions CRUD ────────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<BankTransaction[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    const rows = (data as Row[]).map(rowToTransaction);
    // Seed fallback: fresh Supabase deployment — return local JSON seed until real data is ingested
    if (rows.length === 0) {
      return readJSON<BankTransaction[]>(TXN_FILE, []).map((t) => ({
        ...t,
        reconciliationStatus: t.reconciliationStatus ?? "pendente",
      }));
    }
    return rows;
  }
  // Backfill reconciliationStatus for legacy records that don't have it yet.
  return readJSON<BankTransaction[]>(TXN_FILE, []).map((t) => ({
    ...t,
    reconciliationStatus: t.reconciliationStatus ?? (
      t.classificationConfidence === "probable" ? "em_revisao" : "pendente"
    ),
  }));
}

export async function getTransactionsByDocument(documentId: string): Promise<BankTransaction[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("document_id", documentId)
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(rowToTransaction);
  }
  return (await getAllTransactions()).filter((t) => t.documentId === documentId);
}

export async function getTransactionsByEntity(entity: EntityLayer): Promise<BankTransaction[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("entity", entity)
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(rowToTransaction);
  }
  return (await getAllTransactions()).filter((t) => t.entity === entity);
}

export async function saveTransactions(transactions: BankTransaction[]): Promise<void> {
  if (supabase) {
    if (transactions.length === 0) return;
    const docIds = Array.from(new Set(transactions.map((t) => t.documentId)));
    for (const docId of docIds) {
      const { error: delError } = await supabase
        .from("bank_transactions")
        .delete()
        .eq("document_id", docId);
      if (delError) throw delError;
    }
    for (const t of transactions) {
      const { error } = await supabase
        .from("bank_transactions")
        .upsert(
          {
            id:                          t.id,
            document_id:                 t.documentId,
            bank:                        t.bank,
            account_name:                t.accountName,
            entity:                      t.entity,
            transaction_date:            t.transactionDate,
            description_original:        t.descriptionOriginal,
            amount:                      t.amount,
            direction:                   t.direction,
            running_balance:             t.runningBalance,
            counterparty_name:           t.counterpartyName,
            managerial_category:         t.managerialCategory,
            classification_confidence:   t.classificationConfidence,
            classification_note:         t.classificationNote,
            is_intercompany:             t.isIntercompany,
            intercompany_match_id:       t.intercompanyMatchId,
            excluded_from_consolidated:  t.excludedFromConsolidated,
            reconciliation_status:       t.reconciliationStatus,
            extracted_at:                t.extractedAt,
            classified_at:               t.classifiedAt,
          },
          { onConflict: "id" }
        )
        .select()
        .single();
      if (error) throw error;
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
  if (supabase) {
    const p = patch;
    const updatePayload: Record<string, unknown> = {};
    if (p.managerialCategory       !== undefined) updatePayload.managerial_category        = p.managerialCategory;
    if (p.classificationConfidence !== undefined) updatePayload.classification_confidence  = p.classificationConfidence;
    if (p.classificationNote       !== undefined) updatePayload.classification_note        = p.classificationNote;
    if (p.counterpartyName         !== undefined) updatePayload.counterparty_name          = p.counterpartyName;
    if (p.isIntercompany           !== undefined) updatePayload.is_intercompany            = p.isIntercompany;
    if (p.intercompanyMatchId      !== undefined) updatePayload.intercompany_match_id      = p.intercompanyMatchId;
    if (p.excludedFromConsolidated !== undefined) updatePayload.excluded_from_consolidated = p.excludedFromConsolidated;
    if (p.reconciliationStatus     !== undefined) updatePayload.reconciliation_status      = p.reconciliationStatus;
    if (p.classifiedAt             !== undefined) updatePayload.classified_at              = p.classifiedAt;
    const { error } = await supabase
      .from("bank_transactions")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
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
