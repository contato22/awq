-- ─── AWQ Venture — Full Schema ────────────────────────────────────────────────
-- Stores deals (JSONB for flexibility) and commercial pipeline.

SET client_min_messages = WARNING;

CREATE TABLE IF NOT EXISTS venture_deals (
  id           TEXT PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT '',
  stage        TEXT NOT NULL DEFAULT 'Triagem',
  assignee     TEXT NOT NULL DEFAULT '',
  send_status  TEXT NOT NULL DEFAULT 'Rascunho',
  deal_score   NUMERIC,
  risk_level   TEXT NOT NULL DEFAULT 'Médio',
  priority     TEXT NOT NULL DEFAULT 'Média',
  proposed_value NUMERIC NOT NULL DEFAULT 0,
  valuation_range TEXT NOT NULL DEFAULT '',
  data         JSONB NOT NULL DEFAULT '{}',
  last_updated TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venture_commercial (
  id             TEXT PRIMARY KEY,
  company        TEXT NOT NULL DEFAULT '',
  sector         TEXT NOT NULL DEFAULT '',
  stage          TEXT NOT NULL DEFAULT 'Prospecção',
  deal_type      TEXT NOT NULL DEFAULT 'Operação Recorrente',
  probability    INTEGER NOT NULL DEFAULT 0,
  priority       TEXT NOT NULL DEFAULT 'Média',
  responsible    TEXT NOT NULL DEFAULT '',
  next_action    TEXT NOT NULL DEFAULT '',
  last_updated   TEXT NOT NULL DEFAULT '',
  data           JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venture_deals_stage       ON venture_deals(stage);
CREATE INDEX IF NOT EXISTS idx_venture_commercial_stage  ON venture_commercial(stage);

ALTER TABLE venture_deals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venture_commercial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_venture_deals"      ON venture_deals;
CREATE POLICY "allow_all_venture_deals"      ON venture_deals      FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_venture_commercial" ON venture_commercial;
CREATE POLICY "allow_all_venture_commercial" ON venture_commercial FOR ALL USING (true) WITH CHECK (true);
