-- =============================================================================
-- EPM General Ledger — double-entry journal entries
-- =============================================================================
-- Migrates GL storage from public/data/epm-gl.json → Supabase.
-- lib/epm-gl.ts reads/writes this table when DATABASE_URL is set.

CREATE TABLE IF NOT EXISTS epm_gl_entries (
  gl_id            TEXT PRIMARY KEY,
  journal_id       TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  period_code      TEXT NOT NULL,
  bu_code          TEXT NOT NULL,
  account_code     TEXT NOT NULL,
  account_name     TEXT NOT NULL,
  account_type     TEXT NOT NULL,
  debit_amount     NUMERIC NOT NULL DEFAULT 0,
  credit_amount    NUMERIC NOT NULL DEFAULT 0,
  description      TEXT NOT NULL,
  reference_doc    TEXT,
  source_system    TEXT NOT NULL DEFAULT 'manual',
  is_intercompany  BOOLEAN NOT NULL DEFAULT false,
  created_at       TEXT NOT NULL,
  created_by       TEXT
);

CREATE INDEX IF NOT EXISTS idx_gl_journal   ON epm_gl_entries(journal_id);
CREATE INDEX IF NOT EXISTS idx_gl_period    ON epm_gl_entries(period_code);
CREATE INDEX IF NOT EXISTS idx_gl_bu        ON epm_gl_entries(bu_code);
CREATE INDEX IF NOT EXISTS idx_gl_account   ON epm_gl_entries(account_code);

-- Add bu column to epm_category_budget if not present (schema fix)
ALTER TABLE epm_category_budget ADD COLUMN IF NOT EXISTS bu TEXT DEFAULT 'Grupo';
