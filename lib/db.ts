// ─── AWQ Database Client ────────────────────────────────────────────────────────
//
// Provides a SQL tagged-template client when DATABASE_URL points to a Neon
// cloud endpoint. Falls back to null for local PostgreSQL URLs (which use TCP
// and cannot be bundled by webpack) — financial-db.ts then uses JSON-file
// storage as a safe local-dev fallback.
//
// USAGE:
//   import { sql, initDB } from "@/lib/db";
//   if (sql) { const rows = await sql`SELECT 1`; }
//   else { /* filesystem fallback */ }
//
// Cloud deployment (Vercel + Neon/Supabase Pooler):
//   DATABASE_URL=postgres://user:pass@<project>.neon.tech/neondb?sslmode=require
//
// Local dev:
//   Omit DATABASE_URL → sql = null → JSON-file storage

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon serverless client uses fetch (HTTP), not TCP — safe for webpack bundling.
// Local PostgreSQL URLs (localhost / 127.0.0.1) use TCP and are not supported
// by this client; detect them and fall back to null so JSON storage is used.
function isNeonCompatible(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    // localhost / 127.x / ::1 are local PostgreSQL — not Neon-compatible
    return hostname !== "localhost" && !hostname.startsWith("127.") && hostname !== "::1";
  } catch {
    return false;
  }
}

const _url = process.env.DATABASE_URL;
const _useNeon = !!_url && isNeonCompatible(_url);

// Exported null-safe SQL client. null = no DATABASE_URL or local URL = use filesystem.
export const sql: NeonQueryFunction<false, false> | null = _useNeon ? neon(_url!) : null;

export const USE_DB   = _useNeon;
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
      reconciliation_status       TEXT NOT NULL DEFAULT 'pendente',
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
