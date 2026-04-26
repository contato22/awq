// ─── AWQ Database Client — Neon Serverless Postgres ───────────────────────────
//
// Provides a SQL client when DATABASE_URL is set (Vercel + Neon production).
// Falls back to null when absent; financial-db.ts detects null and uses
// JSON-file storage (local dev, GitHub Pages static build).
//
// USAGE:
//   import { sql, initDB } from "@/lib/db";
//   if (sql) { await sql`SELECT 1`; }  // Neon
//   else { /* filesystem fallback */ }
//
// SCHEMA: call initDB() once at startup (or rely on Vercel's build step).
//   In Next.js App Router, call initDB() in the first server action that needs DB.
//   CREATE TABLE IF NOT EXISTS is idempotent — safe to call on every cold start.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Exported null-safe SQL client. null = no DATABASE_URL = use filesystem.
export const sql: NeonQueryFunction<false, false> | null =
  process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export const USE_DB   = !!process.env.DATABASE_URL;
export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
// Re-export for convenience — actual client lives in lib/supabase-client.ts
export { USE_SUPABASE } from "./supabase-client";

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

  // ─── Caza Vision tables ──────────────────────────────────────────────────────
  const { initCazaDB } = await import("@/lib/caza-db");
  await initCazaDB();
}
