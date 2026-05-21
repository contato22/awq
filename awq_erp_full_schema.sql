-- =============================================================================
-- AWQ GROUP — ERP Full Schema (PostgreSQL / Supabase)
-- =============================================================================
-- Enterprise Resource Planning — Core Operational Modules
--
-- Módulos:
--   1. erp_assets          — Gestão de Ativo Fixo
--   2. erp_expenses        — Relatórios de Despesa / Reembolso
--   3. erp_inventory_items — Produtos e Itens em Estoque
--   4. erp_inventory_warehouses — Almoxarifados
--   5. erp_inventory_movements  — Movimentações de Estoque
--   6. erp_sales_orders    — Pedidos de Venda
--   7. erp_purchases       — Pedidos de Compra
--   8. erp_contracts       — Contratos
--   9. erp_time_entries    — Registro de Horas
--  10. financial_documents — Documentos de Extrato Bancário (Cora API sync)
--  11. bank_transactions   — Transações Bancárias (Cora API sync)
--
-- Projeto Supabase: kkhxxsrgsewjfvnnssyf
-- Usuários: TEXT IDs mapeados de lib/auth-users.ts ("1"–"6")
-- Atualizado: 2026-05-21 — financial tables + GRANT para anon/authenticated
-- =============================================================================

-- =============================================================================
-- 1. ATIVO FIXO
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_assets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL UNIQUE,        -- ex: ATI-0001
  description     TEXT        NOT NULL,
  category        TEXT        NOT NULL,               -- Equipamento, Móvel, Veículo, Software, Imóvel
  location        TEXT,                               -- filial / sala / sala-servidor
  serial_number   TEXT,
  supplier        TEXT,
  acquisition_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  acquisition_date  DATE,
  useful_life_months INTEGER,                         -- para depreciação
  residual_value    NUMERIC(14,2) DEFAULT 0,
  depreciation_method TEXT DEFAULT 'linear'
    CHECK (depreciation_method IN ('linear','declining')),
  status          TEXT        NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo','Em Manutenção','Baixado')),
  notes           TEXT,
  created_by      TEXT,                              -- user_id from auth-users.ts
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_assets_status   ON erp_assets(status);
CREATE INDEX IF NOT EXISTS idx_erp_assets_category ON erp_assets(category);

-- =============================================================================
-- 2. DESPESAS / REEMBOLSO
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_expenses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  category        TEXT        NOT NULL
    CHECK (category IN ('Viagem','Refeição','Hospedagem','Transporte','Software','Outros')),
  amount          NUMERIC(12,2) NOT NULL,
  expense_date    DATE        NOT NULL,
  submitter_id    TEXT        NOT NULL,              -- user_id
  submitter_name  TEXT        NOT NULL,
  approver_id     TEXT,                              -- user_id
  bu_code         TEXT        NOT NULL DEFAULT 'AWQ',
  receipt_url     TEXT,                              -- Vercel Blob URL
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'Rascunho'
    CHECK (status IN ('Rascunho','Submetido','Aprovado','Rejeitado','Pago')),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_expenses_status       ON erp_expenses(status);
CREATE INDEX IF NOT EXISTS idx_erp_expenses_submitter    ON erp_expenses(submitter_id);
CREATE INDEX IF NOT EXISTS idx_erp_expenses_bu           ON erp_expenses(bu_code);
CREATE INDEX IF NOT EXISTS idx_erp_expenses_date         ON erp_expenses(expense_date DESC);

-- =============================================================================
-- 3. ALMOXARIFADOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_inventory_warehouses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  location        TEXT,
  manager_id      TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. PRODUTOS / ITENS
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_inventory_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL,
  unit            TEXT        NOT NULL DEFAULT 'un',  -- un, kg, m, cx
  unit_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price      NUMERIC(12,2),
  stock_qty       NUMERIC(14,3) NOT NULL DEFAULT 0,
  min_stock       NUMERIC(14,3) NOT NULL DEFAULT 0,
  warehouse_id    UUID        REFERENCES erp_inventory_warehouses(id),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_items_category    ON erp_inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_erp_items_warehouse   ON erp_inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_erp_items_sku         ON erp_inventory_items(sku);

