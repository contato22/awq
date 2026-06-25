-- =============================================================================
-- Migration 006 — BU Live Shop (live commerce sobre infra Caza)
-- =============================================================================
-- Cria a BU Live Shop e o schema ls_* (§4): catálogo, sessões, pedidos, fees
-- versionadas (§6, Anexo A), ledger dupla-entrada (§5), settlement/reconciliação
-- (§14.5), ingestão TikTok (§14) e snapshots de KPI/unit-econ (§7).
--
-- DISCIPLINA DE DINHEIRO (§13): money = BIGINT em CENTAVOS; percentual = INT em
-- basis points (bps). ZERO float. on delete restrict nas FKs.
--
-- RLS por BU (§10) via GUC de sessão app.current_bu (mesmo padrão das migrations
-- 003/004): bu_id = current_setting('app.current_bu', true). Fail-closed: sem
-- contexto, NENHUMA linha. service_role faz bypass (backend usa erpAdmin).
--
-- Execute UMA VEZ no Supabase SQL Editor. Idempotente (IF NOT EXISTS / OR
-- REPLACE / DROP IF EXISTS) — seguro rodar múltiplas vezes.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- =============================================================================
-- 0) business_units — estende a BU (slug, consolidação 100%, stage)
-- =============================================================================
-- A tabela business_units já existe (migration 001/002). Extensão idempotente.
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS slug              TEXT;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS consolidates_fully BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS stage             TEXT NOT NULL DEFAULT 'pilot';

ALTER TABLE business_units DROP CONSTRAINT IF EXISTS business_units_stage_check;
ALTER TABLE business_units ADD  CONSTRAINT business_units_stage_check
  CHECK (stage IN ('pilot','validated','formalized'));

INSERT INTO business_units (bu_code, bu_name, economic_type, slug, consolidates_fully, stage)
VALUES ('LIVE', 'Live Shop', 'operating', 'live-shop', true, 'pilot')
ON CONFLICT (bu_code) DO UPDATE
  SET slug = EXCLUDED.slug,
      consolidates_fully = EXCLUDED.consolidates_fully;
-- NOTA: stage NÃO é sobrescrito no upsert — só avança por decisão de gate (§9).

