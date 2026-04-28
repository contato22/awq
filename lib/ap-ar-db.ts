// ─── AP/AR Data Access Layer ─────────────────────────────────────────────────
//
// Manages Accounts Payable and Accounts Receivable.
// Includes Brazilian fiscal retention auto-calculation (IRRF, INSS, ISS, PIS, COFINS).
//
// Storage: public/data/epm-ap.json + epm-ar.json (dev) or Neon PostgreSQL (prod).
// DO NOT import in client components.

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BuCode   = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";
export type APStatus = "PENDING" | "SCHEDULED" | "PAID" | "OVERDUE" | "CANCELLED";
export type ARStatus = "PENDING" | "PARTIAL" | "RECEIVED" | "OVERDUE" | "CANCELLED";

export type SupplierType =
  | "service_professional"  // IRRF 1.5% + ISS 5% + PIS 0.65% + COFINS 3%
  | "service_cleaning"      // IRRF 1% + INSS 11% + ISS 5% + PIS 0.65% + COFINS 3%
  | "service_construction"  // IRRF 1.5% + INSS 11% + ISS 5% + PIS 0.65% + COFINS 3%
  | "goods"                 // no retentions
  | "rent"                  // IRRF 1.5%
  | "other";                // no retentions

export interface FiscalRates {
  irrf_rate:   number;
  inss_rate:   number;
  iss_rate:    number;
  pis_rate:    number;
  cofins_rate: number;
}

export interface APItem {
  id:               string;
  bu_code:          BuCode;
  supplier_name:    string;
  supplier_doc?:    string;
  supplier_type:    SupplierType;
  description:      string;
  category:         string;
  reference_doc?:   string;
  issue_date:       string;  // YYYY-MM-DD
  due_date:         string;  // YYYY-MM-DD
  gross_amount:     number;
  irrf_rate:        number;
  irrf_amount:      number;
  inss_rate:        number;
  inss_amount:      number;
  iss_rate:         number;
  iss_amount:       number;
  pis_rate:         number;
  pis_amount:       number;
  cofins_rate:      number;
  cofins_amount:    number;
  total_retentions: number;
  net_amount:       number;  // gross - retentions
  status:           APStatus;
  paid_date?:       string;
  paid_amount?:     number;
  payment_ref?:     string;
  source_system:    string;
  created_at:       string;
  created_by?:      string;
}

export interface NewAPInput {
  bu_code:       BuCode;
  supplier_name: string;
  supplier_doc?: string;
  supplier_type: SupplierType;
  description:   string;
  category:      string;
  reference_doc?: string;
  issue_date:    string;
  due_date:      string;
  gross_amount:  number;
  // Optional rate overrides (0–1 fractions)
  irrf_rate?:   number;
  inss_rate?:   number;
  iss_rate?:    number;
  pis_rate?:    number;
  cofins_rate?: number;
  source_system?: string;
  created_by?:   string;
}

export interface ARItem {
  id:             string;
  bu_code:        BuCode;
  customer_name:  string;
  customer_doc?:  string;
  description:    string;
  category:       string;
  reference_doc?: string;
  issue_date:     string;
  due_date:       string;
  gross_amount:   number;
  iss_rate:       number;
  iss_amount:     number;
  net_amount:     number;  // gross - ISS
  status:         ARStatus;
  received_date?: string;
  received_amount?: number;
  receipt_ref?:   string;
  source_system:  string;
  created_at:     string;
  created_by?:    string;
}

export interface NewARInput {
  bu_code:        BuCode;
  customer_name:  string;
  customer_doc?:  string;
  description:    string;
  category:       string;
  reference_doc?: string;
  issue_date:     string;
  due_date:       string;
  gross_amount:   number;
  iss_rate?:      number;  // 0–1, defaults to 0.05 for service categories
  source_system?: string;
  created_by?:    string;
}

export interface APARKPIs {
  // AR
  totalAROutstanding: number;
  totalAROverdue:     number;
  totalARReceived:    number;
  dso:                number | null;  // days sales outstanding
  // AP
  totalAPOutstanding: number;
  totalAPOverdue:     number;
  totalAPPaid:        number;
  dpo:                number | null;  // days payable outstanding
  // CCC
  ccc:                number | null;  // cash conversion cycle = DSO - DPO
  // Aging buckets (AP)
  apAging: Record<AgingBucket, number>;
  // Aging buckets (AR)
  arAging: Record<AgingBucket, number>;
}

