// ─── AWQ Database Client ───────────────────────────────────────────────────────
//
// Auto-detects the appropriate Postgres driver based on DATABASE_URL:
//
//   DATABASE_URL contains "neon.tech"  → @neondatabase/serverless (HTTP/WS)
//   DATABASE_URL is any other Postgres → postgres pkg (TCP/SSL, standard)
//   DATABASE_URL not set               → null; financial-db falls back to JSON
//
// All consumers use the tagged-template `sql` function — API is identical
// across both drivers.
//
// SCHEMA: call initDB() once at startup (idempotent, CREATE TABLE IF NOT EXISTS).

import type { NeonQueryFunction } from "@neondatabase/serverless";
import type postgres from "postgres";

// ─── Unified SQL type ─────────────────────────────────────────────────────────

// Both drivers expose a tagged-template function returning promise<Row[]>.
// We use the Neon type as the surface type since it's already imported throughout.
export type SqlClient = NeonQueryFunction<false, false> | postgres.Sql;

// ─── Client bootstrap ─────────────────────────────────────────────────────────

function buildClient(): SqlClient | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (url.includes("neon.tech")) {
    // Neon serverless — HTTP-based, works in edge + node runtimes
    const { neon } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    return neon(url) as SqlClient;
  }

  // Standard Postgres (local dev, Railway, Supabase, etc.)
  const Postgres = require("postgres") as typeof import("postgres");
  return Postgres(url, { ssl: url.includes("sslmode=require") ? "require" : false }) as unknown as SqlClient;
}

export const sql: SqlClient | null = buildClient();
export const USE_DB  = !!sql;
export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// ─── Schema bootstrap (idempotent) ────────────────────────────────────────────

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
      blob_url            TEXT,
      pdf_content         TEXT
    )
  `;

  // Safe migrations for tables created before new columns were added
  await sql`ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS pdf_content TEXT`;

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
      reconciliation_status       TEXT NOT NULL DEFAULT 'pendente',
      extracted_at                TEXT NOT NULL,
      classified_at               TEXT
    )
  `;

  // Safe migration for tables created before reconciliation_status was added
  await sql`
    ALTER TABLE bank_transactions
      ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pendente'
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bt_document_id ON bank_transactions(document_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bt_entity ON bank_transactions(entity)`;

  // ─── Caza Vision tables ──────────────────────────────────────────────────────
  const { initCazaDB } = await import("@/lib/caza-db");
  await initCazaDB();

}
