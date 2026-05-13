-- ─── Advisor — Full Schema ────────────────────────────────────────────────────
-- Standalone schema: no FK references to other modules.

SET client_min_messages = WARNING;

-- ─── advisor_clients ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_clients (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL DEFAULT '',
  segmento              TEXT NOT NULL DEFAULT '',
  tipo_servico          TEXT NOT NULL DEFAULT '',
  aum                   NUMERIC NOT NULL DEFAULT 0,
  fee_mensal            NUMERIC NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'Ativo',
  since                 TEXT NOT NULL DEFAULT '',
  responsavel           TEXT NOT NULL DEFAULT '',
  contato_email         TEXT NOT NULL DEFAULT '',
  contato_phone         TEXT NOT NULL DEFAULT '',
  nps                   NUMERIC,
  imported_from_notion  BOOLEAN NOT NULL DEFAULT FALSE,
  notion_page_id        TEXT,
  imported_at           TEXT,
  last_internal_update  TEXT,
  sync_status           TEXT NOT NULL DEFAULT 'internal'
);

CREATE INDEX IF NOT EXISTS idx_advisor_cli_status ON advisor_clients(status);
CREATE INDEX IF NOT EXISTS idx_advisor_cli_since  ON advisor_clients(since);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE advisor_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_advisor_clients" ON advisor_clients;
CREATE POLICY "allow_all_advisor_clients" ON advisor_clients FOR ALL USING (true) WITH CHECK (true);