export type AgingBucket = "CURRENT" | "1-30d" | "31-60d" | "61-90d" | "+90d";

// ─── Fiscal defaults ──────────────────────────────────────────────────────────

const FISCAL_DEFAULTS: Record<SupplierType, FiscalRates> = {
  service_professional: { irrf_rate: 0.015, inss_rate: 0,    iss_rate: 0.05, pis_rate: 0.0065, cofins_rate: 0.03 },
  service_cleaning:     { irrf_rate: 0.01,  inss_rate: 0.11, iss_rate: 0.05, pis_rate: 0.0065, cofins_rate: 0.03 },
  service_construction: { irrf_rate: 0.015, inss_rate: 0.11, iss_rate: 0.05, pis_rate: 0.0065, cofins_rate: 0.03 },
  goods:                { irrf_rate: 0,     inss_rate: 0,    iss_rate: 0,    pis_rate: 0,      cofins_rate: 0    },
  rent:                 { irrf_rate: 0.015, inss_rate: 0,    iss_rate: 0,    pis_rate: 0,      cofins_rate: 0    },
  other:                { irrf_rate: 0,     inss_rate: 0,    iss_rate: 0,    pis_rate: 0,      cofins_rate: 0    },
};

export function getDefaultFiscalRates(type: SupplierType): FiscalRates {
  return { ...FISCAL_DEFAULTS[type] };
}

export function calcAPFiscal(
  gross: number,
  type: SupplierType,
  overrides?: Partial<FiscalRates>
): { rates: FiscalRates; amounts: Record<string, number>; total_retentions: number; net_amount: number } {
  const rates: FiscalRates = { ...FISCAL_DEFAULTS[type], ...overrides };

  const irrf   = round2(gross * rates.irrf_rate);
  const inss   = round2(gross * rates.inss_rate);
  const iss    = round2(gross * rates.iss_rate);
  const pis    = round2(gross * rates.pis_rate);
  const cofins = round2(gross * rates.cofins_rate);

  const total_retentions = round2(irrf + inss + iss + pis + cofins);
  const net_amount       = round2(gross - total_retentions);

  return {
    rates,
    amounts: { irrf, inss, iss, pis, cofins },
    total_retentions,
    net_amount,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── JSON file persistence (dev fallback) ────────────────────────────────────

const AP_FILE = path.join(process.cwd(), "public", "data", "epm-ap.json");
const AR_FILE = path.join(process.cwd(), "public", "data", "epm-ar.json");

function ensureDir(file: string) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSONFile<T>(file: string, empty: T): T {
  ensureDir(file);
  if (!fs.existsSync(file)) return empty;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) as T; }
  catch { return empty; }
}

