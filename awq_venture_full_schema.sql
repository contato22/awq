-- ─── AWQ Venture — Full Schema ────────────────────────────────────────────────
-- Covers: deals, venture contracts, bank accounts tracker, deal negotiations
-- Run once in Supabase SQL Editor.

-- ─── Venture Deals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venture_deals (
  id               TEXT PRIMARY KEY,
  company_name     TEXT NOT NULL,
  stage            TEXT NOT NULL DEFAULT 'Triagem',
  assignee         TEXT,
  last_updated     TEXT,
  send_status      TEXT NOT NULL DEFAULT 'Rascunho',
  operation_type   TEXT,
  valuation_range  TEXT,
  proposed_value   NUMERIC,
  deal_score       NUMERIC,
  risk_level       TEXT,
  priority         TEXT NOT NULL DEFAULT 'Média',
  -- Sections stored as JSONB (complex nested objects)
  identification    JSONB DEFAULT '{}',
  strategic_thesis  JSONB DEFAULT '{}',
  asset_diagnosis   JSONB DEFAULT '{}',
  financials        JSONB DEFAULT '{}',
  risk_diligence    JSONB DEFAULT '{}',
  proposal_structure JSONB DEFAULT '{}',
  governance        JSONB DEFAULT '{}',
  proposal_10blocks JSONB,
  -- Override/negotiation state (persisted from deal workspace pages)
  overrides         JSONB DEFAULT '{}',
  client_responses  JSONB DEFAULT '[]',
  -- Flags
  is_custom         BOOLEAN NOT NULL DEFAULT false,
  is_seed           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venture_deals_stage    ON venture_deals(stage);
CREATE INDEX IF NOT EXISTS idx_venture_deals_priority ON venture_deals(priority);
CREATE INDEX IF NOT EXISTS idx_venture_deals_updated  ON venture_deals(updated_at DESC);

-- ─── Venture Contracts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venture_contracts (
  id                   TEXT PRIMARY KEY,
  counterparty         TEXT NOT NULL,
  monthly_fee          NUMERIC NOT NULL DEFAULT 0,
  duration_months      INTEGER,
  total_contract_value NUMERIC,
  arr                  NUMERIC,
  start_date           TEXT,
  status               TEXT NOT NULL DEFAULT 'active',
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Bank Accounts (cash tracker) ─────────────────────────────────────────────
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
);

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
);

CREATE INDEX IF NOT EXISTS idx_bat_account_id ON bank_account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bat_date        ON bank_account_transactions(date DESC);
