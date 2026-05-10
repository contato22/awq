// ─── EPM General Ledger — Data Access Layer ──────────────────────────────────
//
// Double-entry bookkeeping: every journal_id must have SUM(debit) = SUM(credit).
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (epm_gl_entries table)
//   DATABASE_URL unset → public/data/epm-gl.json (static/dev fallback)
//
// DO NOT import in client components.

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { sql } from "./db";
export type { AccountType, BuCode, AccountRef } from "./epm-gl-constants";
export { CHART_OF_ACCOUNTS } from "./epm-gl-constants";
import type { AccountType, BuCode, AccountRef } from "./epm-gl-constants";
import { CHART_OF_ACCOUNTS } from "./epm-gl-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GLEntry {
  gl_id:            string;
  journal_id:       string;
  transaction_date: string;
  period_code:      string;
  bu_code:          BuCode;
  account_code:     string;
  account_name:     string;
  account_type:     AccountType;
  debit_amount:     number;
  credit_amount:    number;
  description:      string;
  reference_doc?:   string;
  source_system:    "manual" | "bank_import" | "ap_payment" | "ar_receipt";
  is_intercompany:  boolean;
  created_at:       string;
  created_by?:      string;
}

export interface NewJournalInput {
  transaction_date: string;
  bu_code:          BuCode;
  description:      string;
  reference_doc?:   string;
  source_system?:   GLEntry["source_system"];
  created_by?:      string;
  debit_account_code:  string;
  debit_amount:        number;
  credit_account_code: string;
  credit_amount:       number;
}

export interface GLStore {
  entries:       GLEntry[];
  accounts:      AccountRef[];
  last_updated:  string;
}

const ACCOUNT_MAP = new Map(CHART_OF_ACCOUNTS.map((a) => [a.account_code, a]));

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

let _glReady = false;

