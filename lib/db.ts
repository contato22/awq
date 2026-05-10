// ─── AWQ Database Client — Supabase / Postgres ────────────────────────────────
//
// Provides a SQL client when DATABASE_URL is set (Supabase production).
// Falls back to null when absent; financial-db.ts detects null and uses
// JSON-file storage (local dev, GitHub Pages static build).
//
// USAGE:
//   import { sql, initDB } from "@/lib/db";
//   if (sql) { await sql`SELECT 1`; }  // Postgres
//   else { /* filesystem fallback */ }
//
// SCHEMA: call initDB() once at startup (or rely on Vercel's build step).
//   In Next.js App Router, call initDB() in the first server action that needs DB.
//   CREATE TABLE IF NOT EXISTS is idempotent — safe to call on every cold start.

import postgres from "postgres";

// Thin wrapper: returns Promise<any[]> so callers can use `as SomeType[]`
// and typed map callbacks without double-cast — same pattern that worked
// with @neondatabase/serverless. Type safety is enforced at each call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

const _pg = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

// Exported null-safe SQL client. null = no DATABASE_URL = use filesystem.
export const sql: SqlTag | null = _pg
  ? (strings, ...values) => (_pg as unknown as SqlTag)(strings, ...values)
  : null;

export const USE_DB = !!process.env.DATABASE_URL;
export const USE_BLOB = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  // ─── All module tables — bootstrapped in parallel ────────────────────────────
  await Promise.allSettled([
    import("@/lib/caza-db").then(({ initCazaDB }) => initCazaDB()),
    import("@/lib/bpm-db").then(({ initBpmDB }) => initBpmDB()),
    import("@/lib/ppm-db").then(({ initPpmDB }) => initPpmDB()),
    import("@/lib/ap-ar-db").then(({ initAllAPARTables }) => initAllAPARTables()),
    import("@/lib/venture-db").then(({ initVentureDB }) => initVentureDB()),
    import("@/lib/advisor-db").then(({ initAdvisorDB }) => initAdvisorDB()),
  ]);
}
