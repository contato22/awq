-- ─── JACQES FP&A — Full Schema ────────────────────────────────────────────────
-- Stores JACQES clients and financial period data.

SET client_min_messages = WARNING;

CREATE TABLE IF NOT EXISTS jacqes_clients (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome       TEXT NOT NULL,
  fee        NUMERIC NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'Pago',
  alloc      TEXT NOT NULL DEFAULT 'manter',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  segmento   TEXT NOT NULL DEFAULT '',
  since      TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_fpa_periods (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  periodo         TEXT NOT NULL,
  receita_bruta   NUMERIC NOT NULL DEFAULT 0,
  deducoes        NUMERIC NOT NULL DEFAULT 0,
  cogs            NUMERIC NOT NULL DEFAULT 0,
  pessoal         NUMERIC NOT NULL DEFAULT 0,
  adm_marketing   NUMERIC NOT NULL DEFAULT 0,
  outras_despesas NUMERIC NOT NULL DEFAULT 0,
  resultado_fin   NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_clients_status  ON jacqes_clients(status);
CREATE INDEX IF NOT EXISTS idx_jacqes_fpa_periodo     ON jacqes_fpa_periods(periodo);

ALTER TABLE jacqes_clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_fpa_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_jacqes_clients"      ON jacqes_clients;
CREATE POLICY "allow_all_jacqes_clients"      ON jacqes_clients     FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_jacqes_fpa_periods"  ON jacqes_fpa_periods;
CREATE POLICY "allow_all_jacqes_fpa_periods"  ON jacqes_fpa_periods FOR ALL USING (true) WITH CHECK (true);
