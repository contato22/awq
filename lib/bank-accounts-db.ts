// ─── AWQ Bank Accounts Tracker — Database Layer ───────────────────────────────
//
// Migrated from localStorage ("awq_bank_accounts") to Supabase Postgres.
// TABLES: bank_accounts_tracker, bank_account_transactions
// (see awq_venture_full_schema.sql)

import { sql } from "./db";
import { randomUUID } from "crypto";

export interface BankAccountTransaction {
  id:          string;
  date:        string;
  description: string;
  amount:      number;
  category:    string;
  balance?:    number;
  original?:   string;
}

export interface BankAccount {
  id:             string;
  bank:           string;
  name:           string;
  color:          string;
  currentBalance: number;
  lastUpdated:    string;
  entity?:        string;
  transactions:   BankAccountTransaction[];
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

let _ready = false;

async function ensureTables(): Promise<boolean> {
  if (!sql) return false;
  if (_ready) return true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS bank_accounts_tracker (
        id              TEXT PRIMARY KEY,
        bank            TEXT NOT NULL,
        name            TEXT NOT NULL,
        color           TEXT,
        current_balance NUMERIC NOT NULL DEFAULT 0,
        last_updated    TEXT,
        entity          TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bank_account_transactions (
        id          TEXT PRIMARY KEY,
        account_id  TEXT NOT NULL REFERENCES bank_accounts_tracker(id) ON DELETE CASCADE,
        date        TEXT NOT NULL,
        description TEXT NOT NULL,
        amount      NUMERIC NOT NULL,
        category    TEXT,
        balance     NUMERIC,
        original    TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_bat_account_id ON bank_account_transactions(account_id)`;
    _ready = true;
    return true;
  } catch { return false; }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToTxn(r: Record<string, unknown>): BankAccountTransaction {
  return {
    id:          r.id as string,
    date:        r.date as string,
    description: r.description as string,
    amount:      Number(r.amount),
    category:    (r.category as string) ?? "",
    balance:     r.balance !== null ? Number(r.balance) : undefined,
    original:    (r.original as string | null) ?? undefined,
  };
}

function rowToAccount(r: Record<string, unknown>, txns: BankAccountTransaction[]): BankAccount {
  return {
    id:             r.id as string,
    bank:           r.bank as string,
    name:           r.name as string,
    color:          (r.color as string) ?? "bg-gray-600",
    currentBalance: Number(r.current_balance ?? 0),
    lastUpdated:    (r.last_updated as string) ?? new Date().toISOString(),
    entity:         (r.entity as string | null) ?? undefined,
    transactions:   txns,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getBankAccounts(): Promise<BankAccount[]> {
  const ok = await ensureTables();
  if (!ok || !sql) return [];

  const accountRows = await sql`SELECT * FROM bank_accounts_tracker ORDER BY created_at`;
  const txnRows     = await sql`SELECT * FROM bank_account_transactions ORDER BY date DESC`;

  return accountRows.map((a) => {
    const txns = txnRows
      .filter((t) => t.account_id === a.id)
      .map(rowToTxn);
    return rowToAccount(a, txns);
  });
}

export async function saveBankAccount(account: BankAccount): Promise<void> {
  const ok = await ensureTables();
  if (!ok || !sql) return;

  await sql`
    INSERT INTO bank_accounts_tracker (id, bank, name, color, current_balance, last_updated, entity)
    VALUES (${account.id}, ${account.bank}, ${account.name}, ${account.color},
            ${account.currentBalance}, ${account.lastUpdated}, ${account.entity ?? null})
    ON CONFLICT (id) DO UPDATE SET
      bank            = EXCLUDED.bank,
      name            = EXCLUDED.name,
      color           = EXCLUDED.color,
      current_balance = EXCLUDED.current_balance,
      last_updated    = EXCLUDED.last_updated,
      entity          = EXCLUDED.entity,
      updated_at      = NOW()
  `;

  // Sync transactions: delete all then re-insert (simple, low volume)
  await sql`DELETE FROM bank_account_transactions WHERE account_id = ${account.id}`;
  for (const t of account.transactions) {
    await sql`
      INSERT INTO bank_account_transactions
        (id, account_id, date, description, amount, category, balance, original)
      VALUES
        (${t.id}, ${account.id}, ${t.date}, ${t.description}, ${t.amount},
         ${t.category ?? null}, ${t.balance ?? null}, ${t.original ?? null})
    `;
  }
}

export async function deleteBankAccount(id: string): Promise<void> {
  const ok = await ensureTables();
  if (!ok || !sql) return;
  await sql`DELETE FROM bank_accounts_tracker WHERE id = ${id}`;
}

export function newAccountId(): string { return randomUUID(); }
export function newTxnId():     string { return randomUUID(); }
