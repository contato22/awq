// ─── EPM General Ledger — Data Access Layer ──────────────────────────────────
//
// Manages GL journal entries stored in public/data/epm-gl.json (static/dev mode)
// or Neon PostgreSQL (production via DATABASE_URL).
//
// Double-entry bookkeeping: every journal_id must have SUM(debit) = SUM(credit).
// This layer enforces that constraint on write.
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
  journal_id:       string;   // groups the two legs of one journal
  transaction_date: string;   // ISO date YYYY-MM-DD
  period_code:      string;   // e.g. '2026-03'
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
  /** Debit leg */
  debit_account_code:  string;
  debit_amount:        number;
  /** Credit leg */
  credit_account_code: string;
  credit_amount:       number;
}

export interface GLStore {
  entries:       GLEntry[];
  accounts:      AccountRef[];
  last_updated:  string;
}

const ACCOUNT_MAP = new Map(CHART_OF_ACCOUNTS.map((a) => [a.account_code, a]));

// ─── DB schema init ───────────────────────────────────────────────────────────

export async function initGLDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_gl (
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
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_gl_journal_id    ON epm_gl(journal_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_gl_bu_code       ON epm_gl(bu_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_gl_period_code   ON epm_gl(period_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_epm_gl_account_code  ON epm_gl(account_code)`;
}

// ─── JSON file persistence (fallback when no DATABASE_URL) ───────────────────

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

// ─── Row normalizer (DB rows → GLEntry) ──────────────────────────────────────

function rowToEntry(r: Record<string, unknown>): GLEntry {
  return {
    gl_id:            String(r.gl_id),
    journal_id:       String(r.journal_id),
    transaction_date: String(r.transaction_date),
    period_code:      String(r.period_code),
    bu_code:          String(r.bu_code) as BuCode,
    account_code:     String(r.account_code),
    account_name:     String(r.account_name),
    account_type:     String(r.account_type) as AccountType,
    debit_amount:     Number(r.debit_amount),
    credit_amount:    Number(r.credit_amount),
    description:      String(r.description),
    reference_doc:    r.reference_doc ? String(r.reference_doc) : undefined,
    source_system:    String(r.source_system) as GLEntry["source_system"],
    is_intercompany:  Boolean(r.is_intercompany),
    created_at:       String(r.created_at),
    created_by:       r.created_by ? String(r.created_by) : undefined,
  };
}

// ─── Period helper ────────────────────────────────────────────────────────────

function dateToPeriodCode(date: string): string {
  return date.slice(0, 7);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return all GL entries, newest first. */
export async function getAllGLEntries(): Promise<GLEntry[]> {
  if (sql) {
    const rows = await sql`SELECT * FROM epm_gl ORDER BY transaction_date DESC, created_at DESC`;
    return (rows as Record<string, unknown>[]).map(rowToEntry);
  }
  const store = readStore();
  return [...store.entries].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
}

/** Return GL entries filtered by optional bu_code and/or period_code. */
export async function getGLEntries(filters?: {
  bu_code?:      BuCode;
  period_code?:  string;
  account_code?: string;
}): Promise<GLEntry[]> {
  if (sql) {
    const bu      = filters?.bu_code      ?? null;
    const period  = filters?.period_code  ?? null;
    const account = filters?.account_code ?? null;

    let rows: Record<string, unknown>[];
    if (bu && period && account) {
      rows = await sql`SELECT * FROM epm_gl WHERE bu_code=${bu} AND period_code=${period} AND account_code=${account} ORDER BY transaction_date DESC`;
    } else if (bu && period) {
      rows = await sql`SELECT * FROM epm_gl WHERE bu_code=${bu} AND period_code=${period} ORDER BY transaction_date DESC`;
    } else if (bu && account) {
      rows = await sql`SELECT * FROM epm_gl WHERE bu_code=${bu} AND account_code=${account} ORDER BY transaction_date DESC`;
    } else if (period && account) {
      rows = await sql`SELECT * FROM epm_gl WHERE period_code=${period} AND account_code=${account} ORDER BY transaction_date DESC`;
    } else if (bu) {
      rows = await sql`SELECT * FROM epm_gl WHERE bu_code=${bu} ORDER BY transaction_date DESC`;
    } else if (period) {
      rows = await sql`SELECT * FROM epm_gl WHERE period_code=${period} ORDER BY transaction_date DESC`;
    } else if (account) {
      rows = await sql`SELECT * FROM epm_gl WHERE account_code=${account} ORDER BY transaction_date DESC`;
    } else {
      rows = await sql`SELECT * FROM epm_gl ORDER BY transaction_date DESC`;
    }
    return (rows as Record<string, unknown>[]).map(rowToEntry);
  }

  let entries = await getAllGLEntries();
  if (filters?.bu_code)      entries = entries.filter((e) => e.bu_code      === filters.bu_code);
  if (filters?.period_code)  entries = entries.filter((e) => e.period_code  === filters.period_code);
  if (filters?.account_code) entries = entries.filter((e) => e.account_code === filters.account_code);
  return entries;
}

/** Return unique journal groups with their two legs balanced. */
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

/** Add a double-entry journal. Throws if amounts don't match or account unknown. */
export async function addJournalEntry(input: NewJournalInput): Promise<{ debit: GLEntry; credit: GLEntry }> {
  if (Math.abs(input.debit_amount - input.credit_amount) > 0.005) {
    throw new Error(`Journal unbalanced: debit ${input.debit_amount} ≠ credit ${input.credit_amount}`);
  }

  const debitAccount  = ACCOUNT_MAP.get(input.debit_account_code);
  const creditAccount = ACCOUNT_MAP.get(input.credit_account_code);

  if (!debitAccount)  throw new Error(`Unknown account: ${input.debit_account_code}`);
  if (!creditAccount) throw new Error(`Unknown account: ${input.credit_account_code}`);

  const journal_id   = randomUUID();
  const created_at   = new Date().toISOString();
  const period_code  = dateToPeriodCode(input.transaction_date);
  const source       = input.source_system ?? "manual";

  const debitEntry: GLEntry = {
    gl_id:            randomUUID(),
    journal_id,
    transaction_date: input.transaction_date,
    period_code,
    bu_code:          input.bu_code,
    account_code:     debitAccount.account_code,
    account_name:     debitAccount.account_name,
    account_type:     debitAccount.account_type,
    debit_amount:     input.debit_amount,
    credit_amount:    0,
    description:      input.description,
    reference_doc:    input.reference_doc,
    source_system:    source,
    is_intercompany:  debitAccount.account_type === "INTERCOMPANY",
    created_at,
    created_by:       input.created_by,
  };

  const creditEntry: GLEntry = {
    gl_id:            randomUUID(),
    journal_id,
    transaction_date: input.transaction_date,
    period_code,
    bu_code:          input.bu_code,
    account_code:     creditAccount.account_code,
    account_name:     creditAccount.account_name,
    account_type:     creditAccount.account_type,
    debit_amount:     0,
    credit_amount:    input.credit_amount,
    description:      input.description,
    reference_doc:    input.reference_doc,
    source_system:    source,
    is_intercompany:  creditAccount.account_type === "INTERCOMPANY",
    created_at,
    created_by:       input.created_by,
  };

  if (sql) {
    await sql`
      INSERT INTO epm_gl
        (gl_id, journal_id, transaction_date, period_code, bu_code,
         account_code, account_name, account_type, debit_amount, credit_amount,
         description, reference_doc, source_system, is_intercompany, created_at, created_by)
      VALUES
        (${debitEntry.gl_id}, ${journal_id}, ${input.transaction_date}, ${period_code}, ${input.bu_code},
         ${debitEntry.account_code}, ${debitEntry.account_name}, ${debitEntry.account_type},
         ${debitEntry.debit_amount}, ${debitEntry.credit_amount},
         ${input.description}, ${input.reference_doc ?? null}, ${source},
         ${debitEntry.is_intercompany}, ${created_at}, ${input.created_by ?? null})
    `;
    await sql`
      INSERT INTO epm_gl
        (gl_id, journal_id, transaction_date, period_code, bu_code,
         account_code, account_name, account_type, debit_amount, credit_amount,
         description, reference_doc, source_system, is_intercompany, created_at, created_by)
      VALUES
        (${creditEntry.gl_id}, ${journal_id}, ${input.transaction_date}, ${period_code}, ${input.bu_code},
         ${creditEntry.account_code}, ${creditEntry.account_name}, ${creditEntry.account_type},
         ${creditEntry.debit_amount}, ${creditEntry.credit_amount},
         ${input.description}, ${input.reference_doc ?? null}, ${source},
         ${creditEntry.is_intercompany}, ${created_at}, ${input.created_by ?? null})
    `;
  } else {
    const store = readStore();
    store.entries.push(debitEntry, creditEntry);
    writeStore(store);
  }

  return { debit: debitEntry, credit: creditEntry };
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

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

// ─── Balance Sheet ────────────────────────────────────────────────────────────

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
  const bsLines = tb.filter((l) => ["ASSET","LIABILITY","EQUITY"].includes(l.account_type));

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

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

// ─── P&L from GL ─────────────────────────────────────────────────────────────

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

  let totalRevenue      = 0;
  let totalCOGS         = 0;
  let totalOPEX         = 0;
  let financialExpenses = 0;

  for (const line of tb) {
    const acc = ACCOUNT_MAP.get(line.account_code);
    const signed = acc?.normal_balance === "CREDIT"
      ? line.total_credits - line.total_debits
      : line.total_debits  - line.total_credits;

    if (["REVENUE","FINANCIAL_REVENUE"].includes(line.account_type)) totalRevenue      += signed;
    if (line.account_type === "COGS")              totalCOGS         += signed;
    if (line.account_type === "EXPENSE")           totalOPEX         += signed;
    if (line.account_type === "FINANCIAL_EXPENSE") financialExpenses += signed;
  }

  const grossProfit = totalRevenue - totalCOGS;
  const ebitda      = grossProfit - totalOPEX;
  const netResult   = ebitda - financialExpenses;

  return {
    hasData:            tb.length > 0,
    totalRevenue,
    totalCOGS,
    grossProfit,
    grossMarginPct:     totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : null,
    totalOPEX,
    ebitda,
    ebitdaMarginPct:    totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : null,
    financialExpenses,
    netResult,
    netMarginPct:       totalRevenue > 0 ? (netResult / totalRevenue) * 100 : null,
  };
}
