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
  supplier_id?:     string;
  supplier_name:    string;
  supplier_doc?:    string;
  supplier_type:    SupplierType;
  description:      string;
  category:         string;
  cost_center?:     string;
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
  supplier_id?:  string;
  supplier_name: string;
  supplier_doc?: string;
  supplier_type: SupplierType;
  description:   string;
  category:      string;
  cost_center?:  string;
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
  // ── Identity ────────────────────────────────────────────────────────────────
  id:              string;
  ar_code?:        string;

  // ── Basic ───────────────────────────────────────────────────────────────────
  bu_code:         BuCode;
  customer_id?:    string;
  customer_name:   string;
  customer_doc?:   string;
  description:     string;
  category:        string;
  cost_center?:    string;
  reference_doc?:  string;
  issue_date:      string;
  due_date:        string;
  invoice_number?: string;
  invoice_series?: string;
  invoice_date?:   string;

  // ── Values ──────────────────────────────────────────────────────────────────
  gross_amount:    number;
  discount_amount: number;
  net_amount:      number;   // gross − discount − total_withholdings

  // ── Retentions suffered (withheld by customer) ──────────────────────────────
  irrf_withheld:         number;
  irrf_withheld_rate:    number;
  inss_withheld:         number;
  inss_withheld_rate:    number;
  iss_withheld:          number;
  iss_withheld_rate:     number;
  pis_withheld:          number;
  pis_withheld_rate:     number;
  cofins_withheld:       number;
  cofins_withheld_rate:  number;
  csll_withheld:         number;
  csll_withheld_rate:    number;

  // ── Taxes on billing (company remits to govt) ────────────────────────────────
  iss_rate:        number;
  iss_amount:      number;
  pis_rate:        number;
  pis_amount:      number;
  cofins_rate:     number;
  cofins_amount:   number;
  irpj_amount:     number;
  csll_amount:     number;
  tax_regime?:     string;
  simples_rate:    number;

  // ── Accounting classification ────────────────────────────────────────────────
  revenue_account_id?:  string;
  revenue_type?:        string;
  nature_of_operation?: string;

  // ── Managerial classification ────────────────────────────────────────────────
  project_id?:       string;
  service_category?: string;
  contract_type?:    string;

  // ── Revenue recognition / accrual ────────────────────────────────────────────
  revenue_recognition_date?: string;
  service_period_start?:     string;
  service_period_end?:       string;
  accrual_month?:            string;
  is_deferred_revenue:       boolean;
  deferred_periods:          number;

  // ── Payment ─────────────────────────────────────────────────────────────────
  payment_date?:        string;
  received_date?:       string;   // legacy alias for payment_date
  payment_method?:      string;
  bank_account_id?:     string;
  bank_transaction_id?: string;
  payment_reference?:   string;
  receipt_ref?:         string;   // legacy alias for payment_reference
  received_amount?:     number;

  // ── Installments ────────────────────────────────────────────────────────────
  is_installment:     boolean;
  installment_number?: number;
  total_installments?: number;
  parent_ar_id?:       string;

  // ── Recurrence ──────────────────────────────────────────────────────────────
  is_recurring:          boolean;
  recurrence_frequency?: string;
  contract_value?:       number;
  contract_start_date?:  string;
  contract_end_date?:    string;
  mrr?:                  number;
  arr?:                  number;

  // ── Status & collection ──────────────────────────────────────────────────────
  status:               ARStatus;
  collection_status?:   string;
  collection_attempts:  number;
  last_collection_date?: string;

  // ── Late fees & interest ─────────────────────────────────────────────────────
  late_fee_rate:   number;
  late_fee_amount: number;
  interest_rate:   number;
  interest_amount: number;

  // ── Document URLs ────────────────────────────────────────────────────────────
  invoice_xml_url?:     string;
  invoice_pdf_url?:     string;
  danfe_url?:           string;
  payment_receipt_url?: string;
  contract_url?:        string;
  boleto_url?:          string;
  boleto_barcode?:      string;

  // ── CRM integration ─────────────────────────────────────────────────────────
  opportunity_id?:   string;
  sales_rep_id?:     string;
  commission_rate:   number;
  commission_amount: number;
  commission_paid:   boolean;

  // ── Audit ───────────────────────────────────────────────────────────────────
  notes?:         string;
  customer_notes?: string;
  tags:           string[];
  source_system:  string;
  created_at:     string;
  updated_at?:    string;
  created_by?:    string;
  updated_by?:    string;
}

export interface NewARInput {
  // ── Required ─────────────────────────────────────────────────────────────────
  bu_code:       BuCode;
  customer_name: string;
  description:   string;
  due_date:      string;
  gross_amount:  number;

  // ── Basic ────────────────────────────────────────────────────────────────────
  customer_id?:    string;
  customer_doc?:   string;
  category?:       string;
  cost_center?:    string;
  reference_doc?:  string;
  issue_date?:     string;
  ar_code?:        string;
  invoice_number?: string;
  invoice_series?: string;
  invoice_date?:   string;

  // ── Values ───────────────────────────────────────────────────────────────────
  discount_amount?: number;

  // ── Withholding rates (0–1 fractions) ────────────────────────────────────────
  irrf_withheld_rate?:   number;
  inss_withheld_rate?:   number;
  iss_withheld_rate?:    number;
  pis_withheld_rate?:    number;
  cofins_withheld_rate?: number;
  csll_withheld_rate?:   number;

  // ── Billing tax rates (0–1 fractions; service defaults applied if omitted) ────
  iss_rate?:     number;
  pis_rate?:     number;
  cofins_rate?:  number;
  irpj_amount?:  number;
  csll_amount?:  number;
  tax_regime?:   string;
  simples_rate?: number;

  // ── Accounting ───────────────────────────────────────────────────────────────
  revenue_account_id?:  string;
  revenue_type?:        string;
  nature_of_operation?: string;

  // ── Managerial ───────────────────────────────────────────────────────────────
  project_id?:       string;
  service_category?: string;
  contract_type?:    string;

  // ── Accrual ──────────────────────────────────────────────────────────────────
  revenue_recognition_date?: string;
  service_period_start?:     string;
  service_period_end?:       string;
  accrual_month?:            string;
  is_deferred_revenue?:      boolean;
  deferred_periods?:         number;

  // ── Payment ──────────────────────────────────────────────────────────────────
  payment_method?:      string;
  bank_account_id?:     string;
  payment_reference?:   string;

  // ── Installments ─────────────────────────────────────────────────────────────
  is_installment?:     boolean;
  installment_number?: number;
  total_installments?: number;
  parent_ar_id?:       string;

  // ── Recurrence ───────────────────────────────────────────────────────────────
  is_recurring?:          boolean;
  recurrence_frequency?:  string;
  contract_value?:        number;
  contract_start_date?:   string;
  contract_end_date?:     string;
  mrr?:                   number;
  arr?:                   number;

  // ── Late fees ────────────────────────────────────────────────────────────────
  late_fee_rate?:  number;
  interest_rate?:  number;

  // ── Documents ────────────────────────────────────────────────────────────────
  invoice_xml_url?:     string;
  invoice_pdf_url?:     string;
  danfe_url?:           string;
  payment_receipt_url?: string;
  contract_url?:        string;
  boleto_url?:          string;
  boleto_barcode?:      string;

  // ── CRM ──────────────────────────────────────────────────────────────────────
  opportunity_id?:   string;
  sales_rep_id?:     string;
  commission_rate?:  number;
  commission_amount?: number;