function writeJSONFile<T>(file: string, data: T) {
  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

interface APStore { items: APItem[]; last_updated: string }
interface ARStore { items: ARItem[]; last_updated: string }

function readAPStore(): APStore {
  return readJSONFile(AP_FILE, { items: [], last_updated: new Date().toISOString() });
}
function writeAPStore(store: APStore) {
  store.last_updated = new Date().toISOString();
  writeJSONFile(AP_FILE, store);
}
function readARStore(): ARStore {
  return readJSONFile(AR_FILE, { items: [], last_updated: new Date().toISOString() });
}
function writeARStore(store: ARStore) {
  store.last_updated = new Date().toISOString();
  writeJSONFile(AR_FILE, store);
}

// ─── DB schema init ───────────────────────────────────────────────────────────

export async function initAPARDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_ap (
      id                TEXT PRIMARY KEY,
      bu_code           TEXT NOT NULL,
      supplier_name     TEXT NOT NULL,
      supplier_doc      TEXT,
      supplier_type     TEXT NOT NULL DEFAULT 'other',
      description       TEXT NOT NULL,
      category          TEXT NOT NULL DEFAULT 'Fornecedor',
      reference_doc     TEXT,
      issue_date        TEXT NOT NULL,
      due_date          TEXT NOT NULL,
      gross_amount      NUMERIC NOT NULL,
      irrf_rate         NUMERIC NOT NULL DEFAULT 0,
      irrf_amount       NUMERIC NOT NULL DEFAULT 0,
      inss_rate         NUMERIC NOT NULL DEFAULT 0,
      inss_amount       NUMERIC NOT NULL DEFAULT 0,
      iss_rate          NUMERIC NOT NULL DEFAULT 0,
      iss_amount        NUMERIC NOT NULL DEFAULT 0,
      pis_rate          NUMERIC NOT NULL DEFAULT 0,
      pis_amount        NUMERIC NOT NULL DEFAULT 0,
      cofins_rate       NUMERIC NOT NULL DEFAULT 0,
      cofins_amount     NUMERIC NOT NULL DEFAULT 0,
      total_retentions  NUMERIC NOT NULL DEFAULT 0,
      net_amount        NUMERIC NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING',
      paid_date         TEXT,
      paid_amount       NUMERIC,
      payment_ref       TEXT,
      source_system     TEXT NOT NULL DEFAULT 'manual',
      created_at        TEXT NOT NULL,
      created_by        TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ap_bu_code  ON epm_ap(bu_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ap_status   ON epm_ap(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ap_due_date ON epm_ap(due_date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_ar (
      id                TEXT PRIMARY KEY,
      bu_code           TEXT NOT NULL,
      customer_name     TEXT NOT NULL,
      customer_doc      TEXT,
      description       TEXT NOT NULL,
      category          TEXT NOT NULL DEFAULT 'Serviço',
      reference_doc     TEXT,
      issue_date        TEXT NOT NULL,
      due_date          TEXT NOT NULL,
      gross_amount      NUMERIC NOT NULL,
      iss_rate          NUMERIC NOT NULL DEFAULT 0,
      iss_amount        NUMERIC NOT NULL DEFAULT 0,
      net_amount        NUMERIC NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING',
      received_date     TEXT,
      received_amount   NUMERIC,
      receipt_ref       TEXT,
      source_system     TEXT NOT NULL DEFAULT 'manual',
      created_at        TEXT NOT NULL,
      created_by        TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_bu_code  ON epm_ar(bu_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_status   ON epm_ar(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_due_date ON epm_ar(due_date)`;
}

// ─── Aging helper ─────────────────────────────────────────────────────────────

export function getAgingBucket(due_date: string): AgingBucket {
  const today = new Date();
  const due   = new Date(due_date);
  const diff  = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (diff <= 0)  return "CURRENT";
  if (diff <= 30) return "1-30d";
  if (diff <= 60) return "31-60d";
  if (diff <= 90) return "61-90d";
  return "+90d";
}

// ─── AP API ───────────────────────────────────────────────────────────────────

function rowToAP(row: Record<string, unknown>): APItem {
  return {
    id:               String(row.id),
    bu_code:          String(row.bu_code) as BuCode,
    supplier_name:    String(row.supplier_name),
    supplier_doc:     row.supplier_doc ? String(row.supplier_doc) : undefined,
    supplier_type:    String(row.supplier_type) as SupplierType,
    description:      String(row.description),
    category:         String(row.category),
    reference_doc:    row.reference_doc ? String(row.reference_doc) : undefined,
    issue_date:       String(row.issue_date),
    due_date:         String(row.due_date),
    gross_amount:     Number(row.gross_amount),
    irrf_rate:        Number(row.irrf_rate),
    irrf_amount:      Number(row.irrf_amount),
    inss_rate:        Number(row.inss_rate),
    inss_amount:      Number(row.inss_amount),
    iss_rate:         Number(row.iss_rate),
    iss_amount:       Number(row.iss_amount),
    pis_rate:         Number(row.pis_rate),
    pis_amount:       Number(row.pis_amount),
    cofins_rate:      Number(row.cofins_rate),
    cofins_amount:    Number(row.cofins_amount),
    total_retentions: Number(row.total_retentions),
    net_amount:       Number(row.net_amount),
    status:           String(row.status) as APStatus,
    paid_date:        row.paid_date ? String(row.paid_date) : undefined,
    paid_amount:      row.paid_amount != null ? Number(row.paid_amount) : undefined,
    payment_ref:      row.payment_ref ? String(row.payment_ref) : undefined,
    source_system:    String(row.source_system),
    created_at:       String(row.created_at),
    created_by:       row.created_by ? String(row.created_by) : undefined,
  };
}

function rowToAR(row: Record<string, unknown>): ARItem {
  return {
    id:               String(row.id),
    bu_code:          String(row.bu_code) as BuCode,
    customer_name:    String(row.customer_name),
    customer_doc:     row.customer_doc ? String(row.customer_doc) : undefined,
    description:      String(row.description),
    category:         String(row.category),
    reference_doc:    row.reference_doc ? String(row.reference_doc) : undefined,
    issue_date:       String(row.issue_date),
    due_date:         String(row.due_date),
    gross_amount:     Number(row.gross_amount),
    iss_rate:         Number(row.iss_rate),
    iss_amount:       Number(row.iss_amount),
    net_amount:       Number(row.net_amount),
    status:           String(row.status) as ARStatus,
    received_date:    row.received_date ? String(row.received_date) : undefined,
    received_amount:  row.received_amount != null ? Number(row.received_amount) : undefined,
    receipt_ref:      row.receipt_ref ? String(row.receipt_ref) : undefined,
    source_system:    String(row.source_system),
    created_at:       String(row.created_at),
    created_by:       row.created_by ? String(row.created_by) : undefined,
  };
}

export async function getAllAP(filters?: { bu_code?: BuCode; status?: APStatus }): Promise<APItem[]> {
  if (sql) {
    let rows;
    if (filters?.bu_code && filters?.status) {
      rows = await sql`SELECT * FROM epm_ap WHERE bu_code=${filters.bu_code} AND status=${filters.status} ORDER BY due_date DESC`;
    } else if (filters?.bu_code) {
      rows = await sql`SELECT * FROM epm_ap WHERE bu_code=${filters.bu_code} ORDER BY due_date DESC`;
    } else if (filters?.status) {
      rows = await sql`SELECT * FROM epm_ap WHERE status=${filters.status} ORDER BY due_date DESC`;
    } else {
      rows = await sql`SELECT * FROM epm_ap ORDER BY due_date DESC`;
    }
    return rows.map((r) => rowToAP(r as Record<string, unknown>));
  }
  const store = readAPStore();
  let items = [...store.items].sort((a, b) => b.due_date.localeCompare(a.due_date));
  if (filters?.bu_code) items = items.filter((i) => i.bu_code === filters.bu_code);
  if (filters?.status)  items = items.filter((i) => i.status  === filters.status);
  return items;
}

export async function addAP(input: NewAPInput): Promise<APItem> {
  const fiscal = calcAPFiscal(
    input.gross_amount,
    input.supplier_type,
    {
      irrf_rate:   input.irrf_rate,
      inss_rate:   input.inss_rate,
      iss_rate:    input.iss_rate,
      pis_rate:    input.pis_rate,
      cofins_rate: input.cofins_rate,
    }
  );

  const item: APItem = {
    id:               randomUUID(),
    bu_code:          input.bu_code,
    supplier_name:    input.supplier_name,
    supplier_doc:     input.supplier_doc,
    supplier_type:    input.supplier_type,
    description:      input.description,
    category:         input.category,
    reference_doc:    input.reference_doc,
    issue_date:       input.issue_date,
    due_date:         input.due_date,
    gross_amount:     input.gross_amount,
    irrf_rate:        fiscal.rates.irrf_rate,
    irrf_amount:      fiscal.amounts.irrf,
    inss_rate:        fiscal.rates.inss_rate,
    inss_amount:      fiscal.amounts.inss,
    iss_rate:         fiscal.rates.iss_rate,
    iss_amount:       fiscal.amounts.iss,
    pis_rate:         fiscal.rates.pis_rate,
    pis_amount:       fiscal.amounts.pis,
    cofins_rate:      fiscal.rates.cofins_rate,
    cofins_amount:    fiscal.amounts.cofins,
    total_retentions: fiscal.total_retentions,
    net_amount:       fiscal.net_amount,
    status:           "PENDING",
    source_system:    input.source_system ?? "manual",
    created_at:       new Date().toISOString(),
    created_by:       input.created_by,
  };

  if (sql) {
    await sql`
      INSERT INTO epm_ap (
        id, bu_code, supplier_name, supplier_doc, supplier_type,
        description, category, reference_doc, issue_date, due_date,
        gross_amount, irrf_rate, irrf_amount, inss_rate, inss_amount,
        iss_rate, iss_amount, pis_rate, pis_amount, cofins_rate, cofins_amount,
        total_retentions, net_amount, status, source_system, created_at, created_by
      ) VALUES (
        ${item.id}, ${item.bu_code}, ${item.supplier_name}, ${item.supplier_doc ?? null},
        ${item.supplier_type}, ${item.description}, ${item.category},
        ${item.reference_doc ?? null}, ${item.issue_date}, ${item.due_date},
        ${item.gross_amount}, ${item.irrf_rate}, ${item.irrf_amount},
        ${item.inss_rate}, ${item.inss_amount}, ${item.iss_rate}, ${item.iss_amount},
        ${item.pis_rate}, ${item.pis_amount}, ${item.cofins_rate}, ${item.cofins_amount},
        ${item.total_retentions}, ${item.net_amount}, ${item.status},
        ${item.source_system}, ${item.created_at}, ${item.created_by ?? null}
      )
    `;
  } else {
    const store = readAPStore();
    store.items.push(item);
    writeAPStore(store);
  }

  return item;
}

export async function payAP(
  id: string,
  data: { paid_date: string; paid_amount: number; payment_ref?: string }
): Promise<APItem | null> {
  if (sql) {
    const rows = await sql`
      UPDATE epm_ap SET status='PAID', paid_date=${data.paid_date},
        paid_amount=${data.paid_amount}, payment_ref=${data.payment_ref ?? null}
      WHERE id=${id} RETURNING *
    `;
    return rows[0] ? rowToAP(rows[0] as Record<string, unknown>) : null;
  }
  const store = readAPStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  store.items[idx] = { ...store.items[idx], status: "PAID", ...data };
  writeAPStore(store);
  return store.items[idx];
}

export async function cancelAP(id: string): Promise<boolean> {
  if (sql) {
    await sql`UPDATE epm_ap SET status='CANCELLED' WHERE id=${id}`;
    return true;
  }
  const store = readAPStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  store.items[idx] = { ...store.items[idx], status: "CANCELLED" };
  writeAPStore(store);
  return true;
}

export async function deleteAP(id: string): Promise<boolean> {
  if (sql) {
    await sql`DELETE FROM epm_ap WHERE id=${id}`;
    return true;
  }
  const store = readAPStore();
  const before = store.items.length;
  store.items = store.items.filter((i) => i.id !== id);
  writeAPStore(store);
  return store.items.length < before;
}

// ─── AR API ───────────────────────────────────────────────────────────────────

const AR_SERVICE_CATEGORIES = ["Serviço Recorrente","Projeto","Consultoria","Produção"];

export async function getAllAR(filters?: { bu_code?: BuCode; status?: ARStatus }): Promise<ARItem[]> {
  if (sql) {
    let rows;
    if (filters?.bu_code && filters?.status) {
      rows = await sql`SELECT * FROM epm_ar WHERE bu_code=${filters.bu_code} AND status=${filters.status} ORDER BY due_date DESC`;
    } else if (filters?.bu_code) {
      rows = await sql`SELECT * FROM epm_ar WHERE bu_code=${filters.bu_code} ORDER BY due_date DESC`;
    } else if (filters?.status) {
      rows = await sql`SELECT * FROM epm_ar WHERE status=${filters.status} ORDER BY due_date DESC`;
    } else {
      rows = await sql`SELECT * FROM epm_ar ORDER BY due_date DESC`;
    }
    return rows.map((r) => rowToAR(r as Record<string, unknown>));
  }
  const store = readARStore();
  let items = [...store.items].sort((a, b) => b.due_date.localeCompare(a.due_date));
  if (filters?.bu_code) items = items.filter((i) => i.bu_code === filters.bu_code);
  if (filters?.status)  items = items.filter((i) => i.status  === filters.status);
  return items;
}

export async function addAR(input: NewARInput): Promise<ARItem> {
  const isServiceCat = AR_SERVICE_CATEGORIES.includes(input.category);
  const iss_rate     = input.iss_rate ?? (isServiceCat ? 0.05 : 0);
  const iss_amount   = round2(input.gross_amount * iss_rate);
  const net_amount   = round2(input.gross_amount - iss_amount);

  const item: ARItem = {
    id:             randomUUID(),
    bu_code:        input.bu_code,
    customer_name:  input.customer_name,
    customer_doc:   input.customer_doc,
    description:    input.description,
    category:       input.category,
    reference_doc:  input.reference_doc,
    issue_date:     input.issue_date,
    due_date:       input.due_date,
    gross_amount:   input.gross_amount,
    iss_rate,
    iss_amount,
    net_amount,
    status:         "PENDING",
    source_system:  input.source_system ?? "manual",
    created_at:     new Date().toISOString(),
    created_by:     input.created_by,
  };

  if (sql) {
    await sql`
      INSERT INTO epm_ar (
        id, bu_code, customer_name, customer_doc, description, category,
        reference_doc, issue_date, due_date, gross_amount,
        iss_rate, iss_amount, net_amount, status, source_system, created_at, created_by
      ) VALUES (
        ${item.id}, ${item.bu_code}, ${item.customer_name}, ${item.customer_doc ?? null},
        ${item.description}, ${item.category}, ${item.reference_doc ?? null},
        ${item.issue_date}, ${item.due_date}, ${item.gross_amount},
        ${item.iss_rate}, ${item.iss_amount}, ${item.net_amount},
        ${item.status}, ${item.source_system}, ${item.created_at}, ${item.created_by ?? null}
      )
    `;
  } else {
    const store = readARStore();
    store.items.push(item);
    writeARStore(store);
  }

  return item;
}

export async function receiveAR(
  id: string,
  data: { received_date: string; received_amount: number; receipt_ref?: string }
): Promise<ARItem | null> {
  if (sql) {
    const rows = await sql`
      UPDATE epm_ar SET status='RECEIVED', received_date=${data.received_date},
        received_amount=${data.received_amount}, receipt_ref=${data.receipt_ref ?? null}
      WHERE id=${id} RETURNING *
    `;
    return rows[0] ? rowToAR(rows[0] as Record<string, unknown>) : null;
  }
  const store = readARStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  store.items[idx] = { ...store.items[idx], status: "RECEIVED", ...data };
  writeARStore(store);
  return store.items[idx];
}

export async function cancelAR(id: string): Promise<boolean> {
  if (sql) {
    await sql`UPDATE epm_ar SET status='CANCELLED' WHERE id=${id}`;
    return true;
  }
  const store = readARStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  store.items[idx] = { ...store.items[idx], status: "CANCELLED" };
  writeARStore(store);
  return true;
}

export async function deleteAR(id: string): Promise<boolean> {
  if (sql) {
    await sql`DELETE FROM epm_ar WHERE id=${id}`;
    return true;
  }
  const store = readARStore();
  const before = store.items.length;
  store.items = store.items.filter((i) => i.id !== id);
  writeARStore(store);
  return store.items.length < before;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getAPARKPIs(bu_code?: BuCode): Promise<APARKPIs> {
  const [apItems, arItems] = await Promise.all([
    getAllAP(bu_code ? { bu_code } : undefined),
    getAllAR(bu_code ? { bu_code } : undefined),
  ]);

  // AR KPIs
  const arOutstanding = arItems.filter((i) => i.status !== "RECEIVED" && i.status !== "CANCELLED");
  const arOverdue     = arOutstanding.filter((i) => i.status === "OVERDUE" || new Date(i.due_date) < new Date());
  const arReceived    = arItems.filter((i) => i.status === "RECEIVED");

  const totalAROutstanding = arOutstanding.reduce((s, i) => s + i.gross_amount, 0);
  const totalAROverdue     = arOverdue.reduce((s, i) => s + i.gross_amount, 0);
  const totalARReceived    = arReceived.reduce((s, i) => s + (i.received_amount ?? i.gross_amount), 0);

  const dso = totalARReceived > 0
    ? round2((totalAROutstanding / (totalARReceived / 30)))
    : null;

  // AP KPIs
  const apOutstanding = apItems.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");
  const apOverdue     = apOutstanding.filter((i) => i.status === "OVERDUE" || new Date(i.due_date) < new Date());
  const apPaid        = apItems.filter((i) => i.status === "PAID");

  const totalAPOutstanding = apOutstanding.reduce((s, i) => s + i.net_amount, 0);
  const totalAPOverdue     = apOverdue.reduce((s, i) => s + i.net_amount, 0);
  const totalAPPaid        = apPaid.reduce((s, i) => s + (i.paid_amount ?? i.net_amount), 0);

  const dpo = totalAPPaid > 0
    ? round2((totalAPOutstanding / (totalAPPaid / 30)))
    : null;

  const ccc = dso != null && dpo != null ? round2(dso - dpo) : null;

  // Aging buckets
  const apAging: Record<AgingBucket, number> = { "CURRENT": 0, "1-30d": 0, "31-60d": 0, "61-90d": 0, "+90d": 0 };
  for (const item of apOutstanding) {
    apAging[getAgingBucket(item.due_date)] += item.net_amount;
  }

  const arAging: Record<AgingBucket, number> = { "CURRENT": 0, "1-30d": 0, "31-60d": 0, "61-90d": 0, "+90d": 0 };
  for (const item of arOutstanding) {
    arAging[getAgingBucket(item.due_date)] += item.gross_amount;
  }

  return {
    totalAROutstanding,
    totalAROverdue,
    totalARReceived,
    dso,
    totalAPOutstanding,
    totalAPOverdue,
    totalAPPaid,
    dpo,
    ccc,
    apAging,
    arAging,
  };
}
