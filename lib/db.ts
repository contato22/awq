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

// ─── EPM Planning schema bootstrap ───────────────────────────────────────────
// Idempotent — safe to call on every cold start.

export async function initEPMPlanningDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_bu_data (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      sub               TEXT NOT NULL,
      color             TEXT NOT NULL,
      accent_color      TEXT NOT NULL,
      status            TEXT NOT NULL,
      economic_type     TEXT NOT NULL,
      revenue           NUMERIC NOT NULL DEFAULT 0,
      gross_profit      NUMERIC NOT NULL DEFAULT 0,
      ebitda            NUMERIC NOT NULL DEFAULT 0,
      net_income        NUMERIC NOT NULL DEFAULT 0,
      cash_generated    NUMERIC NOT NULL DEFAULT 0,
      cash_balance      NUMERIC NOT NULL DEFAULT 0,
      customers         INTEGER NOT NULL DEFAULT 0,
      ftes              INTEGER NOT NULL DEFAULT 0,
      capital_allocated NUMERIC NOT NULL DEFAULT 0,
      roic              NUMERIC NOT NULL DEFAULT 0,
      budget_revenue    NUMERIC NOT NULL DEFAULT 0,
      href_overview     TEXT NOT NULL DEFAULT '',
      href_financial    TEXT NOT NULL DEFAULT '',
      href_customers    TEXT NOT NULL DEFAULT '',
      href_unit_econ    TEXT NOT NULL DEFAULT '',
      href_budget       TEXT NOT NULL DEFAULT '',
      updated_at        TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_venture_contracts (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      counterparty         TEXT NOT NULL,
      monthly_fee          NUMERIC NOT NULL DEFAULT 0,
      duration_months      INTEGER NOT NULL DEFAULT 0,
      total_contract_value NUMERIC NOT NULL DEFAULT 0,
      arr                  NUMERIC NOT NULL DEFAULT 0,
      start_date           TEXT,
      status               TEXT NOT NULL DEFAULT 'active',
      note                 TEXT NOT NULL DEFAULT '',
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_monthly_revenue (
      month       TEXT PRIMARY KEY,
      jacqes      NUMERIC NOT NULL DEFAULT 0,
      caza        NUMERIC NOT NULL DEFAULT 0,
      advisor     NUMERIC NOT NULL DEFAULT 0,
      is_forecast BOOLEAN NOT NULL DEFAULT false,
      updated_at  TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_category_budget (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      category   TEXT NOT NULL,
      budget     NUMERIC NOT NULL DEFAULT 0,
      actual     NUMERIC NOT NULL DEFAULT 0,
      bu         TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_alloc_flags (
      bu_id      TEXT PRIMARY KEY,
      flag       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_holding_treasury (
      id                        TEXT PRIMARY KEY DEFAULT 'current',
      as_of                     TEXT NOT NULL,
      source                    TEXT NOT NULL,
      total_invested_real       NUMERIC NOT NULL DEFAULT 0,
      last_application_amount   NUMERIC NOT NULL DEFAULT 0,
      last_application_date     TEXT NOT NULL DEFAULT '',
      investment_type           TEXT NOT NULL DEFAULT '',
      investment_bank           TEXT NOT NULL DEFAULT '',
      investment_account_cash   NUMERIC NOT NULL DEFAULT 0,
      bank_fees                 NUMERIC NOT NULL DEFAULT 0,
      operational_cash          NUMERIC NOT NULL DEFAULT 0,
      card_limit_total          NUMERIC NOT NULL DEFAULT 0,
      card_limit_committed      NUMERIC NOT NULL DEFAULT 0,
      card_reserve_deposited    NUMERIC NOT NULL DEFAULT 0,
      intercompany_total        NUMERIC NOT NULL DEFAULT 0,
      partner_withdrawals       NUMERIC NOT NULL DEFAULT 0,
      confidence                TEXT NOT NULL DEFAULT 'estimated',
      note                      TEXT NOT NULL DEFAULT '',
      updated_at                TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_chart_of_accounts (
      account_code   TEXT PRIMARY KEY,
      account_name   TEXT NOT NULL,
      account_type   TEXT NOT NULL,
      normal_balance TEXT NOT NULL,
      level          INTEGER NOT NULL DEFAULT 3,
      updated_at     TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_fiscal_rates (
      supplier_type TEXT PRIMARY KEY,
      irrf_rate     NUMERIC NOT NULL DEFAULT 0,
      inss_rate     NUMERIC NOT NULL DEFAULT 0,
      iss_rate      NUMERIC NOT NULL DEFAULT 0,
      pis_rate      NUMERIC NOT NULL DEFAULT 0,
      cofins_rate   NUMERIC NOT NULL DEFAULT 0,
      updated_at    TEXT NOT NULL
    )
  `;
}