  // ── Notes ────────────────────────────────────────────────────────────────────
  notes?:         string;
  customer_notes?: string;
  tags?:          string[];

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
      supplier_id       TEXT,
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

  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ap_bu_code    ON epm_ap(bu_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ap_status     ON epm_ap(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ap_due_date   ON epm_ap(due_date)`;
  await sql`ALTER TABLE epm_ap ADD COLUMN IF NOT EXISTS supplier_id TEXT`;
  await sql`ALTER TABLE epm_ap ADD COLUMN IF NOT EXISTS cost_center TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_ar (
      id                     TEXT    PRIMARY KEY,
      ar_code                TEXT    UNIQUE,
      bu_code                TEXT    NOT NULL,
      customer_id            TEXT,
      customer_name          TEXT    NOT NULL,
      customer_doc           TEXT,
      description            TEXT    NOT NULL,
      category               TEXT    NOT NULL DEFAULT 'Serviço',
      cost_center            TEXT,
      reference_doc          TEXT,
      issue_date             TEXT    NOT NULL,
      due_date               TEXT    NOT NULL,
      invoice_number         TEXT,
      invoice_series         TEXT,
      invoice_date           TEXT,
      gross_amount           NUMERIC NOT NULL,
      discount_amount        NUMERIC NOT NULL DEFAULT 0,
      net_amount             NUMERIC NOT NULL DEFAULT 0,
      irrf_withheld          NUMERIC NOT NULL DEFAULT 0,
      irrf_withheld_rate     NUMERIC NOT NULL DEFAULT 0,
      inss_withheld          NUMERIC NOT NULL DEFAULT 0,
      inss_withheld_rate     NUMERIC NOT NULL DEFAULT 0,
      iss_withheld           NUMERIC NOT NULL DEFAULT 0,
      iss_withheld_rate      NUMERIC NOT NULL DEFAULT 0,
      pis_withheld           NUMERIC NOT NULL DEFAULT 0,
      pis_withheld_rate      NUMERIC NOT NULL DEFAULT 0,
      cofins_withheld        NUMERIC NOT NULL DEFAULT 0,
      cofins_withheld_rate   NUMERIC NOT NULL DEFAULT 0,
      csll_withheld          NUMERIC NOT NULL DEFAULT 0,
      csll_withheld_rate     NUMERIC NOT NULL DEFAULT 0,
      iss_rate               NUMERIC NOT NULL DEFAULT 0,
      iss_amount             NUMERIC NOT NULL DEFAULT 0,
      pis_rate               NUMERIC NOT NULL DEFAULT 0,
      pis_amount             NUMERIC NOT NULL DEFAULT 0,
      cofins_rate            NUMERIC NOT NULL DEFAULT 0,
      cofins_amount          NUMERIC NOT NULL DEFAULT 0,
      irpj_amount            NUMERIC NOT NULL DEFAULT 0,
      csll_amount            NUMERIC NOT NULL DEFAULT 0,
      tax_regime             TEXT,
      simples_rate           NUMERIC NOT NULL DEFAULT 0,
      revenue_account_id     TEXT,
      revenue_type           TEXT,
      nature_of_operation    TEXT,
      project_id             TEXT,
      service_category       TEXT,
      contract_type          TEXT,
      revenue_recognition_date TEXT,
      service_period_start   TEXT,
      service_period_end     TEXT,
      accrual_month          TEXT,
      is_deferred_revenue    BOOLEAN NOT NULL DEFAULT false,
      deferred_periods       INTEGER NOT NULL DEFAULT 0,
      payment_date           TEXT,
      received_date          TEXT,
      payment_method         TEXT,
      bank_account_id        TEXT,
      bank_transaction_id    TEXT,
      payment_reference      TEXT,
      receipt_ref            TEXT,
      received_amount        NUMERIC,
      is_installment         BOOLEAN NOT NULL DEFAULT false,
      installment_number     INTEGER,
      total_installments     INTEGER,
      parent_ar_id           TEXT,
      is_recurring           BOOLEAN NOT NULL DEFAULT false,
      recurrence_frequency   TEXT,
      contract_value         NUMERIC,
      contract_start_date    TEXT,
      contract_end_date      TEXT,
      mrr                    NUMERIC,
      arr                    NUMERIC,
      status                 TEXT    NOT NULL DEFAULT 'PENDING',
      collection_status      TEXT    NOT NULL DEFAULT 'not_due',
      collection_attempts    INTEGER NOT NULL DEFAULT 0,
      last_collection_date   TEXT,
      late_fee_rate          NUMERIC NOT NULL DEFAULT 0,
      late_fee_amount        NUMERIC NOT NULL DEFAULT 0,
      interest_rate          NUMERIC NOT NULL DEFAULT 0,
      interest_amount        NUMERIC NOT NULL DEFAULT 0,
      invoice_xml_url        TEXT,
      invoice_pdf_url        TEXT,
      danfe_url              TEXT,
      payment_receipt_url    TEXT,
      contract_url           TEXT,
      boleto_url             TEXT,
      boleto_barcode         TEXT,
      opportunity_id         TEXT,
      sales_rep_id           TEXT,
      commission_rate        NUMERIC NOT NULL DEFAULT 0,
      commission_amount      NUMERIC NOT NULL DEFAULT 0,
      commission_paid        BOOLEAN NOT NULL DEFAULT false,
      notes                  TEXT,
      customer_notes         TEXT,
      tags                   TEXT    NOT NULL DEFAULT '[]',
      source_system          TEXT    NOT NULL DEFAULT 'manual',
      created_at             TEXT    NOT NULL,
      updated_at             TEXT,
      created_by             TEXT,
      updated_by             TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_bu_code    ON epm_ar(bu_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_status     ON epm_ar(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_due_date   ON epm_ar(due_date)`;

  // Schema evolution — add columns to existing deployments
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS ar_code                TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS customer_id            TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS cost_center            TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS invoice_number         TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS invoice_series         TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS invoice_date           TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS discount_amount        NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS irrf_withheld          NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS irrf_withheld_rate     NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS inss_withheld          NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS inss_withheld_rate     NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS iss_withheld           NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS iss_withheld_rate      NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS pis_withheld           NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS pis_withheld_rate      NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS cofins_withheld        NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS cofins_withheld_rate   NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS csll_withheld          NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS csll_withheld_rate     NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS pis_rate               NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS pis_amount             NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS cofins_rate            NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS cofins_amount          NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS irpj_amount            NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS csll_amount            NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS tax_regime             TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS simples_rate           NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS revenue_account_id     TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS revenue_type           TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS nature_of_operation    TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS project_id             TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS service_category       TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS contract_type          TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS revenue_recognition_date TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS service_period_start   TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS service_period_end     TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS accrual_month          TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS is_deferred_revenue    BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS deferred_periods       INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS payment_date           TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS payment_method         TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS bank_account_id        TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS bank_transaction_id    TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS payment_reference      TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS is_installment         BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS installment_number     INTEGER`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS total_installments     INTEGER`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS parent_ar_id           TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS is_recurring           BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS recurrence_frequency   TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS contract_value         NUMERIC`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS contract_start_date    TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS contract_end_date      TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS mrr                    NUMERIC`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS arr                    NUMERIC`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS collection_status      TEXT NOT NULL DEFAULT 'not_due'`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS collection_attempts    INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS last_collection_date   TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS late_fee_rate          NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS late_fee_amount        NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS interest_rate          NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS interest_amount        NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS invoice_xml_url        TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS invoice_pdf_url        TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS danfe_url              TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS payment_receipt_url    TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS contract_url           TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS boleto_url             TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS boleto_barcode         TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS opportunity_id         TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS sales_rep_id           TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS commission_rate        NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS commission_amount      NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS commission_paid        BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS customer_notes         TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS tags                   TEXT NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS updated_at             TEXT`;
  await sql`ALTER TABLE epm_ar ADD COLUMN IF NOT EXISTS updated_by             TEXT`;
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
    supplier_id:      row.supplier_id ? String(row.supplier_id) : undefined,
    supplier_name:    String(row.supplier_name),
    supplier_doc:     row.supplier_doc ? String(row.supplier_doc) : undefined,
    supplier_type:    String(row.supplier_type) as SupplierType,
    description:      String(row.description),
    category:         String(row.category),
    cost_center:      row.cost_center ? String(row.cost_center) : undefined,
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
  const str = (k: string) => row[k] != null ? String(row[k]) : undefined;
  const num = (k: string) => Number(row[k] ?? 0);
  const bool = (k: string) => Boolean(row[k]);
  let tags: string[] = [];
  try { tags = JSON.parse(String(row.tags ?? "[]")); } catch { tags = []; }

  return {
    id:             String(row.id),
    ar_code:        str("ar_code"),
    bu_code:        String(row.bu_code) as BuCode,
    customer_id:    str("customer_id"),
    customer_name:  String(row.customer_name),
    customer_doc:   str("customer_doc"),
    description:    String(row.description),
    category:       String(row.category ?? "Serviço"),
    cost_center:    str("cost_center"),
    reference_doc:  str("reference_doc"),
    issue_date:     String(row.issue_date),
    due_date:       String(row.due_date),
    invoice_number: str("invoice_number"),
    invoice_series: str("invoice_series"),
    invoice_date:   str("invoice_date"),

    gross_amount:   num("gross_amount"),
    discount_amount: num("discount_amount"),
    net_amount:     num("net_amount"),

    irrf_withheld:        num("irrf_withheld"),
    irrf_withheld_rate:   num("irrf_withheld_rate"),
    inss_withheld:        num("inss_withheld"),
    inss_withheld_rate:   num("inss_withheld_rate"),
    iss_withheld:         num("iss_withheld"),
    iss_withheld_rate:    num("iss_withheld_rate"),
    pis_withheld:         num("pis_withheld"),
    pis_withheld_rate:    num("pis_withheld_rate"),
    cofins_withheld:      num("cofins_withheld"),
    cofins_withheld_rate: num("cofins_withheld_rate"),
    csll_withheld:        num("csll_withheld"),
    csll_withheld_rate:   num("csll_withheld_rate"),

    iss_rate:      num("iss_rate"),
    iss_amount:    num("iss_amount"),
    pis_rate:      num("pis_rate"),
    pis_amount:    num("pis_amount"),
    cofins_rate:   num("cofins_rate"),
    cofins_amount: num("cofins_amount"),
    irpj_amount:   num("irpj_amount"),
    csll_amount:   num("csll_amount"),
    tax_regime:    str("tax_regime"),
    simples_rate:  num("simples_rate"),

    revenue_account_id:  str("revenue_account_id"),
    revenue_type:        str("revenue_type"),
    nature_of_operation: str("nature_of_operation"),

    project_id:        str("project_id"),
    service_category:  str("service_category"),
    contract_type:     str("contract_type"),

    revenue_recognition_date: str("revenue_recognition_date"),
    service_period_start:     str("service_period_start"),
    service_period_end:       str("service_period_end"),
    accrual_month:            str("accrual_month"),
    is_deferred_revenue:      bool("is_deferred_revenue"),
    deferred_periods:         num("deferred_periods"),

    payment_date:        str("payment_date"),
    received_date:       str("received_date"),
    payment_method:      str("payment_method"),
    bank_account_id:     str("bank_account_id"),
    bank_transaction_id: str("bank_transaction_id"),
    payment_reference:   str("payment_reference"),
    receipt_ref:         str("receipt_ref"),
    received_amount:     row.received_amount != null ? num("received_amount") : undefined,

    is_installment:      bool("is_installment"),
    installment_number:  row.installment_number != null ? num("installment_number") : undefined,
    total_installments:  row.total_installments != null ? num("total_installments") : undefined,
    parent_ar_id:        str("parent_ar_id"),

    is_recurring:          bool("is_recurring"),
    recurrence_frequency:  str("recurrence_frequency"),
    contract_value:        row.contract_value != null ? num("contract_value") : undefined,
    contract_start_date:   str("contract_start_date"),
    contract_end_date:     str("contract_end_date"),
    mrr:                   row.mrr != null ? num("mrr") : undefined,
    arr:                   row.arr != null ? num("arr") : undefined,

    status:               String(row.status) as ARStatus,
    collection_status:    str("collection_status"),
    collection_attempts:  num("collection_attempts"),
    last_collection_date: str("last_collection_date"),

    late_fee_rate:   num("late_fee_rate"),
    late_fee_amount: num("late_fee_amount"),
    interest_rate:   num("interest_rate"),
    interest_amount: num("interest_amount"),

    invoice_xml_url:     str("invoice_xml_url"),
    invoice_pdf_url:     str("invoice_pdf_url"),
    danfe_url:           str("danfe_url"),
    payment_receipt_url: str("payment_receipt_url"),
    contract_url:        str("contract_url"),
    boleto_url:          str("boleto_url"),
    boleto_barcode:      str("boleto_barcode"),

    opportunity_id:    str("opportunity_id"),
    sales_rep_id:      str("sales_rep_id"),
    commission_rate:   num("commission_rate"),
    commission_amount: num("commission_amount"),
    commission_paid:   bool("commission_paid"),

    notes:          str("notes"),
    customer_notes: str("customer_notes"),
    tags,
    source_system:  String(row.source_system ?? "manual"),
    created_at:     String(row.created_at),
    updated_at:     str("updated_at"),
    created_by:     str("created_by"),
    updated_by:     str("updated_by"),
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
    supplier_id:      input.supplier_id,
    supplier_name:    input.supplier_name,
    supplier_doc:     input.supplier_doc,
    supplier_type:    input.supplier_type,
    description:      input.description,
    category:         input.category,
    cost_center:      input.cost_center,
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
        id, bu_code, supplier_id, supplier_name, supplier_doc, supplier_type,
        description, category, cost_center, reference_doc, issue_date, due_date,
        gross_amount, irrf_rate, irrf_amount, inss_rate, inss_amount,
        iss_rate, iss_amount, pis_rate, pis_amount, cofins_rate, cofins_amount,
        total_retentions, net_amount, status, source_system, created_at, created_by
      ) VALUES (
        ${item.id}, ${item.bu_code}, ${item.supplier_id ?? null}, ${item.supplier_name},
        ${item.supplier_doc ?? null}, ${item.supplier_type}, ${item.description},
        ${item.category}, ${item.cost_center ?? null}, ${item.reference_doc ?? null}, ${item.issue_date}, ${item.due_date},
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

export async function updateAP(
  id: string,
  updates: Partial<Pick<APItem, "supplier_name" | "description" | "category" | "cost_center" | "reference_doc" | "due_date">>
): Promise<APItem | null> {
  if (sql) {
    const rows = await sql`
      UPDATE epm_ap SET
        supplier_name = COALESCE(${updates.supplier_name ?? null}, supplier_name),
        description   = COALESCE(${updates.description   ?? null}, description),
        category      = COALESCE(${updates.category      ?? null}, category),
        cost_center   = ${updates.cost_center ?? null},
        reference_doc = ${updates.reference_doc ?? null},
        due_date      = COALESCE(${updates.due_date      ?? null}, due_date)
      WHERE id = ${id} RETURNING *
    `;
    return rows[0] ? rowToAP(rows[0] as Record<string, unknown>) : null;
  }
  const store = readAPStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  store.items[idx] = { ...store.items[idx], ...updates };
  writeAPStore(store);
  return store.items[idx];
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
  const g = input.gross_amount;
  const isServiceCat = AR_SERVICE_CATEGORIES.includes(input.category ?? "");

  // Withholdings (customer deducts and remits to government)
  const irrf_withheld_rate   = input.irrf_withheld_rate   ?? 0;
  const inss_withheld_rate   = input.inss_withheld_rate   ?? 0;
  const iss_withheld_rate    = input.iss_withheld_rate    ?? 0;
  const pis_withheld_rate    = input.pis_withheld_rate    ?? 0;
  const cofins_withheld_rate = input.cofins_withheld_rate ?? 0;
  const csll_withheld_rate   = input.csll_withheld_rate   ?? 0;

  const irrf_withheld   = round2(g * irrf_withheld_rate);
  const inss_withheld   = round2(g * inss_withheld_rate);
  const iss_withheld    = round2(g * iss_withheld_rate);
  const pis_withheld    = round2(g * pis_withheld_rate);
  const cofins_withheld = round2(g * cofins_withheld_rate);
  const csll_withheld   = round2(g * csll_withheld_rate);
  const total_withheld  = round2(irrf_withheld + inss_withheld + iss_withheld + pis_withheld + cofins_withheld + csll_withheld);

  // Billing taxes (company remits to government; separate from withholdings)
  const iss_rate      = input.iss_rate    ?? (isServiceCat ? 0.05   : 0);
  const pis_rate      = input.pis_rate    ?? (isServiceCat ? 0.0065 : 0);
  const cofins_rate   = input.cofins_rate ?? (isServiceCat ? 0.03   : 0);
  const iss_amount    = round2(g * iss_rate);
  const pis_amount    = round2(g * pis_rate);
  const cofins_amount = round2(g * cofins_rate);

  const discount_amount = input.discount_amount ?? 0;
  const net_amount      = round2(g - discount_amount - total_withheld);

  const now = new Date().toISOString();

  const item: ARItem = {
    id:           randomUUID(),
    ar_code:      input.ar_code,
    bu_code:      input.bu_code,
    customer_id:  input.customer_id,
    customer_name: input.customer_name,
    customer_doc: input.customer_doc,
    description:  input.description,
    category:     input.category ?? "Serviço",
    cost_center:  input.cost_center,
    reference_doc: input.reference_doc,
    issue_date:   input.issue_date ?? now.slice(0, 10),
    due_date:     input.due_date,
    invoice_number: input.invoice_number,
    invoice_series: input.invoice_series,
    invoice_date:   input.invoice_date,

    gross_amount:   g,
    discount_amount,
    net_amount,

    irrf_withheld, irrf_withheld_rate,
    inss_withheld, inss_withheld_rate,
    iss_withheld,  iss_withheld_rate,
    pis_withheld,  pis_withheld_rate,
    cofins_withheld, cofins_withheld_rate,
    csll_withheld, csll_withheld_rate,

    iss_rate, iss_amount,
    pis_rate, pis_amount,
    cofins_rate, cofins_amount,
    irpj_amount:  input.irpj_amount  ?? 0,
    csll_amount:  input.csll_amount  ?? 0,
    tax_regime:   input.tax_regime,
    simples_rate: input.simples_rate ?? 0,

    revenue_account_id:  input.revenue_account_id,
    revenue_type:        input.revenue_type,
    nature_of_operation: input.nature_of_operation,

    project_id:        input.project_id,
    service_category:  input.service_category,
    contract_type:     input.contract_type,

    revenue_recognition_date: input.revenue_recognition_date,
    service_period_start:     input.service_period_start,
    service_period_end:       input.service_period_end,
    accrual_month:            input.accrual_month,
    is_deferred_revenue:      input.is_deferred_revenue  ?? false,
    deferred_periods:         input.deferred_periods      ?? 0,

    payment_date:        undefined,
    received_date:       undefined,
    payment_method:      input.payment_method,
    bank_account_id:     input.bank_account_id,
    bank_transaction_id: undefined,
    payment_reference:   input.payment_reference,
    receipt_ref:         undefined,
    received_amount:     undefined,

    is_installment:     input.is_installment     ?? false,
    installment_number: input.installment_number,
    total_installments: input.total_installments,
    parent_ar_id:       input.parent_ar_id,

    is_recurring:          input.is_recurring          ?? false,
    recurrence_frequency:  input.recurrence_frequency,
    contract_value:        input.contract_value,
    contract_start_date:   input.contract_start_date,
    contract_end_date:     input.contract_end_date,
    mrr:                   input.mrr,
    arr:                   input.arr,

    status:               "PENDING",
    collection_status:    "not_due",
    collection_attempts:  0,
    last_collection_date: undefined,

    late_fee_rate:   input.late_fee_rate  ?? 0,
    late_fee_amount: 0,
    interest_rate:   input.interest_rate  ?? 0,
    interest_amount: 0,

    invoice_xml_url:     input.invoice_xml_url,
    invoice_pdf_url:     input.invoice_pdf_url,
    danfe_url:           input.danfe_url,
    payment_receipt_url: input.payment_receipt_url,
    contract_url:        input.contract_url,
    boleto_url:          input.boleto_url,
    boleto_barcode:      input.boleto_barcode,

    opportunity_id:    input.opportunity_id,
    sales_rep_id:      input.sales_rep_id,
    commission_rate:   input.commission_rate  ?? 0,
    commission_amount: input.commission_amount ?? 0,
    commission_paid:   false,

    notes:          input.notes,
    customer_notes: input.customer_notes,
    tags:           input.tags ?? [],
    source_system:  input.source_system ?? "manual",
    created_at:     now,
    updated_at:     now,
    created_by:     input.created_by,
  };

  if (sql) {
    await sql`
      INSERT INTO epm_ar (
        id, ar_code, bu_code, customer_id, customer_name, customer_doc,
        description, category, cost_center, reference_doc, issue_date, due_date,
        invoice_number, invoice_series, invoice_date,
        gross_amount, discount_amount, net_amount,
        irrf_withheld, irrf_withheld_rate, inss_withheld, inss_withheld_rate,
        iss_withheld, iss_withheld_rate, pis_withheld, pis_withheld_rate,
        cofins_withheld, cofins_withheld_rate, csll_withheld, csll_withheld_rate,
        iss_rate, iss_amount, pis_rate, pis_amount, cofins_rate, cofins_amount,
        irpj_amount, csll_amount, tax_regime, simples_rate,
        revenue_account_id, revenue_type, nature_of_operation,
        project_id, service_category, contract_type,
        revenue_recognition_date, service_period_start, service_period_end,
        accrual_month, is_deferred_revenue, deferred_periods,
        payment_method, bank_account_id, payment_reference,
        is_installment, installment_number, total_installments, parent_ar_id,
        is_recurring, recurrence_frequency, contract_value,
        contract_start_date, contract_end_date, mrr, arr,
        status, collection_status, collection_attempts,
        late_fee_rate, interest_rate,
        invoice_xml_url, invoice_pdf_url, danfe_url, payment_receipt_url, contract_url,
        boleto_url, boleto_barcode,
        opportunity_id, sales_rep_id, commission_rate, commission_amount,
        notes, customer_notes, tags,
        source_system, created_at, updated_at, created_by
      ) VALUES (
        ${item.id}, ${item.ar_code ?? null}, ${item.bu_code},
        ${item.customer_id ?? null}, ${item.customer_name}, ${item.customer_doc ?? null},
        ${item.description}, ${item.category}, ${item.cost_center ?? null},
        ${item.reference_doc ?? null}, ${item.issue_date}, ${item.due_date},
        ${item.invoice_number ?? null}, ${item.invoice_series ?? null}, ${item.invoice_date ?? null},
        ${item.gross_amount}, ${item.discount_amount}, ${item.net_amount},
        ${item.irrf_withheld}, ${item.irrf_withheld_rate},
        ${item.inss_withheld}, ${item.inss_withheld_rate},
        ${item.iss_withheld},  ${item.iss_withheld_rate},
        ${item.pis_withheld},  ${item.pis_withheld_rate},
        ${item.cofins_withheld}, ${item.cofins_withheld_rate},
        ${item.csll_withheld}, ${item.csll_withheld_rate},
        ${item.iss_rate}, ${item.iss_amount},
        ${item.pis_rate}, ${item.pis_amount},
        ${item.cofins_rate}, ${item.cofins_amount},
        ${item.irpj_amount}, ${item.csll_amount},
        ${item.tax_regime ?? null}, ${item.simples_rate},
        ${item.revenue_account_id ?? null}, ${item.revenue_type ?? null},
        ${item.nature_of_operation ?? null},
        ${item.project_id ?? null}, ${item.service_category ?? null},
        ${item.contract_type ?? null},
        ${item.revenue_recognition_date ?? null},
        ${item.service_period_start ?? null}, ${item.service_period_end ?? null},
        ${item.accrual_month ?? null}, ${item.is_deferred_revenue},
        ${item.deferred_periods},
        ${item.payment_method ?? null}, ${item.bank_account_id ?? null},
        ${item.payment_reference ?? null},
        ${item.is_installment}, ${item.installment_number ?? null},
        ${item.total_installments ?? null}, ${item.parent_ar_id ?? null},
        ${item.is_recurring}, ${item.recurrence_frequency ?? null},
        ${item.contract_value ?? null},
        ${item.contract_start_date ?? null}, ${item.contract_end_date ?? null},
        ${item.mrr ?? null}, ${item.arr ?? null},
        ${item.status}, ${item.collection_status}, ${item.collection_attempts},
        ${item.late_fee_rate}, ${item.interest_rate},
        ${item.invoice_xml_url ?? null}, ${item.invoice_pdf_url ?? null},
        ${item.danfe_url ?? null}, ${item.payment_receipt_url ?? null}, ${item.contract_url ?? null},
        ${item.boleto_url ?? null}, ${item.boleto_barcode ?? null},
        ${item.opportunity_id ?? null}, ${item.sales_rep_id ?? null},
        ${item.commission_rate}, ${item.commission_amount},
        ${item.notes ?? null}, ${item.customer_notes ?? null},
        ${JSON.stringify(item.tags)},
        ${item.source_system}, ${item.created_at}, ${item.updated_at ?? null},
        ${item.created_by ?? null}
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

export type ARUpdateInput = Partial<Pick<ARItem,
  | "customer_name" | "description" | "category" | "cost_center" | "reference_doc" | "due_date"
  | "invoice_number" | "invoice_series" | "invoice_date" | "gross_amount" | "discount_amount"
  | "irrf_withheld_rate" | "inss_withheld_rate" | "iss_withheld_rate"
  | "pis_withheld_rate" | "cofins_withheld_rate" | "csll_withheld_rate"
  | "iss_rate" | "pis_rate" | "cofins_rate" | "irpj_amount" | "csll_amount"
  | "tax_regime" | "simples_rate"
  | "revenue_account_id" | "revenue_type" | "nature_of_operation"
  | "project_id" | "service_category" | "contract_type"
  | "revenue_recognition_date" | "service_period_start" | "service_period_end"
  | "accrual_month" | "is_deferred_revenue" | "deferred_periods"
  | "payment_method" | "bank_account_id" | "payment_reference"
  | "is_installment" | "installment_number" | "total_installments" | "parent_ar_id"
  | "is_recurring" | "recurrence_frequency" | "contract_value"
  | "contract_start_date" | "contract_end_date" | "mrr" | "arr"
  | "collection_status" | "collection_attempts" | "last_collection_date"
  | "late_fee_rate" | "late_fee_amount" | "interest_rate" | "interest_amount"
  | "invoice_xml_url" | "invoice_pdf_url" | "danfe_url" | "payment_receipt_url" | "contract_url"
  | "boleto_url" | "boleto_barcode"
  | "opportunity_id" | "sales_rep_id" | "commission_rate" | "commission_amount" | "commission_paid"
  | "notes" | "customer_notes" | "tags" | "updated_by"
>>;

export async function updateAR(id: string, updates: ARUpdateInput): Promise<ARItem | null> {
  const now = new Date().toISOString();
  if (sql) {
    const rows = await sql`
      UPDATE epm_ar SET
        customer_name     = COALESCE(${updates.customer_name     ?? null}, customer_name),
        description       = COALESCE(${updates.description       ?? null}, description),
        category          = COALESCE(${updates.category          ?? null}, category),
        cost_center       = ${updates.cost_center   ?? null},
        reference_doc     = ${updates.reference_doc ?? null},
        due_date          = COALESCE(${updates.due_date          ?? null}, due_date),
        invoice_number    = ${updates.invoice_number ?? null},
        invoice_series    = ${updates.invoice_series ?? null},
        invoice_date      = ${updates.invoice_date   ?? null},
        revenue_account_id = ${updates.revenue_account_id ?? null},
        revenue_type      = ${updates.revenue_type       ?? null},
        nature_of_operation = ${updates.nature_of_operation ?? null},
        project_id        = ${updates.project_id        ?? null},
        service_category  = ${updates.service_category  ?? null},
        contract_type     = ${updates.contract_type     ?? null},
        accrual_month     = ${updates.accrual_month     ?? null},
        service_period_start = ${updates.service_period_start ?? null},
        service_period_end   = ${updates.service_period_end   ?? null},
        revenue_recognition_date = ${updates.revenue_recognition_date ?? null},
        is_deferred_revenue  = COALESCE(${updates.is_deferred_revenue ?? null}, is_deferred_revenue),
        deferred_periods     = COALESCE(${updates.deferred_periods    ?? null}, deferred_periods),
        is_installment       = COALESCE(${updates.is_installment      ?? null}, is_installment),
        installment_number   = ${updates.installment_number ?? null},
        total_installments   = ${updates.total_installments ?? null},
        parent_ar_id         = ${updates.parent_ar_id       ?? null},
        is_recurring         = COALESCE(${updates.is_recurring ?? null}, is_recurring),
        recurrence_frequency = ${updates.recurrence_frequency ?? null},
        contract_value       = ${updates.contract_value       ?? null},
        contract_start_date  = ${updates.contract_start_date  ?? null},
        contract_end_date    = ${updates.contract_end_date    ?? null},
        mrr                  = ${updates.mrr ?? null},
        arr                  = ${updates.arr ?? null},
        payment_method    = ${updates.payment_method ?? null},
        bank_account_id   = ${updates.bank_account_id ?? null},
        payment_reference = ${updates.payment_reference ?? null},
        collection_status = COALESCE(${updates.collection_status ?? null}, collection_status),
        collection_attempts = COALESCE(${updates.collection_attempts ?? null}, collection_attempts),
        last_collection_date = ${updates.last_collection_date ?? null},
        late_fee_rate     = COALESCE(${updates.late_fee_rate   ?? null}, late_fee_rate),
        late_fee_amount   = COALESCE(${updates.late_fee_amount ?? null}, late_fee_amount),
        interest_rate     = COALESCE(${updates.interest_rate   ?? null}, interest_rate),
        interest_amount   = COALESCE(${updates.interest_amount ?? null}, interest_amount),
        invoice_xml_url   = ${updates.invoice_xml_url ?? null},
        invoice_pdf_url   = ${updates.invoice_pdf_url ?? null},
        danfe_url         = ${updates.danfe_url       ?? null},
        contract_url         = ${updates.contract_url         ?? null},
        payment_receipt_url  = ${updates.payment_receipt_url  ?? null},
        boleto_url           = ${updates.boleto_url           ?? null},
        boleto_barcode       = ${updates.boleto_barcode       ?? null},
        opportunity_id    = ${updates.opportunity_id  ?? null},
        sales_rep_id      = ${updates.sales_rep_id    ?? null},
        commission_rate   = COALESCE(${updates.commission_rate   ?? null}, commission_rate),
        commission_amount = COALESCE(${updates.commission_amount ?? null}, commission_amount),
        commission_paid   = COALESCE(${updates.commission_paid   ?? null}, commission_paid),
        notes             = ${updates.notes          ?? null},
        customer_notes    = ${updates.customer_notes ?? null},
        tags              = COALESCE(${updates.tags ? JSON.stringify(updates.tags) : null}, tags),
        updated_by        = ${updates.updated_by ?? null},
        updated_at        = ${now}
      WHERE id = ${id} RETURNING *
    `;
    return rows[0] ? rowToAR(rows[0] as Record<string, unknown>) : null;
  }
  const store = readARStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  store.items[idx] = { ...store.items[idx], ...updates, updated_at: now };
  writeARStore(store);
  return store.items[idx];
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

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface EpmSupplier {
  id:            string;
  name:          string;
  doc?:          string;
  email?:        string;
  phone?:        string;
  supplier_type: SupplierType;
  bank_info?:    string;
  notes?:        string;
  created_at:    string;
}

export async function initSuppliersDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_suppliers (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      doc           TEXT,
      email         TEXT,
      phone         TEXT,
      supplier_type TEXT NOT NULL DEFAULT 'other',
      bank_info     TEXT,
      notes         TEXT,
      created_at    TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE epm_suppliers ADD COLUMN IF NOT EXISTS bank_info TEXT`;
  await sql`ALTER TABLE epm_suppliers ADD COLUMN IF NOT EXISTS notes TEXT`;
}

export async function getSuppliers(): Promise<EpmSupplier[]> {
  if (sql) {
    const rows = await sql`SELECT * FROM epm_suppliers ORDER BY name`;
    return rows.map((r) => ({
      id: String(r.id), name: String(r.name), doc: r.doc ? String(r.doc) : undefined,
      email: r.email ? String(r.email) : undefined, phone: r.phone ? String(r.phone) : undefined,
      supplier_type: String(r.supplier_type) as SupplierType,
      bank_info: r.bank_info ? String(r.bank_info) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      created_at: String(r.created_at),
    }));
  }
  return readJSONFile<{ items: EpmSupplier[] }>(
    path.join(process.cwd(), "public", "data", "epm-suppliers.json"), { items: [] }
  ).items;
}

export async function addSupplier(input: Omit<EpmSupplier, "id" | "created_at">): Promise<EpmSupplier> {
  const item: EpmSupplier = { id: randomUUID(), ...input, created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_suppliers (id,name,doc,email,phone,supplier_type,bank_info,notes,created_at)
      VALUES (${item.id},${item.name},${item.doc??null},${item.email??null},${item.phone??null},${item.supplier_type},${item.bank_info??null},${item.notes??null},${item.created_at})`;
  } else {
    const store = readJSONFile<{ items: EpmSupplier[] }>(
      path.join(process.cwd(), "public", "data", "epm-suppliers.json"), { items: [] }
    );
    store.items.push(item);
    writeJSONFile(path.join(process.cwd(), "public", "data", "epm-suppliers.json"), store);
  }
  return item;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface EpmCustomer {
  id:         string;
  name:       string;
  doc?:       string;
  email?:     string;
  phone?:     string;
  address?:   string;
  notes?:     string;
  is_active:  boolean;
  created_at: string;
}

export async function initCustomersDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_customers (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      doc        TEXT,
      email      TEXT,
      phone      TEXT,
      address    TEXT,
      notes      TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE epm_customers ADD COLUMN IF NOT EXISTS address TEXT`;
  await sql`ALTER TABLE epm_customers ADD COLUMN IF NOT EXISTS notes TEXT`;
}

export async function getCustomers(): Promise<EpmCustomer[]> {
  if (sql) {
    const rows = await sql`SELECT * FROM epm_customers WHERE is_active=true ORDER BY name`;
    return rows.map((r) => ({
      id: String(r.id), name: String(r.name), doc: r.doc ? String(r.doc) : undefined,
      email: r.email ? String(r.email) : undefined, phone: r.phone ? String(r.phone) : undefined,
      address: r.address ? String(r.address) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      is_active: Boolean(r.is_active), created_at: String(r.created_at),
    }));
  }
  return readJSONFile<{ items: EpmCustomer[] }>(
    path.join(process.cwd(), "public", "data", "epm-customers.json"), { items: [] }
  ).items;
}

export async function addCustomer(input: Omit<EpmCustomer, "id" | "created_at" | "is_active">): Promise<EpmCustomer> {
  const item: EpmCustomer = { id: randomUUID(), ...input, is_active: true, created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_customers (id,name,doc,email,phone,address,notes,is_active,created_at)
      VALUES (${item.id},${item.name},${item.doc??null},${item.email??null},${item.phone??null},${item.address??null},${item.notes??null},true,${item.created_at})`;
  } else {
    const store = readJSONFile<{ items: EpmCustomer[] }>(
      path.join(process.cwd(), "public", "data", "epm-customers.json"), { items: [] }
    );
    store.items.push(item);
    writeJSONFile(path.join(process.cwd(), "public", "data", "epm-customers.json"), store);
  }
  return item;
}

// ─── AR Collections Log ───────────────────────────────────────────────────────

export interface ARCollection {
  id:              string;
  ar_id:           string;
  collection_date: string;
  method:          "email" | "phone" | "whatsapp" | "other";
  outcome:         "promised" | "no_answer" | "dispute" | "paid" | "other";
  next_followup?:  string;
  notes?:          string;
  created_at:      string;
}

export async function initCollectionsDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_ar_collections (
      id              TEXT PRIMARY KEY,
      ar_id           TEXT NOT NULL REFERENCES epm_ar(id),
      collection_date TEXT NOT NULL,
      method          TEXT NOT NULL DEFAULT 'email',
      outcome         TEXT NOT NULL DEFAULT 'other',
      next_followup   TEXT,
      notes           TEXT,
      created_at      TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ar_coll_ar_id ON epm_ar_collections(ar_id)`;
}

export async function addCollectionLog(input: Omit<ARCollection, "id" | "created_at">): Promise<ARCollection> {
  const item: ARCollection = { id: randomUUID(), ...input, created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_ar_collections (id,ar_id,collection_date,method,outcome,next_followup,notes,created_at)
      VALUES (${item.id},${item.ar_id},${item.collection_date},${item.method},${item.outcome},${item.next_followup??null},${item.notes??null},${item.created_at})`;
  } else {
    const f = path.join(process.cwd(), "public", "data", "epm-ar-collections.json");
    const store = readJSONFile<{ items: ARCollection[] }>(f, { items: [] });
    store.items.push(item);
    writeJSONFile(f, store);
  }
  return item;
}

export async function getCollectionLog(ar_id: string): Promise<ARCollection[]> {
  if (sql) {
    const rows = await sql`SELECT * FROM epm_ar_collections WHERE ar_id=${ar_id} ORDER BY collection_date DESC`;
    return rows.map((r) => ({
      id: String(r.id), ar_id: String(r.ar_id), collection_date: String(r.collection_date),
      method: String(r.method) as ARCollection["method"],
      outcome: String(r.outcome) as ARCollection["outcome"],
      next_followup: r.next_followup ? String(r.next_followup) : undefined,
      notes: r.notes ? String(r.notes) : undefined, created_at: String(r.created_at),
    }));
  }
  const f = path.join(process.cwd(), "public", "data", "epm-ar-collections.json");
  const store = readJSONFile<{ items: ARCollection[] }>(f, { items: [] });
  return store.items.filter((i) => i.ar_id === ar_id).sort((a, b) => b.collection_date.localeCompare(a.collection_date));
}

// ─── AP Installments ──────────────────────────────────────────────────────────

export interface APInstallment {
  id:                 string;
  parent_id:          string;   // ap_id of the first installment (group key)
  installment_number: number;
  total_installments: number;
  bu_code:            BuCode;
  supplier_name:      string;
  supplier_type:      SupplierType;
  description:        string;
  category:           string;
  issue_date:         string;
  due_date:           string;
  gross_amount:       number;
  net_amount:         number;
  total_retentions:   number;
  irrf_amount:        number;
  inss_amount:        number;
  iss_amount:         number;
  pis_amount:         number;
  cofins_amount:      number;
  status:             APStatus;
  created_at:         string;
}

export async function createAPInstallments(
  base: NewAPInput & { total_installments: number }
): Promise<APItem[]> {
  const n = base.total_installments;
  if (n < 2 || n > 60) throw new Error("total_installments must be 2–60");

  const installmentGross = round2(base.gross_amount / n);
  const items: APItem[] = [];

  // Parse base due_date and generate monthly due dates
  const [y, m, d] = base.due_date.split("-").map(Number);

  for (let i = 0; i < n; i++) {
    const dueDate = new Date(y, m - 1 + i, d);
    const due = dueDate.toISOString().slice(0, 10);
    const item = await addAP({ ...base, gross_amount: installmentGross, due_date: due });
    items.push(item);
  }
  return items;
}

// ─── AR Installments ──────────────────────────────────────────────────────────

export async function createARInstallments(
  base: NewARInput & { total_installments: number }
): Promise<ARItem[]> {
  const n = base.total_installments;
  if (n < 2 || n > 60) throw new Error("total_installments must be 2–60");

  const installmentGross = round2(base.gross_amount / n);
  const items: ARItem[] = [];
  const [y, m, d] = base.due_date.split("-").map(Number);

  for (let i = 0; i < n; i++) {
    const dueDate = new Date(y, m - 1 + i, d);
    const due = dueDate.toISOString().slice(0, 10);
    const item = await addAR({ ...base, gross_amount: installmentGross, due_date: due });
    items.push(item);
  }
  return items;
}

// ─── AR Recurring Contracts ───────────────────────────────────────────────────

export interface ARContract {
  id:             string;
  customer_name:  string;
  customer_doc?:  string;
  description:    string;
  bu_code:        BuCode;
  category:       string;
  monthly_amount: number;
  billing_day:    number;   // 1–28
  is_active:      boolean;
  start_date:     string;
  end_date?:      string;
  iss_rate:       number;
  next_invoice?:  string;
  created_at:     string;
}

export async function initContractsDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_ar_contracts (
      id             TEXT PRIMARY KEY,
      customer_name  TEXT NOT NULL,
      customer_doc   TEXT,
      description    TEXT NOT NULL,
      bu_code        TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'Serviço Recorrente',
      monthly_amount NUMERIC NOT NULL,
      billing_day    INTEGER NOT NULL DEFAULT 5,
      is_active      BOOLEAN NOT NULL DEFAULT true,
      start_date     TEXT NOT NULL,
      end_date       TEXT,
      iss_rate       NUMERIC NOT NULL DEFAULT 0.05,
      next_invoice   TEXT,
      created_at     TEXT NOT NULL
    )
  `;
}

export async function getContracts(activeOnly = true): Promise<ARContract[]> {
  if (sql) {
    const rows = activeOnly
      ? await sql`SELECT * FROM epm_ar_contracts WHERE is_active=true ORDER BY customer_name`
      : await sql`SELECT * FROM epm_ar_contracts ORDER BY customer_name`;
    return rows.map((r) => ({
      id: String(r.id), customer_name: String(r.customer_name),
      customer_doc: r.customer_doc ? String(r.customer_doc) : undefined,
      description: String(r.description), bu_code: String(r.bu_code) as BuCode,
      category: String(r.category), monthly_amount: Number(r.monthly_amount),
      billing_day: Number(r.billing_day), is_active: Boolean(r.is_active),
      start_date: String(r.start_date), end_date: r.end_date ? String(r.end_date) : undefined,
      iss_rate: Number(r.iss_rate),
      next_invoice: r.next_invoice ? String(r.next_invoice) : undefined,
      created_at: String(r.created_at),
    }));
  }
  const f = path.join(process.cwd(), "public", "data", "epm-ar-contracts.json");
  const store = readJSONFile<{ items: ARContract[] }>(f, { items: [] });
  return activeOnly ? store.items.filter((c) => c.is_active) : store.items;
}

export async function addContract(input: Omit<ARContract, "id" | "created_at">): Promise<ARContract> {
  const item: ARContract = { id: randomUUID(), ...input, created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_ar_contracts
      (id,customer_name,customer_doc,description,bu_code,category,monthly_amount,billing_day,is_active,start_date,end_date,iss_rate,next_invoice,created_at)
      VALUES (${item.id},${item.customer_name},${item.customer_doc??null},${item.description},${item.bu_code},
        ${item.category},${item.monthly_amount},${item.billing_day},${item.is_active},${item.start_date},
        ${item.end_date??null},${item.iss_rate},${item.next_invoice??null},${item.created_at})`;
  } else {
    const f = path.join(process.cwd(), "public", "data", "epm-ar-contracts.json");
    const store = readJSONFile<{ items: ARContract[] }>(f, { items: [] });
    store.items.push(item);
    writeJSONFile(f, store);
  }
  return item;
}

export async function generateARFromContracts(): Promise<ARItem[]> {
  const contracts = await getContracts(true);
  const today = new Date();
  const generated: ARItem[] = [];

  for (const contract of contracts) {
    // Check if end_date passed
    if (contract.end_date && new Date(contract.end_date) < today) continue;

    // Determine if this month's invoice is due
    const dueDate = new Date(today.getFullYear(), today.getMonth(), contract.billing_day);
    if (dueDate < today) {
      // Check it hasn't been generated this month already
      const existing = await getAllAR();
      const monthKey = dueDate.toISOString().slice(0, 7);
      const alreadyExists = existing.some(
        (ar) => ar.customer_name === contract.customer_name &&
                ar.description === contract.description &&
                ar.issue_date.slice(0, 7) === monthKey
      );
      if (!alreadyExists) {
        const ar = await addAR({
          bu_code:       contract.bu_code,
          customer_name: contract.customer_name,
          customer_doc:  contract.customer_doc,
          description:   `${contract.description} — ${monthKey}`,
          category:      contract.category,
          issue_date:    dueDate.toISOString().slice(0, 10),
          due_date:      dueDate.toISOString().slice(0, 10),
          gross_amount:  contract.monthly_amount,
          iss_rate:      contract.iss_rate,
          source_system: "recurring",
        });
        generated.push(ar);
      }
    }
  }
  return generated;
}

// ─── DRE from AP/AR (regime de competência) ───────────────────────────────────

export interface DRELine {
  month:        string;   // YYYY-MM
  grossRevenue: number;
  issDeductions:number;
  netRevenue:   number;
  cogs:         number;   // AP categories: Freelancer, Produção
  grossProfit:  number;
  opex:         number;   // AP categories: all others
  ebitda:       number;
  financials:   number;   // AP category: Tributário + juros
  netResult:    number;
}

const COGS_CATEGORIES  = new Set(["Freelancer", "Produção"]);
const FINANCIAL_CATEGORIES = new Set(["Tributário"]);

export async function getDREByMonth(filters?: { bu_code?: BuCode }): Promise<DRELine[]> {
  const [apItems, arItems] = await Promise.all([
    getAllAP(filters?.bu_code ? { bu_code: filters.bu_code } : undefined),
    getAllAR(filters?.bu_code ? { bu_code: filters.bu_code } : undefined),
  ]);

  const months = new Set([
    ...arItems.map((i) => i.issue_date.slice(0, 7)),
    ...apItems.map((i) => i.issue_date.slice(0, 7)),
  ]);

  return Array.from(months).sort().reverse().map((month) => {
    const revItems = arItems.filter((i) => i.issue_date.slice(0, 7) === month && i.status !== "CANCELLED");
    const expItems = apItems.filter((i) => i.issue_date.slice(0, 7) === month && i.status !== "CANCELLED");

    const grossRevenue  = round2(revItems.reduce((s, i) => s + i.gross_amount, 0));
    const issDeductions = round2(revItems.reduce((s, i) => s + i.iss_amount, 0));
    const netRevenue    = round2(revItems.reduce((s, i) => s + i.net_amount, 0));

    const cogs       = round2(expItems.filter((i) => COGS_CATEGORIES.has(i.category)).reduce((s, i) => s + i.net_amount, 0));
    const financials = round2(expItems.filter((i) => FINANCIAL_CATEGORIES.has(i.category)).reduce((s, i) => s + i.net_amount, 0));
    const opex       = round2(expItems.filter((i) => !COGS_CATEGORIES.has(i.category) && !FINANCIAL_CATEGORIES.has(i.category)).reduce((s, i) => s + i.net_amount, 0));

    const grossProfit = round2(netRevenue - cogs);
    const ebitda      = round2(grossProfit - opex);
    const netResult   = round2(ebitda - financials);

    return { month, grossRevenue, issDeductions, netRevenue, cogs, grossProfit, opex, ebitda, financials, netResult };
  });
}

// ─── DFC from AP/AR (regime de caixa) ────────────────────────────────────────

export interface DFCLine {
  month:         string;
  totalInflows:  number;
  totalOutflows: number;
  netCash:       number;
  inflows:       ARItem[];
  outflows:      APItem[];
}

export async function getDFCByMonth(filters?: { bu_code?: BuCode }): Promise<DFCLine[]> {
  const [apItems, arItems] = await Promise.all([
    getAllAP(filters?.bu_code ? { bu_code: filters.bu_code } : undefined),
    getAllAR(filters?.bu_code ? { bu_code: filters.bu_code } : undefined),
  ]);

  const paidAP      = apItems.filter((i) => i.status === "PAID" && i.paid_date);
  const receivedAR  = arItems.filter((i) => i.status === "RECEIVED" && i.received_date);

  const months = new Set([
    ...paidAP.map((i) => i.paid_date!.slice(0, 7)),
    ...receivedAR.map((i) => i.received_date!.slice(0, 7)),
  ]);

  return Array.from(months).sort().reverse().map((month) => {
    const inflows  = receivedAR.filter((i) => i.received_date!.slice(0, 7) === month);
    const outflows = paidAP.filter((i) => i.paid_date!.slice(0, 7) === month);
    const totalInflows  = round2(inflows.reduce((s, i) => s + (i.received_amount ?? i.net_amount), 0));
    const totalOutflows = round2(outflows.reduce((s, i) => s + (i.paid_amount ?? i.net_amount), 0));
    return { month, totalInflows, totalOutflows, netCash: round2(totalInflows - totalOutflows), inflows, outflows };
  });
}

// ─── Cost Centers ─────────────────────────────────────────────────────────────

export interface EpmCostCenter {
  id:          string;
  code:        string;
  name:        string;
  bu_code:     BuCode;
  description?: string;
  created_at:  string;
}

export async function initCostCentersDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_cost_centers (
      id          TEXT PRIMARY KEY,
      code        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      bu_code     TEXT NOT NULL,
      description TEXT,
      created_at  TEXT NOT NULL
    )
  `;
}

export async function getCostCenters(bu_code?: BuCode): Promise<EpmCostCenter[]> {
  if (sql) {
    const rows = bu_code
      ? await sql`SELECT * FROM epm_cost_centers WHERE bu_code=${bu_code} ORDER BY code`
      : await sql`SELECT * FROM epm_cost_centers ORDER BY bu_code, code`;
    return rows.map((r) => ({
      id: String(r.id), code: String(r.code), name: String(r.name),
      bu_code: String(r.bu_code) as BuCode,
      description: r.description ? String(r.description) : undefined,
      created_at: String(r.created_at),
    }));
  }
  const f = path.join(process.cwd(), "public", "data", "epm-cost-centers.json");
  const store = readJSONFile<{ items: EpmCostCenter[] }>(f, { items: [] });
  return bu_code ? store.items.filter((i) => i.bu_code === bu_code) : store.items;
}

export async function addCostCenter(input: Omit<EpmCostCenter, "id" | "created_at">): Promise<EpmCostCenter> {
  const item: EpmCostCenter = { id: randomUUID(), ...input, created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_cost_centers (id,code,name,bu_code,description,created_at)
      VALUES (${item.id},${item.code},${item.name},${item.bu_code},${item.description??null},${item.created_at})`;
  } else {
    const f = path.join(process.cwd(), "public", "data", "epm-cost-centers.json");
    const store = readJSONFile<{ items: EpmCostCenter[] }>(f, { items: [] });
    store.items.push(item);
    writeJSONFile(f, store);
  }
  return item;
}

// ─── Revenue Recognition ──────────────────────────────────────────────────────

export interface RevenueRecognition {
  id:                   string;
  ar_id:                string;
  period:               string;   // YYYY-MM
  recognized_amount:    number;
  recognition_method:   "cash" | "accrual" | "milestone";
  notes?:               string;
  created_at:           string;
}

export async function initRevenueRecognitionDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_revenue_recognition (
      id                 TEXT PRIMARY KEY,
      ar_id              TEXT NOT NULL,
      period             TEXT NOT NULL,
      recognized_amount  NUMERIC NOT NULL,
      recognition_method TEXT NOT NULL DEFAULT 'accrual',
      notes              TEXT,
      created_at         TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_rev_rec_ar_id ON epm_revenue_recognition(ar_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_rev_rec_period ON epm_revenue_recognition(period)`;
}

export async function getRevenueRecognitions(filters?: { ar_id?: string; period?: string }): Promise<RevenueRecognition[]> {
  if (sql) {
    let rows;
    if (filters?.ar_id && filters?.period) {
      rows = await sql`SELECT * FROM epm_revenue_recognition WHERE ar_id=${filters.ar_id} AND period=${filters.period} ORDER BY created_at DESC`;
    } else if (filters?.ar_id) {
      rows = await sql`SELECT * FROM epm_revenue_recognition WHERE ar_id=${filters.ar_id} ORDER BY period DESC`;
    } else if (filters?.period) {
      rows = await sql`SELECT * FROM epm_revenue_recognition WHERE period=${filters.period} ORDER BY created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM epm_revenue_recognition ORDER BY period DESC`;
    }
    return rows.map((r) => ({
      id: String(r.id), ar_id: String(r.ar_id), period: String(r.period),
      recognized_amount: Number(r.recognized_amount),
      recognition_method: String(r.recognition_method) as RevenueRecognition["recognition_method"],
      notes: r.notes ? String(r.notes) : undefined, created_at: String(r.created_at),
    }));
  }
  const f = path.join(process.cwd(), "public", "data", "epm-revenue-recognition.json");
  let items = readJSONFile<{ items: RevenueRecognition[] }>(f, { items: [] }).items;
  if (filters?.ar_id) items = items.filter((i) => i.ar_id === filters.ar_id);
  if (filters?.period) items = items.filter((i) => i.period === filters.period);
  return items.sort((a, b) => b.period.localeCompare(a.period));
}

export async function recognizeRevenue(input: Omit<RevenueRecognition, "id" | "created_at">): Promise<RevenueRecognition> {
  const item: RevenueRecognition = { id: randomUUID(), ...input, created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_revenue_recognition (id,ar_id,period,recognized_amount,recognition_method,notes,created_at)
      VALUES (${item.id},${item.ar_id},${item.period},${item.recognized_amount},${item.recognition_method},${item.notes??null},${item.created_at})`;
  } else {
    const f = path.join(process.cwd(), "public", "data", "epm-revenue-recognition.json");
    const store = readJSONFile<{ items: RevenueRecognition[] }>(f, { items: [] });
    store.items.push(item);
    writeJSONFile(f, store);
  }
  return item;
}

// ─── Bank Transactions & Reconciliation ──────────────────────────────────────

export type BankTxnStatus = "unmatched" | "matched" | "ignored";
export type BankTxnType   = "credit" | "debit";

export interface BankTransaction {
  id:           string;
  txn_date:     string;
  description:  string;
  amount:       number;
  txn_type:     BankTxnType;
  bank_ref?:    string;
  status:       BankTxnStatus;
  matched_id?:  string;
  matched_type?: "AP" | "AR";
  bu_code?:     BuCode;
  created_at:   string;
}

export interface BankMatchCandidate {
  type:       "AP" | "AR";
  item:       APItem | ARItem;
  amountDiff: number;
  dateDiff:   number;
  score:      number;
}

export async function initBankTransactionsDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_bank_transactions (
      id           TEXT PRIMARY KEY,
      txn_date     TEXT NOT NULL,
      description  TEXT NOT NULL,
      amount       NUMERIC NOT NULL,
      txn_type     TEXT NOT NULL,
      bank_ref     TEXT,
      status       TEXT NOT NULL DEFAULT 'unmatched',
      matched_id   TEXT,
      matched_type TEXT,
      bu_code      TEXT,
      created_at   TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_bank_txn_date ON epm_bank_transactions(txn_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_bank_txn_status ON epm_bank_transactions(status)`;
}

export async function getBankTransactions(filters?: { status?: BankTxnStatus; bu_code?: BuCode }): Promise<BankTransaction[]> {
  const mapRow = (r: Record<string, unknown>): BankTransaction => ({
    id: String(r.id), txn_date: String(r.txn_date), description: String(r.description),
    amount: Number(r.amount), txn_type: String(r.txn_type) as BankTxnType,
    bank_ref: r.bank_ref ? String(r.bank_ref) : undefined,
    status: String(r.status) as BankTxnStatus,
    matched_id: r.matched_id ? String(r.matched_id) : undefined,
    matched_type: r.matched_type ? (String(r.matched_type) as "AP" | "AR") : undefined,
    bu_code: r.bu_code ? (String(r.bu_code) as BuCode) : undefined,
    created_at: String(r.created_at),
  });
  if (sql) {
    const rows = await sql`SELECT * FROM epm_bank_transactions ORDER BY txn_date DESC`;
    let result = rows.map(mapRow);
    if (filters?.status) result = result.filter((r) => r.status === filters.status);
    if (filters?.bu_code) result = result.filter((r) => r.bu_code === filters.bu_code);
    return result;
  }
  const f = path.join(process.cwd(), "public", "data", "epm-bank-transactions.json");
  let items = readJSONFile<{ items: BankTransaction[] }>(f, { items: [] }).items;
  if (filters?.status)  items = items.filter((i) => i.status === filters.status);
  if (filters?.bu_code) items = items.filter((i) => i.bu_code === filters.bu_code);
  return items.sort((a, b) => b.txn_date.localeCompare(a.txn_date));
}

export async function addBankTransaction(input: Omit<BankTransaction, "id" | "created_at" | "status" | "matched_id" | "matched_type">): Promise<BankTransaction> {
  const item: BankTransaction = { id: randomUUID(), ...input, status: "unmatched", created_at: new Date().toISOString() };
  if (sql) {
    await sql`INSERT INTO epm_bank_transactions (id,txn_date,description,amount,txn_type,bank_ref,status,bu_code,created_at)
      VALUES (${item.id},${item.txn_date},${item.description},${item.amount},${item.txn_type},${item.bank_ref??null},'unmatched',${item.bu_code??null},${item.created_at})`;
  } else {
    const f = path.join(process.cwd(), "public", "data", "epm-bank-transactions.json");
    const store = readJSONFile<{ items: BankTransaction[] }>(f, { items: [] });
    store.items.push(item);
    writeJSONFile(f, store);
  }
  return item;
}

export async function matchBankTransaction(txn_id: string, matched_id: string, matched_type: "AP" | "AR"): Promise<BankTransaction | null> {
  if (sql) {
    await sql`UPDATE epm_bank_transactions SET status='matched', matched_id=${matched_id}, matched_type=${matched_type} WHERE id=${txn_id}`;
    const rows = await sql`SELECT * FROM epm_bank_transactions WHERE id=${txn_id}`;
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: String(r.id), txn_date: String(r.txn_date), description: String(r.description),
      amount: Number(r.amount), txn_type: String(r.txn_type) as BankTxnType,
      bank_ref: r.bank_ref ? String(r.bank_ref) : undefined,
      status: "matched", matched_id, matched_type,
      bu_code: r.bu_code ? (String(r.bu_code) as BuCode) : undefined,
      created_at: String(r.created_at),
    };
  }
  const f = path.join(process.cwd(), "public", "data", "epm-bank-transactions.json");
  const store = readJSONFile<{ items: BankTransaction[] }>(f, { items: [] });
  const idx = store.items.findIndex((i) => i.id === txn_id);
  if (idx === -1) return null;
  store.items[idx] = { ...store.items[idx], status: "matched", matched_id, matched_type };
  writeJSONFile(f, store);
  return store.items[idx];
}

export async function ignoreBankTransaction(txn_id: string): Promise<boolean> {
  if (sql) {
    await sql`UPDATE epm_bank_transactions SET status='ignored' WHERE id=${txn_id}`;
    return true;
  }
  const f = path.join(process.cwd(), "public", "data", "epm-bank-transactions.json");
  const store = readJSONFile<{ items: BankTransaction[] }>(f, { items: [] });
  const idx = store.items.findIndex((i) => i.id === txn_id);
  if (idx === -1) return false;
  store.items[idx] = { ...store.items[idx], status: "ignored" };
  writeJSONFile(f, store);
  return true;
}

export async function findBankMatchCandidates(txn: BankTransaction): Promise<BankMatchCandidate[]> {
  const AMOUNT_TOLERANCE = txn.amount * 0.005; // 0.5%
  const DATE_TOLERANCE_DAYS = 3;
  const txnDate = new Date(txn.txn_date + "T12:00:00").getTime();

  const candidates: BankMatchCandidate[] = [];

  if (txn.txn_type === "credit") {
    const arItems = await getAllAR({ status: "PENDING" });
    for (const item of arItems) {
      const amountDiff = Math.abs(item.net_amount - txn.amount);
      if (amountDiff > AMOUNT_TOLERANCE) continue;
      const itemDate = new Date(item.due_date + "T12:00:00").getTime();
      const dateDiff = Math.abs(txnDate - itemDate) / 86_400_000;
      if (dateDiff > DATE_TOLERANCE_DAYS + 5) continue;
      const amountScore = amountDiff === 0 ? 0 : 20 + (amountDiff / (txn.amount * 0.005)) * 10;
      const score = 100 - amountScore - dateDiff * 5;
      candidates.push({ type: "AR", item, amountDiff, dateDiff, score });
    }
  } else {
    const apItems = await getAllAP({ status: "PENDING" });
    for (const item of apItems) {
      const amountDiff = Math.abs(item.net_amount - txn.amount);
      if (amountDiff > AMOUNT_TOLERANCE) continue;
      const itemDate = new Date(item.due_date + "T12:00:00").getTime();
      const dateDiff = Math.abs(txnDate - itemDate) / 86_400_000;
      if (dateDiff > DATE_TOLERANCE_DAYS + 5) continue;
      const amountScore = amountDiff === 0 ? 0 : 20 + (amountDiff / (txn.amount * 0.005)) * 10;
      const score = 100 - amountScore - dateDiff * 5;
      candidates.push({ type: "AP", item, amountDiff, dateDiff, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── AR Installments ─────────────────────────────────────────────────────────

export interface ARInstallmentItem {
  id:                 string;
  parent_ar_id:       string;
  installment_number: number;
  total_installments: number;
  installment_amount: number;
  due_date:           string;
  status:             "pending" | "paid" | "overdue";
  payment_date?:      string;
  payment_method?:    string;
  late_fees_applied:  number;
  created_at:         string;
}

export async function initARInstallmentsDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_ar_installments (
      id                  TEXT    PRIMARY KEY,
      parent_ar_id        TEXT    NOT NULL REFERENCES epm_ar(id) ON DELETE CASCADE,
      installment_number  INTEGER NOT NULL,
      total_installments  INTEGER NOT NULL,
      installment_amount  NUMERIC NOT NULL,
      due_date            TEXT    NOT NULL,
      status              TEXT    NOT NULL DEFAULT 'pending',
      payment_date        TEXT,
      payment_method      TEXT,
      late_fees_applied   NUMERIC NOT NULL DEFAULT 0,
      created_at          TEXT    NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_ari_parent ON epm_ar_installments(parent_ar_id)`;
}

function rowToInstallment(r: Record<string, unknown>): ARInstallmentItem {
  return {
    id:                 String(r.id),
    parent_ar_id:       String(r.parent_ar_id),
    installment_number: Number(r.installment_number),
    total_installments: Number(r.total_installments),
    installment_amount: Number(r.installment_amount),
    due_date:           String(r.due_date),
    status:             String(r.status) as ARInstallmentItem["status"],
    payment_date:       r.payment_date ? String(r.payment_date) : undefined,
    payment_method:     r.payment_method ? String(r.payment_method) : undefined,
    late_fees_applied:  Number(r.late_fees_applied ?? 0),
    created_at:         String(r.created_at),
  };
}

export async function getARInstallments(parent_ar_id: string): Promise<ARInstallmentItem[]> {
  if (sql) {
    const rows = await sql`
      SELECT * FROM epm_ar_installments
      WHERE parent_ar_id = ${parent_ar_id}
      ORDER BY installment_number
    `;
    return rows.map((r) => rowToInstallment(r as Record<string, unknown>));
  }
  return [];
}

export async function payARInstallment(
  id: string,
  data: { payment_date: string; payment_method?: string; late_fees_applied?: number }
): Promise<ARInstallmentItem | null> {
  if (sql) {
    const rows = await sql`
      UPDATE epm_ar_installments
      SET status = 'paid',
          payment_date      = ${data.payment_date},
          payment_method    = ${data.payment_method ?? null},
          late_fees_applied = ${data.late_fees_applied ?? 0}
      WHERE id = ${id} RETURNING *
    `;
    return rows[0] ? rowToInstallment(rows[0] as Record<string, unknown>) : null;
  }
  return null;
}

// ─── AR Payment History ───────────────────────────────────────────────────────

export interface ARPaymentHistoryItem {
  id:                  string;
  ar_id:               string;
  payment_date:        string;
  amount_paid:         number;
  payment_method?:     string;
  bank_transaction_id?: string;
  payment_reference?:  string;
  notes?:              string;
  created_at:          string;
  created_by?:         string;
}

export async function initARPaymentHistoryDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_ar_payment_history (
      id                   TEXT    PRIMARY KEY,
      ar_id                TEXT    NOT NULL REFERENCES epm_ar(id) ON DELETE CASCADE,
      payment_date         TEXT    NOT NULL,
      amount_paid          NUMERIC NOT NULL,
      payment_method       TEXT,
      bank_transaction_id  TEXT,
      payment_reference    TEXT,
      notes                TEXT,
      created_at           TEXT    NOT NULL,
      created_by           TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_arph_ar ON epm_ar_payment_history(ar_id)`;
}

export async function addARPayment(
  input: Omit<ARPaymentHistoryItem, "id" | "created_at">
): Promise<ARPaymentHistoryItem> {
  const item: ARPaymentHistoryItem = {
    id: randomUUID(), ...input, created_at: new Date().toISOString(),
  };
  if (sql) {
    await sql`
      INSERT INTO epm_ar_payment_history
        (id, ar_id, payment_date, amount_paid, payment_method,
         bank_transaction_id, payment_reference, notes, created_at, created_by)
      VALUES
        (${item.id}, ${item.ar_id}, ${item.payment_date}, ${item.amount_paid},
         ${item.payment_method ?? null}, ${item.bank_transaction_id ?? null},
         ${item.payment_reference ?? null}, ${item.notes ?? null},
         ${item.created_at}, ${item.created_by ?? null})
    `;
  }
  return item;
}

export async function getARPaymentHistory(ar_id: string): Promise<ARPaymentHistoryItem[]> {
  if (sql) {
    const rows = await sql`
      SELECT * FROM epm_ar_payment_history
      WHERE ar_id = ${ar_id}
      ORDER BY payment_date DESC
    `;
    return rows.map((r) => ({
      id:                  String(r.id),
      ar_id:               String(r.ar_id),
      payment_date:        String(r.payment_date),
      amount_paid:         Number(r.amount_paid),
      payment_method:      r.payment_method      ? String(r.payment_method)      : undefined,
      bank_transaction_id: r.bank_transaction_id ? String(r.bank_transaction_id) : undefined,
      payment_reference:   r.payment_reference   ? String(r.payment_reference)   : undefined,
      notes:               r.notes               ? String(r.notes)               : undefined,
      created_at:          String(r.created_at),
      created_by:          r.created_by          ? String(r.created_by)          : undefined,
    }));
  }
  return [];
}

// ─── Revenue Recognition Schedule ────────────────────────────────────────────

export interface RevenueRecognitionScheduleItem {
  id:                     string;
  ar_id:                  string;
  total_amount:           number;
  recognition_start_date: string;
  recognition_end_date:   string;
  total_periods:          number;
  amount_per_period:      number;
  periods_recognized:     number;
  next_recognition_date?: string;
  status:                 "active" | "completed" | "cancelled";
  created_at:             string;
  updated_at?:            string;
}

export interface RevenueRecognitionEntryItem {
  id:                string;
  schedule_id:       string;
  recognition_date:  string;
  amount_recognized: number;
  gl_entry_id?:      string;
  created_at:        string;
}

export async function initRevenueScheduleDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_revenue_schedule (
      id                     TEXT    PRIMARY KEY,
      ar_id                  TEXT    NOT NULL REFERENCES epm_ar(id) ON DELETE CASCADE,
      total_amount           NUMERIC NOT NULL,
      recognition_start_date TEXT    NOT NULL,
      recognition_end_date   TEXT    NOT NULL,
      total_periods          INTEGER NOT NULL,
      amount_per_period      NUMERIC NOT NULL,
      periods_recognized     INTEGER NOT NULL DEFAULT 0,
      next_recognition_date  TEXT,
      status                 TEXT    NOT NULL DEFAULT 'active',
      created_at             TEXT    NOT NULL,
      updated_at             TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_rvsched_ar ON epm_revenue_schedule(ar_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_rvsched_status ON epm_revenue_schedule(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_revenue_schedule_entries (
      id                TEXT    PRIMARY KEY,
      schedule_id       TEXT    NOT NULL REFERENCES epm_revenue_schedule(id) ON DELETE CASCADE,
      recognition_date  TEXT    NOT NULL,
      amount_recognized NUMERIC NOT NULL,
      gl_entry_id       TEXT,
      created_at        TEXT    NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_rventry_sched ON epm_revenue_schedule_entries(schedule_id)`;
}

export async function createRevenueSchedule(
  input: Omit<RevenueRecognitionScheduleItem, "id" | "periods_recognized" | "status" | "created_at" | "updated_at">
): Promise<RevenueRecognitionScheduleItem> {
  const item: RevenueRecognitionScheduleItem = {
    id: randomUUID(), ...input,
    periods_recognized: 0,
    status: "active",
    created_at: new Date().toISOString(),
  };
  if (sql) {
    await sql`
      INSERT INTO epm_revenue_schedule
        (id, ar_id, total_amount, recognition_start_date, recognition_end_date,
         total_periods, amount_per_period, periods_recognized, next_recognition_date,
         status, created_at)
      VALUES
        (${item.id}, ${item.ar_id}, ${item.total_amount},
         ${item.recognition_start_date}, ${item.recognition_end_date},
         ${item.total_periods}, ${item.amount_per_period}, 0,
         ${item.next_recognition_date ?? null}, 'active', ${item.created_at})
    `;
  }
  return item;
}

export async function addRevenueScheduleEntry(
  input: Omit<RevenueRecognitionEntryItem, "id" | "created_at">
): Promise<RevenueRecognitionEntryItem> {
  const item: RevenueRecognitionEntryItem = {
    id: randomUUID(), ...input, created_at: new Date().toISOString(),
  };
  if (sql) {
    await sql`
      INSERT INTO epm_revenue_schedule_entries
        (id, schedule_id, recognition_date, amount_recognized, gl_entry_id, created_at)
      VALUES
        (${item.id}, ${item.schedule_id}, ${item.recognition_date},
         ${item.amount_recognized}, ${item.gl_entry_id ?? null}, ${item.created_at})
    `;
    const now = new Date().toISOString();
    await sql`
      UPDATE epm_revenue_schedule
      SET periods_recognized = periods_recognized + 1,
          updated_at = ${now},
          status = CASE
            WHEN periods_recognized + 1 >= total_periods THEN 'completed'
            ELSE status
          END
      WHERE id = ${item.schedule_id}
    `;
  }
  return item;
}

export async function getRevenueSchedules(ar_id: string): Promise<RevenueRecognitionScheduleItem[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM epm_revenue_schedule WHERE ar_id = ${ar_id} ORDER BY recognition_start_date
  `;
  return rows.map((r) => ({
    id:                     String(r.id),
    ar_id:                  String(r.ar_id),
    total_amount:           Number(r.total_amount),
    recognition_start_date: String(r.recognition_start_date),
    recognition_end_date:   String(r.recognition_end_date),
    total_periods:          Number(r.total_periods),
    amount_per_period:      Number(r.amount_per_period),
    periods_recognized:     Number(r.periods_recognized),
    next_recognition_date:  r.next_recognition_date ? String(r.next_recognition_date) : undefined,
    status:                 String(r.status) as RevenueRecognitionScheduleItem["status"],
    created_at:             String(r.created_at),
    updated_at:             r.updated_at ? String(r.updated_at) : undefined,
  }));
}

export async function getRevenueScheduleEntries(
  schedule_id: string
): Promise<RevenueRecognitionEntryItem[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM epm_revenue_schedule_entries
    WHERE schedule_id = ${schedule_id}
    ORDER BY recognition_date
  `;
  return rows.map((r) => ({
    id:                String(r.id),
    schedule_id:       String(r.schedule_id),
    recognition_date:  String(r.recognition_date),
    amount_recognized: Number(r.amount_recognized),
    gl_entry_id:       r.gl_entry_id ? String(r.gl_entry_id) : undefined,
    created_at:        String(r.created_at),
  }));
}

// ─── initAllAPARTables ────────────────────────────────────────────────────────

export async function initAllAPARTables(): Promise<void> {
  await initAPARDB();
  await initSuppliersDB();
  await initCustomersDB();
  await initCollectionsDB();
  await initContractsDB();
  await initCostCentersDB();
  await initRevenueRecognitionDB();
  await initBankTransactionsDB();
  await initARInstallmentsDB();
  await initARPaymentHistoryDB();
  await initRevenueScheduleDB();
}
