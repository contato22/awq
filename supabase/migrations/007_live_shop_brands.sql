-- =============================================================================
-- Migration 007 — Live Shop: marcas (clientes-marca da BU)
-- =============================================================================
-- Cada marca é um cliente do Live Shop (a BU opera a live; a marca é o seller).
-- Bless Rio = cliente-piloto (§2). É aqui que o "cliente #2" do gate §9 entra.
--
-- RLS por BU fail-closed (GUC app.current_bu, padrão 003/004/006). Idempotente.
-- Aplicar após a migration 006.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ls_brand (
  id            TEXT PRIMARY KEY,
  bu_id         TEXT NOT NULL DEFAULT 'LIVE',
  name          TEXT NOT NULL,
  segment       TEXT,
  kind          TEXT NOT NULL DEFAULT 'fabricante'
    CHECK (kind IN ('fabricante','revenda','marca_propria')),
  status        TEXT NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('piloto','ativo','prospect','pausado','arquivado')),
  deal_model    TEXT,
  is_pilot      BOOLEAN NOT NULL DEFAULT false,
  first_live_at DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vincula pedidos/sessões à marca (opcional, não-destrutivo).
ALTER TABLE ls_order        ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES ls_brand(id) ON DELETE RESTRICT;
ALTER TABLE ls_live_session ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES ls_brand(id) ON DELETE RESTRICT;

-- Seed do cliente-piloto (§2) — atributos FIXOS de negócio.
INSERT INTO ls_brand (id, name, segment, kind, status, deal_model, is_pilot, first_live_at, notes)
VALUES (
  'bless-rio', 'Bless Rio', 'Moda feminina', 'fabricante', 'piloto',
  'Revenue share 10% GMV (estrutura A)', true, '2026-06-16',
  'Fabricante — quer vender produto fábrica-direto e dead stock.'
)
ON CONFLICT (id) DO NOTHING;

-- RLS (mesmo padrão da 006).
ALTER TABLE ls_brand ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ls_brand FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ls_brand TO authenticated;
DROP POLICY IF EXISTS bu_isolation ON ls_brand;
CREATE POLICY bu_isolation ON ls_brand FOR ALL TO authenticated
  USING      (bu_id = current_setting('app.current_bu', true))
  WITH CHECK (bu_id = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 007
-- =============================================================================
