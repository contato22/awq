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
// Wrapped in IIFE so a malformed DATABASE_URL (missing "://") doesn't throw at
// module import time and crash every server component that imports lib/db.ts.
export const sql: Sql | null = (() => {
  if (!process.env.DATABASE_URL) return null;
  try {
    return postgres(process.env.DATABASE_URL, { ssl: "require", max: 5 });
  } catch {
    console.error("[db] Invalid DATABASE_URL — SQL client disabled:", process.env.DATABASE_URL?.slice(0, 30));
    return null;
  }
})();

export const USE_DB   = !!process.env.DATABASE_URL;
export const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// ─── Schema bootstrap ─────────────────────────────────────────────────────────
// Idempotent — safe to call on every cold start.

let _initPromise: Promise<void> | null = null;

// Call once per process — subsequent calls are no-ops (returns the same promise).
// Never rejects — callers do not need try/catch; migration failure is logged and
// skipped so the rest of the request can fall back to Supabase REST or JSON.
export function initDB(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (_initPromise) return _initPromise;
  _initPromise = _runMigration().catch((err) => {
    console.error("[initDB] schema migration failed (DATABASE_URL credentials?):", err);
    _initPromise = null; // allow retry on next cold start
  });
  return _initPromise;
}

async function _runMigration(): Promise<void> {
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

  // reconciliation_status may be missing in older deployments — add it if absent
  await sql`
    ALTER TABLE bank_transactions
      ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pendente'
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bt_document_id ON bank_transactions(document_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bt_entity       ON bank_transactions(entity)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bt_date         ON bank_transactions(transaction_date)`;

  await sql`GRANT ALL ON financial_documents TO anon, authenticated`;
  await sql`GRANT ALL ON bank_transactions   TO anon, authenticated`;

  await sql`ALTER TABLE financial_documents DISABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE bank_transactions   DISABLE ROW LEVEL SECURITY`;

  // ── EPM Hurdle Rate tables ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS epm_hurdle_rates (
      bu_id                TEXT PRIMARY KEY,
      bu_name              TEXT NOT NULL,
      wacc_pct             NUMERIC(5,2) NOT NULL DEFAULT 26.2,
      risk_premium_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
      hurdle_pct           NUMERIC(5,2) NOT NULL DEFAULT 26.2,
      rf_pct               NUMERIC(5,2),
      mature_erp_pct       NUMERIC(5,2),
      size_premium_pct     NUMERIC(5,2),
      specific_premium_pct NUMERIC(5,2),
      bu_risk_premium_pct  NUMERIC(5,2),
      regime               TEXT DEFAULT 'simples',
      rf_source            TEXT,
      erp_source           TEXT,
      inputs_updated_at    TIMESTAMPTZ DEFAULT now(),
      updated_at           TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS epm_hurdle_projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      bu_id       TEXT NOT NULL,
      bu_name     TEXT NOT NULL,
      capex       NUMERIC(15,2) DEFAULT 0,
      irr_pct     NUMERIC(6,2),
      roic_pct    NUMERIC(6,2),
      payback_mo  INTEGER,
      duration_mo INTEGER,
      status      TEXT NOT NULL DEFAULT 'pending',
      description TEXT,
      updated_at  TEXT
    )
  `;
}
