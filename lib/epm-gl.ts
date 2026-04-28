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
export { AccountType, BuCode, AccountRef, CHART_OF_ACCOUNTS } from "./epm-gl-constants";
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

// ─── Persistence (JSON file — works in both static and SSR mode) ──────────────

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

// ─── Period helper ────────────────────────────────────────────────────────────

function dateToPeriodCode(date: string): string {
  // date = YYYY-MM-DD → YYYY-MM
  return date.slice(0, 7);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return all GL entries, newest first. */
export function getAllGLEntries(): GLEntry[] {
  const store = readStore();
  return [...store.entries].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
}

/** Return GL entries filtered by optional bu_code and/or period_code. */
export function getGLEntries(filters?: {
  bu_code?:     BuCode;
  period_code?: string;
  account_code?: string;
}): GLEntry[] {
  let entries = getAllGLEntries();
  if (filters?.bu_code)     entries = entries.filter((e) => e.bu_code     === filters.bu_code);
  if (filters?.period_code) entries = entries.filter((e) => e.period_code === filters.period_code);
  if (filters?.account_code)entries = entries.filter((e) => e.account_code === filters.account_code);
  return entries;
}

/** Return unique journal groups with their two legs balanced. */
export function getJournals(): { journal_id: string; debit: GLEntry; credit: GLEntry; balanced: boolean }[] {
  const entries = getAllGLEntries();
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
export function addJournalEntry(input: NewJournalInput): { debit: GLEntry; credit: GLEntry } {
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

  const store = readStore();
  store.entries.push(debitEntry, creditEntry);
  writeStore(store);

  return { debit: debitEntry, credit: creditEntry };
}

/** Trial balance for a given period (or all periods if none specified). */
export interface TrialBalanceLine {
  account_code:  string;
  account_name:  string;
  account_type:  AccountType;
  total_debits:  number;
  total_credits: number;
  net_balance:   number;
}

export function getTrialBalance(filters?: {
  bu_code?:     BuCode;
  period_code?: string;
}): TrialBalanceLine[] {
  const entries = getGLEntries(filters);
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

/** Balance sheet snapshot: asset total, liability total, equity total. */
export interface BalanceSheetSummary {
  hasData:        boolean;
  totalAssets:    number;
  totalLiabilities: number;
  totalEquity:    number;
  isBalanced:     boolean;   // Assets = Liabilities + Equity
  lines:          TrialBalanceLine[];
}

export function getBalanceSheet(filters?: { bu_code?: BuCode; period_code?: string }): BalanceSheetSummary {
  const tb = getTrialBalance(filters);
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

/** Simple P&L from GL entries. Uses account_type to classify. */
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

export function getPLFromGL(filters?: { bu_code?: BuCode; period_code?: string }): PLSummary {
  const tb = getTrialBalance(filters);

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