-- =============================================================================
-- 5. MOVIMENTAÇÕES DE ESTOQUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_inventory_movements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID        NOT NULL REFERENCES erp_inventory_items(id),
  warehouse_id    UUID        REFERENCES erp_inventory_warehouses(id),
  movement_type   TEXT        NOT NULL
    CHECK (movement_type IN ('entrada','saida','ajuste','transferencia')),
  qty             NUMERIC(14,3) NOT NULL,
  unit_cost       NUMERIC(12,2),
  reference_type  TEXT,                            -- 'purchase_order','sales_order','manual'
  reference_id    UUID,
  notes           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_movements_item      ON erp_inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_erp_movements_warehouse ON erp_inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_erp_movements_date      ON erp_inventory_movements(created_at DESC);

-- =============================================================================
-- 6. PEDIDOS DE VENDA
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_sales_orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT        NOT NULL UNIQUE,      -- ex: PV-2025-001
  customer_name   TEXT        NOT NULL,
  customer_cnpj   TEXT,
  bu_code         TEXT        NOT NULL DEFAULT 'AWQ',
  order_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  delivery_date   DATE,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) DEFAULT 0,
  tax_amount      NUMERIC(12,2) DEFAULT 0,
  items           JSONB       NOT NULL DEFAULT '[]', -- [{sku, name, qty, unit_price}]
  status          TEXT        NOT NULL DEFAULT 'Novo'
    CHECK (status IN ('Novo','Em Processamento','Faturado','Entregue','Cancelado')),
  payment_terms   TEXT,
  notes           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_sales_status     ON erp_sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_erp_sales_customer   ON erp_sales_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_erp_sales_date       ON erp_sales_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_erp_sales_bu         ON erp_sales_orders(bu_code);

-- =============================================================================
-- 7. PEDIDOS DE COMPRA
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_purchases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT        NOT NULL UNIQUE,      -- ex: PC-2025-001
  supplier_name   TEXT        NOT NULL,
  supplier_cnpj   TEXT,
  bu_code         TEXT        NOT NULL DEFAULT 'AWQ',
  order_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  items           JSONB       NOT NULL DEFAULT '[]', -- [{sku, name, qty, unit_cost}]
  status          TEXT        NOT NULL DEFAULT 'Rascunho'
    CHECK (status IN ('Rascunho','Aprovado','Recebido','Cancelado')),
  payment_terms   TEXT,
  notes           TEXT,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_purchases_status   ON erp_purchases(status);
CREATE INDEX IF NOT EXISTS idx_erp_purchases_supplier ON erp_purchases(supplier_name);
CREATE INDEX IF NOT EXISTS idx_erp_purchases_date     ON erp_purchases(order_date DESC);

-- =============================================================================
-- 8. CONTRATOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_contracts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT        NOT NULL UNIQUE,
  title           TEXT        NOT NULL,
  party_name      TEXT        NOT NULL,             -- fornecedor ou cliente
  party_cnpj      TEXT,
  contract_type   TEXT        NOT NULL
    CHECK (contract_type IN ('cliente','fornecedor','parceria','locacao','outros')),
  bu_code         TEXT        NOT NULL DEFAULT 'AWQ',
  start_date      DATE        NOT NULL,
  end_date        DATE,
  value           NUMERIC(14,2),
  payment_terms   TEXT,
  auto_renew      BOOLEAN     NOT NULL DEFAULT FALSE,
  renewal_notice_days INTEGER DEFAULT 30,
  status          TEXT        NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo','Em Renovação','Encerrado','Suspenso')),
  document_url    TEXT,
  notes           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_contracts_status   ON erp_contracts(status);
CREATE INDEX IF NOT EXISTS idx_erp_contracts_type     ON erp_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_erp_contracts_end      ON erp_contracts(end_date);

-- =============================================================================
-- 9. REGISTRO DE HORAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_time_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL,
  user_name       TEXT        NOT NULL,
  project_ref     TEXT,                             -- ppm project_id or label
  task_description TEXT       NOT NULL,
  bu_code         TEXT        NOT NULL DEFAULT 'AWQ',
  entry_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  hours           NUMERIC(5,2) NOT NULL,
  billable        BOOLEAN     NOT NULL DEFAULT TRUE,
  hourly_rate     NUMERIC(10,2),
  status          TEXT        NOT NULL DEFAULT 'Registrado'
    CHECK (status IN ('Registrado','Submetido','Aprovado','Rejeitado')),
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_time_user   ON erp_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_erp_time_date   ON erp_time_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_erp_time_status ON erp_time_entries(status);

