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

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountType =
  | "ASSET" | "LIABILITY" | "EQUITY"
  | "REVENUE" | "COGS" | "EXPENSE"
  | "FINANCIAL_REVENUE" | "FINANCIAL_EXPENSE"
  | "INTERCOMPANY";

export type BuCode = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE";

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

export interface AccountRef {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: "DEBIT" | "CREDIT";
  level:        number;
}

// ─── Chart of Accounts (embedded — mirrors awq_epm_full_schema.sql) ───────────

export const CHART_OF_ACCOUNTS: AccountRef[] = [
  { account_code: "1.1.01", account_name: "Caixa e Equivalentes",            account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.1.02", account_name: "Contas a Receber",                 account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.1.03", account_name: "Adiantamentos a Fornecedores",     account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.1.04", account_name: "Outros Créditos Circulantes",      account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.2.01", account_name: "Imobilizado (líquido)",            account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.2.02", account_name: "Intangível (líquido)",             account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "1.2.03", account_name: "Investimentos / Aplicações LP",    account_type: "ASSET",              normal_balance: "DEBIT",  level: 3 },
  { account_code: "2.1.01", account_name: "Fornecedores (Contas a Pagar)",    account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.1.02", account_name: "Obrigações Fiscais",               account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.1.03", account_name: "Obrigações Trabalhistas",          account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.1.04", account_name: "Outros Passivos Circulantes",      account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "2.2.01", account_name: "Empréstimos e Financiamentos LP",  account_type: "LIABILITY",          normal_balance: "CREDIT", level: 3 },
  { account_code: "3.1.01", account_name: "Capital Social",                   account_type: "EQUITY",             normal_balance: "CREDIT", level: 3 },
  { account_code: "3.1.02", account_name: "Reservas de Lucros",               account_type: "EQUITY",             normal_balance: "CREDIT", level: 3 },
  { account_code: "3.1.03", account_name: "Lucros / Prejuízos Acumulados",    account_type: "EQUITY",             normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.01", account_name: "Receita de Serviços (JACQES)",     account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.02", account_name: "Receita de Produção (Caza Vision)",account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.03", account_name: "Receita de Consultoria (Advisor)", account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.04", account_name: "Fee de Gestão (Venture)",          account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.1.05", account_name: "Outras Receitas de Serviços",      account_type: "REVENUE",            normal_balance: "CREDIT", level: 3 },
  { account_code: "4.2.01", account_name: "Rendimentos de Aplicações",        account_type: "FINANCIAL_REVENUE",  normal_balance: "CREDIT", level: 3 },
  { account_code: "4.2.02", account_name: "Ajustes e Créditos Bancários",     account_type: "FINANCIAL_REVENUE",  normal_balance: "CREDIT", level: 3 },
  { account_code: "5.1.01", account_name: "Freelancers e Terceiros",          account_type: "COGS",               normal_balance: "DEBIT",  level: 3 },
  { account_code: "5.1.02", account_name: "Fornecedor Operacional",           account_type: "COGS",               normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.01", account_name: "Salários e Encargos",              account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.02", account_name: "Pró-labore / Retirada do Sócio",   account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.03", account_name: "Impostos e Tributos",              account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.04", account_name: "Tarifa Bancária",                  account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.05", account_name: "Software e Assinaturas",           account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.06", account_name: "Aluguel e Locação",                account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.07", account_name: "Energia / Água / Internet",        account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.1.08", account_name: "Serviços Contábeis / Jurídicos",   account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.2.01", account_name: "Marketing e Mídia Paga",           account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.2.02", account_name: "Comissões de Venda",               account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.01", account_name: "Deslocamento e Combustível",       account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.02", account_name: "Alimentação e Representação",      account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.03", account_name: "Viagem e Hospedagem",              account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.04", account_name: "Compras via Cartão Corporativo",   account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "6.3.05", account_name: "Despesas Pessoais Mistas",         account_type: "EXPENSE",            normal_balance: "DEBIT",  level: 3 },
  { account_code: "7.1.01", account_name: "Juros / Multa / IOF",              account_type: "FINANCIAL_EXPENSE",  normal_balance: "DEBIT",  level: 3 },
  { account_code: "9.1.01", account_name: "AR Intercompany — JACQES",         account_type: "INTERCOMPANY",       normal_balance: "DEBIT",  level: 3 },
  { account_code: "9.1.02", account_name: "AR Intercompany — Caza Vision",    account_type: "INTERCOMPANY",       normal_balance: "DEBIT",  level: 3 },
  { account_code: "9.2.01", account_name: "AP Intercompany — AWQ Holding",    account_type: "INTERCOMPANY",       normal_balance: "CREDIT", level: 3 },
];

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
