// ─── AP DB — Contas a Pagar (Accounts Payable) ────────────────────────────────
// Server-only module. Uses the same Supabase priority chain as financial-db.ts.
// DO NOT import in client components — use @/lib/ap-shared for types.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabase, erpAdmin, erpAnon, anonClient } from "@/lib/supabase";
import type { EntityLayer } from "@/lib/financial-db";
import type {
  APStatus, APEntry, APSummary,
  CreateAPEntryInput, UpdateAPEntryInput,
} from "@/lib/ap-shared";
import { effectiveStatus } from "@/lib/ap-shared";

export type { APStatus, APEntry, APSummary, CreateAPEntryInput, UpdateAPEntryInput } from "@/lib/ap-shared";
export { effectiveStatus } from "@/lib/ap-shared";

const db = supabase ?? erpAdmin ?? erpAnon ?? anonClient;

const AP_FILE = path.join(process.cwd(), "public", "data", "financial", "ap-entries.json");

function readJsonFallback(): APEntry[] {
  try {
    if (!fs.existsSync(AP_FILE)) return [];
    const raw = fs.readFileSync(AP_FILE, "utf-8").trim();
    return raw ? (JSON.parse(raw) as APEntry[]) : [];
  } catch {
    return [];
  }
}

function writeJsonFallback(entries: APEntry[]): void {
  const dir = path.dirname(AP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AP_FILE, JSON.stringify(entries, null, 2));
}

function fromRow(row: Record<string, unknown>): APEntry {
  return {
    id:                 row.id as string,
    accountCode:        row.account_code as string,
    accountDescription: row.account_description as string,
    managerialCategory: row.managerial_category as APEntry["managerialCategory"],
    supplierName:       row.supplier_name as string,
    supplierDocument:   (row.supplier_document as string) ?? null,
    entity:             row.entity as EntityLayer,
    amount:             Number(row.amount),
    currency:           (row.currency as string) ?? "BRL",
    issueDate:          row.issue_date as string,
    dueDate:            row.due_date as string,
    paymentDate:        (row.payment_date as string) ?? null,
    status:             row.status as APStatus,
    invoiceNumber:      (row.invoice_number as string) ?? null,
    description:        (row.description as string) ?? null,
    notes:              (row.notes as string) ?? null,
    bankTransactionId:  (row.bank_transaction_id as string) ?? null,
    createdAt:          row.created_at as string,
    createdBy:          (row.created_by as string) ?? null,
    updatedAt:          (row.updated_at as string) ?? null,
    approvedBy:         (row.approved_by as string) ?? null,
    approvedAt:         (row.approved_at as string) ?? null,
  };
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export async function getAllAPEntries(): Promise<APEntry[]> {
  if (!db) return readJsonFallback();
  try {
    const { data, error } = await db
      .from("ap_entries")
      .select("*")
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => fromRow(r as Record<string, unknown>));
  } catch {
    return readJsonFallback();
  }
}

export async function getAPEntriesByEntity(entity: EntityLayer | "all"): Promise<APEntry[]> {
  const all = await getAllAPEntries();
  if (entity === "all") return all;
  return all.filter(e => e.entity === entity);
}

export async function getAPEntriesByStatus(status: APStatus): Promise<APEntry[]> {
  const all = await getAllAPEntries();
  return all.filter(e => e.status === status);
}

export async function createAPEntry(input: CreateAPEntryInput): Promise<APEntry> {
  const now = new Date().toISOString();
  const entry: APEntry = {
    id:                 crypto.randomUUID(),
    accountCode:        input.accountCode,
    accountDescription: input.accountDescription,
    managerialCategory: input.managerialCategory,
    supplierName:       input.supplierName,
    supplierDocument:   input.supplierDocument ?? null,
    entity:             input.entity,
    amount:             input.amount,
    currency:           input.currency ?? "BRL",
    issueDate:          input.issueDate,
    dueDate:            input.dueDate,
    paymentDate:        null,
    status:             "pendente",
    invoiceNumber:      input.invoiceNumber ?? null,
    description:        input.description ?? null,
    notes:              input.notes ?? null,
    bankTransactionId:  null,
    createdAt:          now,
    createdBy:          input.createdBy ?? null,
    updatedAt:          null,
    approvedBy:         null,
    approvedAt:         null,
  };

  if (!db) {
    const all = readJsonFallback();
    all.push(entry);
    writeJsonFallback(all);
    return entry;
  }

  const row = {
    id:                  entry.id,
    account_code:        entry.accountCode,
    account_description: entry.accountDescription,
    managerial_category: entry.managerialCategory,
    supplier_name:       entry.supplierName,
    supplier_document:   entry.supplierDocument,
    entity:              entry.entity,
    amount:              entry.amount,
    currency:            entry.currency,
    issue_date:          entry.issueDate,
    due_date:            entry.dueDate,
    status:              entry.status,
    invoice_number:      entry.invoiceNumber,
    description:         entry.description,
    notes:               entry.notes,
    created_at:          entry.createdAt,
    created_by:          entry.createdBy,
  };

  const { error } = await db.from("ap_entries").insert(row);
  if (error) throw new Error(`AP insert failed: ${error.message}`);
  return entry;
}

