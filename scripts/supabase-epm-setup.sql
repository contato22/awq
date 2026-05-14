-- =============================================================================
-- AWQ EPM — Supabase Setup
-- Run this in the Supabase SQL editor for project kkhxxsrgsewjfvnnsssyf
-- =============================================================================
-- Creates a flat `general_ledger` table whose columns map 1-to-1 with the
-- GLEntry TypeScript interface in lib/epm-gl.ts.
-- No FK normalization — codes are stored as text for simple direct reads.
-- =============================================================================

-- ─── Enable pgcrypto for gen_random_uuid() ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── general_ledger ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS general_ledger (
  gl_id            TEXT        PRIMARY KEY,           -- UUID from app layer
  journal_id       TEXT        NOT NULL,              -- groups debit+credit legs
  transaction_date TEXT        NOT NULL,              -- YYYY-MM-DD
  period_code      TEXT        NOT NULL,              -- YYYY-MM  e.g. '2026-03'
  bu_code          TEXT        NOT NULL,              -- 'AWQ'|'JACQES'|'CAZA'|'ADVISOR'|'VENTURE'
  account_code     TEXT        NOT NULL,              -- e.g. '1.1.01'
  account_name     TEXT        NOT NULL,
  account_type     TEXT        NOT NULL,              -- ASSET|LIABILITY|EQUITY|REVENUE|...
  debit_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  description      TEXT        NOT NULL,
  reference_doc    TEXT,
  source_system    TEXT        NOT NULL DEFAULT 'manual',
  is_intercompany  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TEXT        NOT NULL,              -- ISO timestamp from app layer
  created_by       TEXT,
  CONSTRAINT gl_debit_nonneg  CHECK (debit_amount  >= 0),
  CONSTRAINT gl_credit_nonneg CHECK (credit_amount >= 0),
  CONSTRAINT gl_one_side_only CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gl_journal     ON general_ledger(journal_id);
CREATE INDEX IF NOT EXISTS idx_gl_date        ON general_ledger(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_gl_period      ON general_ledger(period_code);
CREATE INDEX IF NOT EXISTS idx_gl_bu          ON general_ledger(bu_code);
CREATE INDEX IF NOT EXISTS idx_gl_account     ON general_ledger(account_code);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Service role key bypasses RLS entirely (used server-side in epm-gl.ts).
-- Anon key is blocked by default — only enable if you need client-side reads.

ALTER TABLE general_ledger ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (implicit — RLS does not apply to service role)

-- Block anon reads by default (uncomment to allow read-only public access):
-- CREATE POLICY "anon_read" ON general_ledger
--   FOR SELECT USING (true);
