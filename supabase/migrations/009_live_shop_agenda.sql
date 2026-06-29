-- =============================================================================
-- Migration 009 — Live Shop: agenda de lives (ls_live_plan)
-- =============================================================================
-- Plano por live: peças, responsáveis, roteiro, metas, comissões (host/creator
-- — operacional, NÃO é o P&L interno da AWQ). Listas em JSONB. RLS por BU
-- fail-closed (GUC app.current_bu). Idempotente. Aplicar após a 008.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ls_live_plan (
  id           TEXT PRIMARY KEY,
  bu_id        TEXT NOT NULL DEFAULT 'LIVE',
  brand_id     TEXT NOT NULL REFERENCES ls_brand(id) ON DELETE RESTRICT,
  starts_at    TIMESTAMPTZ NOT NULL,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'planejada'
    CHECK (status IN ('planejada','confirmada','realizada')),
  pecas        JSONB NOT NULL DEFAULT '[]',   -- string[]
  responsaveis JSONB NOT NULL DEFAULT '[]',   -- {role,name}[]
  roteiro      TEXT,
  metas        JSONB NOT NULL DEFAULT '[]',   -- string[]
  comissoes    JSONB NOT NULL DEFAULT '[]',   -- {label,value}[]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_live_plan_brand ON ls_live_plan (bu_id, brand_id, starts_at);

-- Seed da agenda Bless Rio (espelha lib/live-shop/agenda.ts).
INSERT INTO ls_live_plan (id, brand_id, starts_at, title, status, pecas, responsaveis, roteiro, metas, comissoes) VALUES
  ('blr-2026-07-16','bless-rio','2026-07-16T19:00:00-03:00','Live de Inverno — fábrica direto','confirmada',
   '["Casaco de lã (linha própria)","Vestido midi","Kit 3 blusas","Dead stock — saldão"]',
   '[{"role":"Host","name":"A definir"},{"role":"Operação/Estúdio","name":"Caza Vision"},{"role":"Gestão","name":"AWQ Live Shop"}]',
   'Abertura com oferta âncora < R$ 50 e regra de frete clara; bloco de looks (cross-sell); bloco de produto próprio; recap + próxima live.',
   '["Vender ≥ 10 peças de produto próprio","CTOR ≥ 3%","Itens/pedido > 1,3"]',
   '[{"label":"Host","value":"10% sobre vendas da live"},{"label":"Afiliado/creator","value":"até 15%"}]'),
  ('blr-2026-07-23','bless-rio','2026-07-23T19:00:00-03:00','Drop cápsula + recompra','planejada',
   '["Cápsula nova (produto próprio)","Best-sellers da L1","Combo presente"]',
   '[{"role":"Host","name":"A definir"},{"role":"Operação/Estúdio","name":"Caza Vision"},{"role":"Gestão","name":"AWQ Live Shop"}]',
   'Reforço da cápsula própria; ofertas de recompra para clientes da 1ª live; encerramento com CTA de fidelização.',
   '["Recompra ≥ 15% da base","Sustentar MC% ≥ 35%"]',
   '[{"label":"Host","value":"10% sobre vendas da live"},{"label":"Afiliado/creator","value":"até 15%"}]')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE ls_live_plan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ls_live_plan FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ls_live_plan TO authenticated;
DROP POLICY IF EXISTS bu_isolation ON ls_live_plan;
CREATE POLICY bu_isolation ON ls_live_plan FOR ALL TO authenticated
  USING      (bu_id = current_setting('app.current_bu', true))
  WITH CHECK (bu_id = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 009
-- =============================================================================
