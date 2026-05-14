// ─── AWQ Database Client — Supabase Postgres (direct) ────────────────────────
//
// Used by modules that require raw SQL (bpm-db, crm-db, jacqes-crm-db, ma-db).
// Modules migrated to supabase.from() (financial-db, advisor-db, caza-db, ppm-db)
// import from lib/supabase.ts instead and do NOT use this client.
//
// DATABASE_URL must be the Supabase direct connection string:
//   postgresql://postgres:[PASSWORD]@db.gqkgsoglgubmaborixfb.supabase.co:5432/postgres
//
// Falls back to null when absent — each module has its own seed/json fallback.
//
// USAGE:
//   import { sql, initDB } from "@/lib/db";
//   if (sql) { const rows = await sql`SELECT 1`; }

import postgres, { type Sql } from "postgres";

// Exported null-safe SQL client. null = no DATABASE_URL = use local fallback.
export const sql: Sql | null = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: "require", max: 5 })
  : null;

export const USE_DB   = !!process.env.DATABASE_URL;
export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// ─── Schema bootstrap ─────────────────────────────────────────────────────────
// Idempotent — safe to call on every cold start.

export async function initDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS financial_documents (
      id                  TEXT PRIMARY KEY,
      filename            TEXT NOT NULL,
      file_hash           TEXT NOT NULL UNIQUE,
      bank                TEXT NOT NULL,
      account_name        TEXT NOT NULL,
      account_number      TEXT,
      entity              TEXT NOT NULL,
      period_start        TEXT,
      period_end          TEXT,
      opening_balance     NUMERIC,
      closing_balance     NUMERIC,
      uploaded_at         TEXT NOT NULL,
      uploaded_by         TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'received',
      error_message       TEXT,
      transaction_count   INTEGER NOT NULL DEFAULT 0,
      parser_confidence   TEXT,
      extraction_notes    TEXT,
      blob_url            TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id                          TEXT PRIMARY KEY,
      document_id                 TEXT NOT NULL REFERENCES financial_documents(id),
      bank                        TEXT NOT NULL,
      account_name                TEXT NOT NULL,
      entity                      TEXT NOT NULL,
      transaction_date            TEXT NOT NULL,
      description_original        TEXT NOT NULL,
      amount                      NUMERIC NOT NULL,
      direction                   TEXT NOT NULL,
      running_balance             NUMERIC,
      counterparty_name           TEXT,
      managerial_category         TEXT NOT NULL,
      classification_confidence   TEXT NOT NULL,
      classification_note         TEXT,
      is_intercompany             BOOLEAN NOT NULL DEFAULT false,
      intercompany_match_id       TEXT,
      excluded_from_consolidated  BOOLEAN NOT NULL DEFAULT false,
      extracted_at                TEXT NOT NULL,
      classified_at               TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bt_document_id ON bank_transactions(document_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bt_entity ON bank_transactions(entity)`;
}
