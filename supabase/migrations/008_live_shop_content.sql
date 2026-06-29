-- =============================================================================
-- Migration 008 — Live Shop: grade de conteúdo por marca (ls_content_block)
-- =============================================================================
-- Blocos de conteúdo das lives: horário, roteiro, resultado esperado, status.
-- Conteúdo operacional/editorial — NÃO carrega número financeiro.
-- RLS por BU fail-closed (GUC app.current_bu). Idempotente. Aplicar após a 007.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ls_content_block (
  id        TEXT PRIMARY KEY,
  bu_id     TEXT NOT NULL DEFAULT 'LIVE',
  brand_id  TEXT NOT NULL REFERENCES ls_brand(id) ON DELETE RESTRICT,
  position  INT NOT NULL DEFAULT 0,
  slot      TEXT,             -- ex.: "Bloco 1 · 0–20min" ou "16/07 19h00"
  title     TEXT NOT NULL,
  script    TEXT,             -- roteiro
  expected  TEXT,             -- resultado esperado
  status    TEXT NOT NULL DEFAULT 'planejado'
    CHECK (status IN ('planejado','confirmado','feito')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_content_brand ON ls_content_block (bu_id, brand_id, position);

-- Seed — grade da marca-piloto (Bless Rio), espelha lib/live-shop/content.ts.
INSERT INTO ls_content_block (id, brand_id, position, slot, title, script, expected, status) VALUES
  ('blr-b1','bless-rio',1,'Bloco 1 · 0–20min','Abertura + oferta âncora',
   'Boas-vindas, regra de frete clara já na abertura, oferta âncora abaixo de R$ 50.',
   'Reduzir o vazamento no checkout (frete) e prender a audiência.','planejado'),
  ('blr-b2','bless-rio',2,'Bloco 2 · 20–60min','Cross-sell / montagem de looks',
   'Montar looks e kits combinando peças para elevar itens por pedido.',
   'Subir itens/pedido acima de 1,3 (hoje ~1,10).','planejado'),
  ('blr-b3','bless-rio',3,'Bloco 3 · 60–90min','Produto próprio / dead stock',
   'Destaque de peças fábrica-direto e dead stock, com storytelling de fábrica.',
   'Vender peças de produto próprio (critério do gate de verticalização).','planejado'),
  ('blr-b4','bless-rio',4,'Encerramento','Recap + próxima live',
   'Recapitular ofertas, CTA de recompra e anunciar a próxima data.',
   'Recompra e retenção de audiência entre lives.','planejado')
ON CONFLICT (id) DO NOTHING;

-- RLS (mesmo padrão da 006/007).
ALTER TABLE ls_content_block ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ls_content_block FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ls_content_block TO authenticated;
DROP POLICY IF EXISTS bu_isolation ON ls_content_block;
CREATE POLICY bu_isolation ON ls_content_block FOR ALL TO authenticated
  USING      (bu_id = current_setting('app.current_bu', true))
  WITH CHECK (bu_id = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 008
-- =============================================================================