-- =============================================================================
-- AUTO-UPDATE TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION erp_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'erp_assets','erp_expenses','erp_inventory_items',
    'erp_sales_orders','erp_purchases','erp_contracts','erp_time_entries'
  ]) LOOP
    EXECUTE format('
      CREATE OR REPLACE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION erp_set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE erp_assets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_expenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_inventory_warehouses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_inventory_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sales_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_purchases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contracts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_time_entries          ENABLE ROW LEVEL SECURITY;

CREATE POLICY erp_assets_read               ON erp_assets               FOR SELECT USING (true);
CREATE POLICY erp_expenses_read             ON erp_expenses             FOR SELECT USING (true);
CREATE POLICY erp_inventory_warehouses_read ON erp_inventory_warehouses FOR SELECT USING (true);
CREATE POLICY erp_inventory_items_read      ON erp_inventory_items      FOR SELECT USING (true);
CREATE POLICY erp_inventory_movements_read  ON erp_inventory_movements  FOR SELECT USING (true);
CREATE POLICY erp_sales_orders_read         ON erp_sales_orders         FOR SELECT USING (true);
CREATE POLICY erp_purchases_read            ON erp_purchases            FOR SELECT USING (true);
CREATE POLICY erp_contracts_read            ON erp_contracts            FOR SELECT USING (true);
CREATE POLICY erp_time_entries_read         ON erp_time_entries         FOR SELECT USING (true);

-- =============================================================================
-- 10. DOCUMENTOS FINANCEIROS + TRANSAÇÕES BANCÁRIAS (Cora API sync)
-- =============================================================================
-- Estas tabelas ficam neste projeto (kkhxxsrgsewjfvnnssyf) porque o projeto
-- financeiro dedicado (gqkgsoglgubmaborixfb) não tem service-role key no Vercel.
-- A anon key deste projeto está disponível em Vercel via fallback hardcoded em
-- lib/supabase.ts. Sem RLS — acesso controlado pelos GRANTs abaixo.

CREATE TABLE IF NOT EXISTS financial_documents (
  id                  TEXT PRIMARY KEY,
  filename            TEXT NOT NULL,
  file_hash           TEXT NOT NULL UNIQUE,
  bank                TEXT NOT NULL,
  account_name        TEXT NOT NULL,
  account_number      TEXT,
  entity              TEXT NOT NULL,
  period_start        TEXT,
  period_end          TEXT,
  opening_balance     NUMERIC,
  closing_balance     NUMERIC,
  uploaded_at         TEXT NOT NULL,
  uploaded_by         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'received',
  error_message       TEXT,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  parser_confidence   TEXT,
  extraction_notes    TEXT,
  blob_url            TEXT
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                          TEXT PRIMARY KEY,
  document_id                 TEXT NOT NULL REFERENCES financial_documents(id),
  bank                        TEXT NOT NULL,
  account_name                TEXT NOT NULL,
  entity                      TEXT NOT NULL,
  transaction_date            TEXT NOT NULL,
  description_original        TEXT NOT NULL,
  amount                      NUMERIC NOT NULL,
  direction                   TEXT NOT NULL,
  running_balance             NUMERIC,
  counterparty_name           TEXT,
  managerial_category         TEXT NOT NULL,
  classification_confidence   TEXT NOT NULL,
  classification_note         TEXT,
  is_intercompany             BOOLEAN NOT NULL DEFAULT false,
  intercompany_match_id       TEXT,
  excluded_from_consolidated  BOOLEAN NOT NULL DEFAULT false,
  reconciliation_status       TEXT NOT NULL DEFAULT 'pendente',
  extracted_at                TEXT NOT NULL,
  classified_at               TEXT
);

CREATE INDEX IF NOT EXISTS idx_fin_bt_document_id ON bank_transactions(document_id);
CREATE INDEX IF NOT EXISTS idx_fin_bt_entity       ON bank_transactions(entity);
CREATE INDEX IF NOT EXISTS idx_fin_bt_date         ON bank_transactions(transaction_date);

-- Acesso total para anon e authenticated (sem RLS — auth feita via NextAuth nas rotas)
GRANT ALL ON financial_documents TO anon, authenticated;
GRANT ALL ON bank_transactions   TO anon, authenticated;

ALTER TABLE financial_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions   DISABLE ROW LEVEL SECURITY;