-- =============================================================================
-- 1) Catálogo / canal / fees versionadas (§4, §6, Anexo A)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ls_channel (
  id                      TEXT PRIMARY KEY,
  bu_id                   TEXT NOT NULL DEFAULT 'LIVE',
  name                    TEXT NOT NULL,
  free_shipping_enrolled  BOOLEAN NOT NULL DEFAULT false,
  new_seller_waiver_until DATE,
  new_seller_waiver_cap   BIGINT NOT NULL DEFAULT 0,   -- centavos
  payout_lag_days         INT NOT NULL DEFAULT 14,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_fee_schedule (
  id                  TEXT PRIMARY KEY,
  bu_id               TEXT NOT NULL DEFAULT 'LIVE',
  channel_id          TEXT NOT NULL REFERENCES ls_channel(id) ON DELETE RESTRICT,
  effective_from      DATE,                -- null = -inf
  effective_to        DATE,                -- null = +inf (EXCLUSIVO)
  shipping_service_bps INT NOT NULL DEFAULT 0,
  shipping_cap_per_item BIGINT NOT NULL DEFAULT 0,  -- centavos
  payment_bps         INT NOT NULL DEFAULT 0,
  source              TEXT,
  confirmed           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_fee_tier (
  id                  TEXT PRIMARY KEY,
  bu_id               TEXT NOT NULL DEFAULT 'LIVE',
  schedule_id         TEXT NOT NULL REFERENCES ls_fee_schedule(id) ON DELETE RESTRICT,
  min_price           BIGINT NOT NULL,        -- centavos (inclusive)
  max_price           BIGINT,                 -- centavos (exclusivo); null = inf
  commission_bps      INT NOT NULL,
  fixed_fee           BIGINT NOT NULL DEFAULT 0,
  fixed_fee_threshold BIGINT                  -- null = sempre cobra
);

CREATE TABLE IF NOT EXISTS ls_product (
  id          TEXT PRIMARY KEY,
  bu_id       TEXT NOT NULL DEFAULT 'LIVE',
  name        TEXT NOT NULL,
  is_own_product BOOLEAN NOT NULL DEFAULT false,
  margin_class   TEXT NOT NULL DEFAULT 'resale' CHECK (margin_class IN ('resale','own')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_sku (
  sku         TEXT PRIMARY KEY,
  bu_id       TEXT NOT NULL DEFAULT 'LIVE',
  product_id  TEXT REFERENCES ls_product(id) ON DELETE RESTRICT,
  cost        BIGINT NOT NULL DEFAULT 0,       -- CMV em centavos
  is_own_product BOOLEAN NOT NULL DEFAULT false,
  margin_class   TEXT NOT NULL DEFAULT 'resale' CHECK (margin_class IN ('resale','own')),
  default_affiliate_bps INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2) Sessões de live + pedidos + telemetria (§4)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ls_live_session (
  id            TEXT PRIMARY KEY,
  bu_id         TEXT NOT NULL DEFAULT 'LIVE',
  channel_id    TEXT NOT NULL REFERENCES ls_channel(id) ON DELETE RESTRICT,
  started_at    TIMESTAMPTZ NOT NULL,
  duration_min  INT NOT NULL DEFAULT 0,
  host_cost     BIGINT NOT NULL DEFAULT 0,
  ad_spend      BIGINT NOT NULL DEFAULT 0,
  views         INT NOT NULL DEFAULT 0,
  clicks        INT NOT NULL DEFAULT 0,
  peak_ccv      INT NOT NULL DEFAULT 0,
  avg_watch_sec INT NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'export' CHECK (source IN ('api','export','manual')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_order (
  id              TEXT PRIMARY KEY,        -- order_id natural do TikTok (idempotência)
  bu_id           TEXT NOT NULL DEFAULT 'LIVE',
  session_id      TEXT REFERENCES ls_live_session(id) ON DELETE RESTRICT,
  customer_ref    TEXT,
  placed_at       TIMESTAMPTZ NOT NULL,
  is_affiliate    BOOLEAN NOT NULL DEFAULT false,
  affiliate_bps   INT,
  gross           BIGINT NOT NULL DEFAULT 0,
  seller_discount BIGINT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'placed'
    CHECK (status IN ('placed','paid','delivered','returned','cancelled')),
  source          TEXT NOT NULL DEFAULT 'api' CHECK (source IN ('api','export','manual')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_order_session ON ls_order (bu_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ls_order_placed  ON ls_order (bu_id, placed_at);

CREATE TABLE IF NOT EXISTS ls_order_item (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id        TEXT NOT NULL DEFAULT 'LIVE',
  order_id     TEXT NOT NULL REFERENCES ls_order(id) ON DELETE RESTRICT,
  sku          TEXT NOT NULL,
  qty          INT NOT NULL DEFAULT 1,
  unit_price   BIGINT NOT NULL DEFAULT 0,
  unit_discount BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ls_order_item_order ON ls_order_item (order_id);

CREATE TABLE IF NOT EXISTS ls_funnel_event (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id      TEXT NOT NULL DEFAULT 'LIVE',
  session_id TEXT NOT NULL REFERENCES ls_live_session(id) ON DELETE RESTRICT,
  stage      TEXT NOT NULL CHECK (stage IN ('view','click','order','checkout','paid','delivered','returned')),
  qty        INT NOT NULL DEFAULT 0,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  source     TEXT NOT NULL DEFAULT 'export' CHECK (source IN ('api','export','manual'))
);
CREATE INDEX IF NOT EXISTS idx_ls_funnel_session ON ls_funnel_event (session_id, stage);

-- =============================================================================
-- 3) Fee lines (breakdown computado) + settlement (repasse real) (§4, §14.5)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ls_fee_line (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id       TEXT NOT NULL DEFAULT 'LIVE',
  order_id    TEXT NOT NULL REFERENCES ls_order(id) ON DELETE RESTRICT,
  fee_type    TEXT NOT NULL CHECK (fee_type IN ('commission','fixed','shipping','payment','affiliate','return')),
  amount      BIGINT NOT NULL,             -- centavos (magnitude positiva)
  schedule_id TEXT REFERENCES ls_fee_schedule(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_fee_line_order ON ls_fee_line (order_id);

CREATE TABLE IF NOT EXISTS ls_settlement (
  id           TEXT PRIMARY KEY,           -- statement_id natural (idempotência)
  bu_id        TEXT NOT NULL DEFAULT 'LIVE',
  channel_id   TEXT NOT NULL REFERENCES ls_channel(id) ON DELETE RESTRICT,
  received_at  TIMESTAMPTZ NOT NULL,
  amount       BIGINT NOT NULL DEFAULT 0,  -- centavos
  recon_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (recon_status IN ('pending','reconciled','exception')),
  recon_group_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_settlement_line (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id         TEXT NOT NULL DEFAULT 'LIVE',
  settlement_id TEXT NOT NULL REFERENCES ls_settlement(id) ON DELETE RESTRICT,
  line_type     TEXT NOT NULL CHECK (line_type IN
    ('commission','shipping','platform_discount','creator_commission','promo_rebate','tax_adj','refund')),
  amount        BIGINT NOT NULL             -- centavos (magnitude positiva)
);
CREATE INDEX IF NOT EXISTS idx_ls_settlement_line ON ls_settlement_line (settlement_id);

-- =============================================================================
-- 4) Ledger dupla-entrada (§5) — plano de contas + lançamentos append-only
-- =============================================================================
CREATE TABLE IF NOT EXISTS ls_account (
  code   TEXT PRIMARY KEY,
  bu_id  TEXT NOT NULL DEFAULT 'LIVE',
  type   TEXT NOT NULL,
  sign   SMALLINT NOT NULL CHECK (sign IN (-1, 1)),
  label  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ls_ledger_entry (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id      TEXT NOT NULL DEFAULT 'LIVE',
  ref        TEXT NOT NULL,                -- ex.: 'order:TT-1001'
  entry_date DATE NOT NULL,
  source     TEXT NOT NULL DEFAULT 'api' CHECK (source IN ('api','export','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_ledger_entry_ref ON ls_ledger_entry (bu_id, ref);

CREATE TABLE IF NOT EXISTS ls_ledger_line (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id     TEXT NOT NULL DEFAULT 'LIVE',
  entry_id  BIGINT NOT NULL REFERENCES ls_ledger_entry(id) ON DELETE RESTRICT,
  account   TEXT NOT NULL REFERENCES ls_account(code) ON DELETE RESTRICT,
  debit     BIGINT NOT NULL DEFAULT 0,     -- centavos
  credit    BIGINT NOT NULL DEFAULT 0,     -- centavos
  memo      TEXT,
  CHECK (debit >= 0 AND credit >= 0)
);
CREATE INDEX IF NOT EXISTS idx_ls_ledger_line_entry ON ls_ledger_line (entry_id);

-- Trigger: partida dobrada — Σ débito = Σ crédito por lançamento (§5).
-- Validação deferida ao COMMIT para permitir inserir as linhas do lançamento.
CREATE OR REPLACE FUNCTION ls_assert_balanced() RETURNS trigger AS $$
DECLARE d BIGINT; c BIGINT;
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
    INTO d, c FROM ls_ledger_line WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id);
  IF d <> c THEN
    RAISE EXCEPTION 'Lançamento % desbalanceado: débito=% crédito=% (§5)',
      COALESCE(NEW.entry_id, OLD.entry_id), d, c;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ls_ledger_balanced ON ls_ledger_line;
CREATE CONSTRAINT TRIGGER trg_ls_ledger_balanced
  AFTER INSERT OR UPDATE OR DELETE ON ls_ledger_line
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION ls_assert_balanced();

-- =============================================================================
-- 5) Ingestão TikTok + snapshots de KPI (§4, §7, §14)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ls_tiktok_connection (
  shop_id          TEXT PRIMARY KEY,
  bu_id            TEXT NOT NULL DEFAULT 'LIVE',
  shop_cipher      TEXT,
  region           TEXT NOT NULL DEFAULT 'BR',
  access_token_enc TEXT,                   -- cifrado em repouso (§14.3)
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes           TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_sync_cursor (
  domain         TEXT PRIMARY KEY CHECK (domain IN ('orders','finance','products')),
  bu_id          TEXT NOT NULL DEFAULT 'LIVE',
  last_synced_at TIMESTAMPTZ,
  page_token     TEXT,
  status         TEXT NOT NULL DEFAULT 'idle'
);

CREATE TABLE IF NOT EXISTS ls_webhook_event (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id        TEXT NOT NULL DEFAULT 'LIVE',
  event_type   TEXT NOT NULL,
  payload      JSONB,
  signature    TEXT,
  dedupe_key   TEXT NOT NULL UNIQUE,       -- idempotência (#14)
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'received'
);

CREATE TABLE IF NOT EXISTS ls_session_metrics (
  session_id     TEXT PRIMARY KEY REFERENCES ls_live_session(id) ON DELETE RESTRICT,
  bu_id          TEXT NOT NULL DEFAULT 'LIVE',
  gmv            BIGINT NOT NULL DEFAULT 0,
  paid_orders    INT NOT NULL DEFAULT 0,
  items          INT NOT NULL DEFAULT 0,
  customers      INT NOT NULL DEFAULT 0,
  aov            BIGINT NOT NULL DEFAULT 0,
  ctr_bps        INT NOT NULL DEFAULT 0,
  ctor_bps       INT NOT NULL DEFAULT 0,
  conversion_bps INT NOT NULL DEFAULT 0,
  return_rate_bps INT NOT NULL DEFAULT 0,
  take_rate_bps  INT NOT NULL DEFAULT 0,
  mc             BIGINT NOT NULL DEFAULT 0,
  mc_bps         INT NOT NULL DEFAULT 0,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ls_unit_econ_snapshot (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bu_id            TEXT NOT NULL DEFAULT 'LIVE',
  period           TEXT NOT NULL,           -- 'YYYY-MM' ou rótulo
  gmv              BIGINT NOT NULL DEFAULT 0,
  take_rate_bps    INT NOT NULL DEFAULT 0,
  mc               BIGINT NOT NULL DEFAULT 0,
  mc_bps           INT NOT NULL DEFAULT 0,
  net_to_awq       BIGINT NOT NULL DEFAULT 0,
  roic_bps         INT NOT NULL DEFAULT 0,
  hurdle_bps       INT NOT NULL DEFAULT 0,
  risk_premium_bps INT NOT NULL DEFAULT 0,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bu_id, period)
);

-- =============================================================================
-- 6) Seed reference: canal tiktok_shop + fees (Anexo A) + plano de contas
-- =============================================================================
INSERT INTO ls_channel (id, name, free_shipping_enrolled, new_seller_waiver_cap, payout_lag_days)
VALUES ('ch_tiktok_shop', 'tiktok_shop', true, 1700000, 14)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ls_fee_schedule (id, channel_id, effective_from, effective_to, shipping_service_bps, shipping_cap_per_item, payment_bps, source, confirmed) VALUES
  ('fee_v1','ch_tiktok_shop', NULL,          '2026-02-01', 600, 5000, 0, 'legado',       true),
  ('fee_v2','ch_tiktok_shop', '2026-02-01',  '2026-07-15', 600, 5000, 0, 'multiplas',    false),
  ('fee_v3','ch_tiktok_shop', '2026-07-15',  NULL,         600, 5000, 0, 'calc-terceira',false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ls_fee_tier (id, schedule_id, min_price, max_price, commission_bps, fixed_fee, fixed_fee_threshold) VALUES
  ('fee_v1_t1','fee_v1',    0, 7900,  600, 200, 7900),
  ('fee_v1_t2','fee_v1', 7900, NULL,  600,   0, NULL),
  ('fee_v2_t1','fee_v2',    0, NULL,  600, 400, NULL),
  ('fee_v3_t1','fee_v3',    0, 5000, 1000, 400, NULL),
  ('fee_v3_t2','fee_v3', 5000, NULL,  600, 600, NULL)
ON CONFLICT (id) DO NOTHING;

-- Plano de contas (§5) — espelha lib/live-shop/ledger.ts ACCOUNTS.
INSERT INTO ls_account (code, type, sign, label) VALUES
  ('rev_revenue_share_gmv','revenue', 1,'Revenue share sobre GMV'),
  ('rev_retainer','revenue', 1,'Retainer / fee fixo da marca'),
  ('rev_production_fee','revenue', 1,'Produção audiovisual da live'),
  ('ded_tiktok_commission','platform_deduction',-1,'Comissão % TikTok Shop'),
  ('ded_tiktok_fixed_fee','platform_deduction',-1,'Taxa fixa por item'),
  ('ded_tiktok_shipping','platform_deduction',-1,'Taxa de serviço de frete'),
  ('ded_payment_fee','platform_deduction',-1,'Taxa de pagamento'),
  ('ded_affiliate','deduction',-1,'Comissão creator/afiliado'),
  ('ded_returns_chargebacks','deduction',-1,'Devoluções / chargebacks'),
  ('cogs_product','cogs',-1,'CMV do produto'),
  ('dc_host','direct_cost',-1,'Host'),
  ('dc_operator','direct_cost',-1,'Operador'),
  ('dc_set','direct_cost',-1,'Set'),
  ('dc_ad_spend','direct_cost',-1,'Mídia'),
  ('dc_gmv_max_ads','direct_cost',-1,'GMV Max (alocação compulsória)'),
  ('alloc_caza_depreciation','allocation',-1,'Depreciação Caza rateada'),
  ('alloc_labor','allocation',-1,'Mão de obra rateada'),
  ('tax_das_simples','tax',-1,'DAS/Simples'),
  ('ast_settlement_receivable','asset', 1,'Repasse a receber (TikTok)'),
  ('ast_inventory_clearing','asset', 1,'Estoque / clearing CMV'),
  ('ast_cost_clearing','asset', 1,'Caixa / a pagar (clearing)')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 7) RLS por BU (§10) — fail-closed via GUC app.current_bu (padrão 003/004)
-- =============================================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ls_channel','ls_fee_schedule','ls_fee_tier','ls_product','ls_sku',
    'ls_live_session','ls_order','ls_order_item','ls_funnel_event','ls_fee_line',
    'ls_settlement','ls_settlement_line','ls_account','ls_ledger_entry',
    'ls_ledger_line','ls_tiktok_connection','ls_sync_cursor','ls_webhook_event',
    'ls_session_metrics','ls_unit_econ_snapshot'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON %I FROM anon', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', tbl);
    EXECUTE format('DROP POLICY IF EXISTS bu_isolation ON %I', tbl);
    EXECUTE format($f$
      CREATE POLICY bu_isolation ON %I FOR ALL TO authenticated
      USING      (bu_id = current_setting('app.current_bu', true))
      WITH CHECK (bu_id = current_setting('app.current_bu', true))
    $f$, tbl);
  END LOOP;
END $$;

-- =============================================================================
-- FIM — Migration 006
-- =============================================================================