export async function initGlDB(): Promise<void> {
  if (!sql || _glReady) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS epm_gl_entries (
        gl_id            TEXT PRIMARY KEY,
        journal_id       TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        period_code      TEXT NOT NULL,
        bu_code          TEXT NOT NULL,
        account_code     TEXT NOT NULL,
        account_name     TEXT NOT NULL,
        account_type     TEXT NOT NULL,
        debit_amount     NUMERIC NOT NULL DEFAULT 0,
        credit_amount    NUMERIC NOT NULL DEFAULT 0,
        description      TEXT NOT NULL,
        reference_doc    TEXT,
        source_system    TEXT NOT NULL DEFAULT 'manual',
        is_intercompany  BOOLEAN NOT NULL DEFAULT false,
        created_at       TEXT NOT NULL,
        created_by       TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_gl_journal_id ON epm_gl_entries(journal_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gl_bu_period  ON epm_gl_entries(bu_code, period_code)`;
    _glReady = true;
  } catch { /* DB unavailable — fallback to JSON */ }
}

// ─── JSON file fallback ───────────────────────────────────────────────────────

const GL_FILE = path.join(process.cwd(), "public", "data", "epm-gl.json");

function ensureDir() {
  const dir = path.dirname(GL_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): GLStore {
  ensureDir();
  if (!fs.existsSync(GL_FILE)) {
    return { entries: [], accounts: CHART_OF_ACCOUNTS, last_updated: new Date().toISOString() };
  }
  try {
    return JSON.parse(fs.readFileSync(GL_FILE, "utf-8")) as GLStore;
  } catch {
    return { entries: [], accounts: CHART_OF_ACCOUNTS, last_updated: new Date().toISOString() };
  }
}

function writeStore(store: GLStore) {
  ensureDir();
  store.last_updated = new Date().toISOString();
  fs.writeFileSync(GL_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToGLEntry(r: Record<string, unknown>): GLEntry {
  return {
    gl_id:            r.gl_id as string,
    journal_id:       r.journal_id as string,
    transaction_date: r.transaction_date as string,
    period_code:      r.period_code as string,
    bu_code:          r.bu_code as BuCode,
    account_code:     r.account_code as string,
    account_name:     r.account_name as string,
    account_type:     r.account_type as AccountType,
    debit_amount:     Number(r.debit_amount ?? 0),
    credit_amount:    Number(r.credit_amount ?? 0),
    description:      r.description as string,
    reference_doc:    (r.reference_doc as string) ?? undefined,
    source_system:    (r.source_system as GLEntry["source_system"]) ?? "manual",
    is_intercompany:  Boolean(r.is_intercompany),
    created_at:       r.created_at as string,
    created_by:       (r.created_by as string) ?? undefined,
  };
}

// ─── Period helper ────────────────────────────────────────────────────────────

function dateToPeriodCode(date: string): string {
  return date.slice(0, 7);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllGLEntries(): Promise<GLEntry[]> {
  await initGlDB();
  if (sql) {
    const rows = await sql`SELECT * FROM epm_gl_entries ORDER BY transaction_date DESC, created_at DESC`;
    return rows.map(rowToGLEntry);
  }
  const store = readStore();
  return [...store.entries].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
}

export async function getGLEntries(filters?: {
  bu_code?:      BuCode;
  period_code?:  string;
  account_code?: string;
}): Promise<GLEntry[]> {
  await initGlDB();
  if (sql) {
    const rows = await sql`
      SELECT * FROM epm_gl_entries
      WHERE (${filters?.bu_code     ?? null}::text IS NULL OR bu_code     = ${filters?.bu_code     ?? null})
        AND (${filters?.period_code ?? null}::text IS NULL OR period_code = ${filters?.period_code ?? null})
        AND (${filters?.account_code ?? null}::text IS NULL OR account_code = ${filters?.account_code ?? null})
      ORDER BY transaction_date DESC, created_at DESC
    `;
    return rows.map(rowToGLEntry);
  }
  let entries = await getAllGLEntries();
  if (filters?.bu_code)      entries = entries.filter((e) => e.bu_code      === filters.bu_code);
  if (filters?.period_code)  entries = entries.filter((e) => e.period_code  === filters.period_code);
  if (filters?.account_code) entries = entries.filter((e) => e.account_code === filters.account_code);
  return entries;
}

export async function getJournals(): Promise<{ journal_id: string; debit: GLEntry; credit: GLEntry; balanced: boolean }[]> {
  const entries = await getAllGLEntries();
  const map = new Map<string, GLEntry[]>();
  for (const e of entries) {
    const legs = map.get(e.journal_id) ?? [];
    legs.push(e);
    map.set(e.journal_id, legs);
  }
  const result: { journal_id: string; debit: GLEntry; credit: GLEntry; balanced: boolean }[] = [];
  for (const [journal_id, legs] of Array.from(map)) {
    const debit  = legs.find((l) => l.debit_amount  > 0);
    const credit = legs.find((l) => l.credit_amount > 0);
    if (!debit || !credit) continue;
    const totalDebit  = legs.reduce((s, l) => s + l.debit_amount, 0);
    const totalCredit = legs.reduce((s, l) => s + l.credit_amount, 0);
    result.push({ journal_id, debit, credit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  }
  return result.sort((a, b) => b.debit.transaction_date.localeCompare(a.debit.transaction_date));
}

export async function addJournalEntry(input: NewJournalInput): Promise<{ debit: GLEntry; credit: GLEntry }> {
  await initGlDB();

  if (Math.abs(input.debit_amount - input.credit_amount) > 0.005) {
    throw new Error(`Journal unbalanced: debit ${input.debit_amount} ≠ credit ${input.credit_amount}`);
  }

  const debitAccount  = ACCOUNT_MAP.get(input.debit_account_code);
  const creditAccount = ACCOUNT_MAP.get(input.credit_account_code);
  if (!debitAccount)  throw new Error(`Unknown account: ${input.debit_account_code}`);
  if (!creditAccount) throw new Error(`Unknown account: ${input.credit_account_code}`);

  const journal_id  = randomUUID();
  const created_at  = new Date().toISOString();
  const period_code = dateToPeriodCode(input.transaction_date);
  const source      = input.source_system ?? "manual";

  const debitEntry: GLEntry = {
    gl_id: randomUUID(), journal_id,
    transaction_date: input.transaction_date, period_code,
    bu_code: input.bu_code,
    account_code: debitAccount.account_code, account_name: debitAccount.account_name,
    account_type: debitAccount.account_type,
    debit_amount: input.debit_amount, credit_amount: 0,
    description: input.description, reference_doc: input.reference_doc,
    source_system: source,
    is_intercompany: debitAccount.account_type === "INTERCOMPANY",
    created_at, created_by: input.created_by,
  };

  const creditEntry: GLEntry = {
    gl_id: randomUUID(), journal_id,
    transaction_date: input.transaction_date, period_code,
    bu_code: input.bu_code,
    account_code: creditAccount.account_code, account_name: creditAccount.account_name,
    account_type: creditAccount.account_type,
    debit_amount: 0, credit_amount: input.credit_amount,
    description: input.description, reference_doc: input.reference_doc,
    source_system: source,
    is_intercompany: creditAccount.account_type === "INTERCOMPANY",
    created_at, created_by: input.created_by,
  };

  if (sql) {
    const insertEntry = async (e: GLEntry) => sql!`
      INSERT INTO epm_gl_entries
        (gl_id, journal_id, transaction_date, period_code, bu_code,
         account_code, account_name, account_type, debit_amount, credit_amount,
         description, reference_doc, source_system, is_intercompany, created_at, created_by)
      VALUES
        (${e.gl_id}, ${e.journal_id}, ${e.transaction_date}, ${e.period_code}, ${e.bu_code},
         ${e.account_code}, ${e.account_name}, ${e.account_type}, ${e.debit_amount}, ${e.credit_amount},
         ${e.description}, ${e.reference_doc ?? null}, ${e.source_system}, ${e.is_intercompany},
         ${e.created_at}, ${e.created_by ?? null})
    `;
    await Promise.all([insertEntry(debitEntry), insertEntry(creditEntry)]);
    return { debit: debitEntry, credit: creditEntry };
  }

  const store = readStore();
  store.entries.push(debitEntry, creditEntry);
  writeStore(store);
  return { debit: debitEntry, credit: creditEntry };
}

// ─── Derived views (computed from entries) ────────────────────────────────────

export interface TrialBalanceLine {
  account_code:  string;
  account_name:  string;
  account_type:  AccountType;
  total_debits:  number;
  total_credits: number;
  net_balance:   number;
}

export async function getTrialBalance(filters?: {
  bu_code?:     BuCode;
  period_code?: string;
}): Promise<TrialBalanceLine[]> {
  const entries = await getGLEntries(filters);
  const map = new Map<string, { debit: number; credit: number; account: AccountRef }>();
  for (const e of entries) {
    const acc = ACCOUNT_MAP.get(e.account_code);
    if (!acc) continue;
    const row = map.get(e.account_code) ?? { debit: 0, credit: 0, account: acc };
    row.debit  += e.debit_amount;
    row.credit += e.credit_amount;
    map.set(e.account_code, row);
  }
  return Array.from(map.values())
    .map(({ debit, credit, account }) => ({
      account_code:  account.account_code,
      account_name:  account.account_name,
      account_type:  account.account_type,
      total_debits:  debit,
      total_credits: credit,
      net_balance:   debit - credit,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));
}

export interface BalanceSheetSummary {
  hasData:          boolean;
  totalAssets:      number;
  totalLiabilities: number;
  totalEquity:      number;
  isBalanced:       boolean;
  lines:            TrialBalanceLine[];
}

export async function getBalanceSheet(filters?: { bu_code?: BuCode; period_code?: string }): Promise<BalanceSheetSummary> {
  const tb = await getTrialBalance(filters);
  const bsLines = tb.filter((l) => ["ASSET", "LIABILITY", "EQUITY"].includes(l.account_type));

  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;
  for (const line of bsLines) {
    const acc = ACCOUNT_MAP.get(line.account_code);
    const balance = acc?.normal_balance === "DEBIT"
      ? line.total_debits - line.total_credits
      : line.total_credits - line.total_debits;
    if (line.account_type === "ASSET")     totalAssets      += balance;
    if (line.account_type === "LIABILITY") totalLiabilities += balance;
    if (line.account_type === "EQUITY")    totalEquity      += balance;
  }

  return {
    hasData:          bsLines.length > 0,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced:       Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    lines:            bsLines,
  };
}

export interface PLSummary {
  hasData:            boolean;
  totalRevenue:       number;
  totalCOGS:          number;
  grossProfit:        number;
  grossMarginPct:     number | null;
  totalOPEX:          number;
  ebitda:             number;
  ebitdaMarginPct:    number | null;
  financialExpenses:  number;
  netResult:          number;
  netMarginPct:       number | null;
}

export async function getPLFromGL(filters?: { bu_code?: BuCode; period_code?: string }): Promise<PLSummary> {
  const tb = await getTrialBalance(filters);

  let totalRevenue = 0, totalCOGS = 0, totalOPEX = 0, financialExpenses = 0;
  for (const line of tb) {
    const acc = ACCOUNT_MAP.get(line.account_code);
    const signed = acc?.normal_balance === "CREDIT"
      ? line.total_credits - line.total_debits
      : line.total_debits  - line.total_credits;
    if (["REVENUE", "FINANCIAL_REVENUE"].includes(line.account_type)) totalRevenue      += signed;
    if (line.account_type === "COGS")              totalCOGS         += signed;
    if (line.account_type === "EXPENSE")           totalOPEX         += signed;
    if (line.account_type === "FINANCIAL_EXPENSE") financialExpenses += signed;
  }

  const grossProfit = totalRevenue - totalCOGS;
  const ebitda      = grossProfit - totalOPEX;
  const netResult   = ebitda - financialExpenses;

  return {
    hasData:         tb.length > 0,
    totalRevenue,
    totalCOGS,
    grossProfit,
    grossMarginPct:  totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : null,
    totalOPEX,
    ebitda,
    ebitdaMarginPct: totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : null,
    financialExpenses,
    netResult,
    netMarginPct:    totalRevenue > 0 ? (netResult / totalRevenue) * 100 : null,
  };
}