export async function updateAPEntry(id: string, input: UpdateAPEntryInput): Promise<void> {
  const now = new Date().toISOString();

  if (!db) {
    const all = readJsonFallback();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) throw new Error("AP entry not found");
    all[idx] = { ...all[idx], ...input, updatedAt: now };
    writeJsonFallback(all);
    return;
  }

  const patch: Record<string, unknown> = { updated_at: now };
  if (input.status            !== undefined) patch.status               = input.status;
  if (input.paymentDate       !== undefined) patch.payment_date         = input.paymentDate;
  if (input.bankTransactionId !== undefined) patch.bank_transaction_id  = input.bankTransactionId;
  if (input.approvedBy        !== undefined) patch.approved_by          = input.approvedBy;
  if (input.approvedAt        !== undefined) patch.approved_at          = input.approvedAt;
  if (input.notes             !== undefined) patch.notes                = input.notes;
  if (input.amount            !== undefined) patch.amount               = input.amount;
  if (input.dueDate           !== undefined) patch.due_date             = input.dueDate;
  if (input.invoiceNumber     !== undefined) patch.invoice_number       = input.invoiceNumber;
  if (input.description       !== undefined) patch.description          = input.description;

  const { error } = await db.from("ap_entries").update(patch).eq("id", id);
  if (error) throw new Error(`AP update failed: ${error.message}`);
}

export async function deleteAPEntry(id: string): Promise<void> {
  if (!db) {
    const all = readJsonFallback().filter(e => e.id !== id);
    writeJsonFallback(all);
    return;
  }
  const { error } = await db.from("ap_entries").delete().eq("id", id);
  if (error) throw new Error(`AP delete failed: ${error.message}`);
}

// ── Aggregations (dashboard + CI/CD integration with DRE / DFC / Balanço) ──────

export async function getAPSummary(entity: EntityLayer | "all" = "all"): Promise<APSummary> {
  const entries = await getAPEntriesByEntity(entity);
  const today = new Date();

  const summary: APSummary = {
    totalPendente: 0, totalAprovado: 0, totalVencido: 0, totalPago: 0,
    countPendente: 0, countAprovado: 0, countVencido: 0, countPago: 0,
    aging: { days0to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 },
    byCategory: [],
  };

  const catMap = new Map<APEntry["managerialCategory"], { total: number; count: number }>();

  for (const e of entries) {
    const eff = effectiveStatus(e, today);
    if (eff === "pendente")  { summary.totalPendente += e.amount; summary.countPendente++; }
    if (eff === "aprovado")  { summary.totalAprovado += e.amount; summary.countAprovado++; }
    if (eff === "vencido")   { summary.totalVencido  += e.amount; summary.countVencido++;  }
    if (eff === "pago")      { summary.totalPago     += e.amount; summary.countPago++;     }

    if (eff !== "pago" && eff !== "cancelado") {
      const dueMs = new Date(e.dueDate).getTime() - today.getTime();
      const days  = Math.ceil(dueMs / 86_400_000);
      if (days >= 0 && days <= 30)  summary.aging.days0to30  += e.amount;
      else if (days <= 60)          summary.aging.days31to60 += e.amount;
      else if (days <= 90)          summary.aging.days61to90 += e.amount;
      else                          summary.aging.days90plus += e.amount;

      const cat = catMap.get(e.managerialCategory) ?? { total: 0, count: 0 };
      cat.total += e.amount;
      cat.count++;
      catMap.set(e.managerialCategory, cat);
    }
  }

  summary.byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  return summary;
}

// Returns open AP entries for Balance Sheet (Passivo Circulante)
export async function getOpenAPForBalanco(entity: EntityLayer | "all" = "all"): Promise<APEntry[]> {
  const entries = await getAPEntriesByEntity(entity);
  const today = new Date();
  return entries.filter(e => {
    const eff = effectiveStatus(e, today);
    return eff === "pendente" || eff === "aprovado" || eff === "vencido";
  });
}

// Returns paid APs for DFC (cash outflows)
export async function getPaidAPForDFC(entity: EntityLayer | "all" = "all"): Promise<APEntry[]> {
  const entries = await getAPEntriesByEntity(entity);
  return entries.filter(e => e.status === "pago" && e.paymentDate);
}

// Returns AP accruals for DRE by managerialCategory (regime competência)
export async function getAPAccrualsForDRE(
  entity: EntityLayer | "all" = "all",
  period?: { start: string; end: string }
): Promise<Array<{ category: APEntry["managerialCategory"]; total: number }>> {
  const entries = await getAPEntriesByEntity(entity);
  const catMap = new Map<APEntry["managerialCategory"], number>();

  for (const e of entries) {
    if (e.status === "cancelado") continue;
    if (period && (e.issueDate < period.start || e.issueDate > period.end)) continue;
    catMap.set(e.managerialCategory, (catMap.get(e.managerialCategory) ?? 0) + e.amount);
  }

  return Array.from(catMap.entries()).map(([category, total]) => ({ category, total }));
}
