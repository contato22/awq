-- ─── Stub Modules — Full Schema ───────────────────────────────────────────────
-- BI, CPM, GRC, DMS, ERP, HCM — full operational tables.

SET client_min_messages = WARNING;

-- ─── BI (Business Intelligence) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bi_dashboards (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config      JSONB NOT NULL DEFAULT '{}',
  owner       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bi_reports (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dashboard_id TEXT,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  query_def    JSONB NOT NULL DEFAULT '{}',
  owner        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_reports_dashboard ON bi_reports(dashboard_id);

-- ─── CPM (Corporate Performance Management) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS cpm_kpis (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  unit        TEXT NOT NULL DEFAULT '',
  target      NUMERIC,
  actual      NUMERIC,
  periodo     TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cpm_kpi_values (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kpi_id     TEXT NOT NULL,
  periodo    TEXT NOT NULL,
  value      NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cpm_okrs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  objective   TEXT NOT NULL,
  key_result  TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',
  quarter     TEXT NOT NULL DEFAULT '',
  progress    NUMERIC NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'Em Andamento',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cpm_scorecards (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  perspective TEXT NOT NULL DEFAULT 'Financeira',
  kpi_id      TEXT,
  target      NUMERIC,
  actual      NUMERIC,
  status      TEXT NOT NULL DEFAULT 'OK',
  periodo     TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpm_kpi_values_kpi    ON cpm_kpi_values(kpi_id);
CREATE INDEX IF NOT EXISTS idx_cpm_kpi_values_period ON cpm_kpi_values(periodo);
CREATE INDEX IF NOT EXISTS idx_cpm_okrs_quarter      ON cpm_okrs(quarter);
CREATE INDEX IF NOT EXISTS idx_cpm_scorecards_period ON cpm_scorecards(periodo);

-- ─── GRC (Governance, Risk & Compliance) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS grc_risks (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT '',
  probability  TEXT NOT NULL DEFAULT 'Médio',
  impact       TEXT NOT NULL DEFAULT 'Médio',
  status       TEXT NOT NULL DEFAULT 'Aberto',
  owner        TEXT NOT NULL DEFAULT '',
  mitigation   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grc_controls (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  risk_id     TEXT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Ativo',
  owner       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grc_audits (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  scope       TEXT NOT NULL DEFAULT '',
  auditor     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Planejada',
  start_date  DATE,
  end_date    DATE,
  findings    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grc_policies (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Vigente',
  version     TEXT NOT NULL DEFAULT '1.0',
  review_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grc_risks_status     ON grc_risks(status);
CREATE INDEX IF NOT EXISTS idx_grc_controls_risk_id ON grc_controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_grc_audits_status    ON grc_audits(status);
CREATE INDEX IF NOT EXISTS idx_grc_policies_status  ON grc_policies(status);

-- ─── DMS (Document Management System) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  file_url    TEXT,
  owner       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Ativo',
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dms_document_versions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL,
  version     INTEGER NOT NULL,
  file_url    TEXT,
  changed_by  TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_docs_status    ON dms_documents(status);
CREATE INDEX IF NOT EXISTS idx_dms_versions_docid ON dms_document_versions(document_id);

-- ─── ERP (Enterprise Resource Planning) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_items (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  unit        TEXT NOT NULL DEFAULT 'un',
  cost        NUMERIC NOT NULL DEFAULT 0,
  price       NUMERIC NOT NULL DEFAULT 0,
  stock       NUMERIC NOT NULL DEFAULT 0,
  location    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_orders (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        TEXT NOT NULL DEFAULT 'Venda',
  customer    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Rascunho',
  total       NUMERIC NOT NULL DEFAULT 0,
  owner       TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  order_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_order_items (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id   TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  qty        NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp_contracts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  party       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'Fornecedor',
  value       NUMERIC NOT NULL DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'Ativo',
  auto_renew  BOOLEAN NOT NULL DEFAULT FALSE,
  owner       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_assets (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT '',
  acquisition_date DATE,
  acquisition_cost NUMERIC NOT NULL DEFAULT 0,
  current_value    NUMERIC NOT NULL DEFAULT 0,
  depreciation_pct NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'Ativo',
  location         TEXT NOT NULL DEFAULT '',
  owner            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_timeentries (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee    TEXT NOT NULL DEFAULT '',
  project     TEXT NOT NULL DEFAULT '',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  hours       NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Pendente',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_items_sku          ON erp_items(sku);
CREATE INDEX IF NOT EXISTS idx_erp_orders_status      ON erp_orders(status);
CREATE INDEX IF NOT EXISTS idx_erp_order_items_order  ON erp_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_erp_contracts_status   ON erp_contracts(status);
CREATE INDEX IF NOT EXISTS idx_erp_assets_status      ON erp_assets(status);
CREATE INDEX IF NOT EXISTS idx_erp_timeentries_date   ON erp_timeentries(date DESC);

-- ─── HCM (Human Capital Management) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hcm_employees (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL DEFAULT '',
  department  TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Ativo',
  hire_date   DATE,
  salary      NUMERIC NOT NULL DEFAULT 0,
  manager     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hcm_absences (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'Férias',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Pendente',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hcm_payroll (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT NOT NULL,
  periodo     TEXT NOT NULL,
  gross       NUMERIC NOT NULL DEFAULT 0,
  deductions  NUMERIC NOT NULL DEFAULT 0,
  net         NUMERIC NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'Pendente',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hcm_recruitment (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  position     TEXT NOT NULL,
  department   TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Aberta',
  candidates   INTEGER NOT NULL DEFAULT 0,
  opened_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_date  DATE,
  owner        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hcm_training (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT NOT NULL,
  course      TEXT NOT NULL,
  provider    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Matriculado',
  start_date  DATE,
  end_date    DATE,
  hours       NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hcm_employees_status  ON hcm_employees(status);
CREATE INDEX IF NOT EXISTS idx_hcm_absences_emp      ON hcm_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_emp       ON hcm_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_hcm_payroll_periodo   ON hcm_payroll(periodo);
CREATE INDEX IF NOT EXISTS idx_hcm_recruitment_status ON hcm_recruitment(status);
CREATE INDEX IF NOT EXISTS idx_hcm_training_emp      ON hcm_training(employee_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE bi_dashboards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpm_kpis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpm_kpi_values          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpm_okrs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpm_scorecards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_risks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_controls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_audits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_policies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_document_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_assets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_timeentries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_absences            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_payroll             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_recruitment         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_training            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_bi_dashboards"    ON bi_dashboards;
CREATE POLICY "allow_all_bi_dashboards"    ON bi_dashboards         FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_bi_reports"       ON bi_reports;
CREATE POLICY "allow_all_bi_reports"       ON bi_reports            FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_cpm_kpis"         ON cpm_kpis;
CREATE POLICY "allow_all_cpm_kpis"         ON cpm_kpis              FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_cpm_kpi_values"   ON cpm_kpi_values;
CREATE POLICY "allow_all_cpm_kpi_values"   ON cpm_kpi_values        FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_cpm_okrs"         ON cpm_okrs;
CREATE POLICY "allow_all_cpm_okrs"         ON cpm_okrs              FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_cpm_scorecards"   ON cpm_scorecards;
CREATE POLICY "allow_all_cpm_scorecards"   ON cpm_scorecards        FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_grc_risks"        ON grc_risks;
CREATE POLICY "allow_all_grc_risks"        ON grc_risks             FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_grc_controls"     ON grc_controls;
CREATE POLICY "allow_all_grc_controls"     ON grc_controls          FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_grc_audits"       ON grc_audits;
CREATE POLICY "allow_all_grc_audits"       ON grc_audits            FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_grc_policies"     ON grc_policies;
CREATE POLICY "allow_all_grc_policies"     ON grc_policies          FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_dms_documents"    ON dms_documents;
CREATE POLICY "allow_all_dms_documents"    ON dms_documents         FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_dms_versions"     ON dms_document_versions;
CREATE POLICY "allow_all_dms_versions"     ON dms_document_versions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp_items"        ON erp_items;
CREATE POLICY "allow_all_erp_items"        ON erp_items             FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp_orders"       ON erp_orders;
CREATE POLICY "allow_all_erp_orders"       ON erp_orders            FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp_order_items"  ON erp_order_items;
CREATE POLICY "allow_all_erp_order_items"  ON erp_order_items       FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp_contracts"    ON erp_contracts;
CREATE POLICY "allow_all_erp_contracts"    ON erp_contracts         FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp_assets"       ON erp_assets;
CREATE POLICY "allow_all_erp_assets"       ON erp_assets            FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp_timeentries"  ON erp_timeentries;
CREATE POLICY "allow_all_erp_timeentries"  ON erp_timeentries       FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_hcm_employees"    ON hcm_employees;
CREATE POLICY "allow_all_hcm_employees"    ON hcm_employees         FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_hcm_absences"     ON hcm_absences;
CREATE POLICY "allow_all_hcm_absences"     ON hcm_absences          FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_hcm_payroll"      ON hcm_payroll;
CREATE POLICY "allow_all_hcm_payroll"      ON hcm_payroll           FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_hcm_recruitment"  ON hcm_recruitment;
CREATE POLICY "allow_all_hcm_recruitment"  ON hcm_recruitment       FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_hcm_training"     ON hcm_training;
CREATE POLICY "allow_all_hcm_training"     ON hcm_training          FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Expenses ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_expenses (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee    TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'Outros',
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC NOT NULL DEFAULT 0,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'Rascunho',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE erp_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_expenses" ON erp_expenses;
CREATE POLICY "allow_all_erp_expenses" ON erp_expenses FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Asset Maintenance ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_asset_maintenance (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  asset_name     TEXT NOT NULL DEFAULT '',
  type           TEXT NOT NULL DEFAULT 'Preventiva',
  description    TEXT NOT NULL DEFAULT '',
  scheduled_date DATE,
  completed_date DATE,
  responsible    TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Agendada',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE erp_asset_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_maintenance" ON erp_asset_maintenance;
CREATE POLICY "allow_all_erp_maintenance" ON erp_asset_maintenance FOR ALL USING (true) WITH CHECK (true);

-- ─── CPM Strategies ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cpm_strategies (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  pillar      TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT '',
  horizon     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Ativo',
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cpm_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_cpm_strategies" ON cpm_strategies;
CREATE POLICY "allow_all_cpm_strategies" ON cpm_strategies FOR ALL USING (true) WITH CHECK (true);

-- ─── CPM Reviews ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cpm_reviews (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title     TEXT NOT NULL,
  period    TEXT NOT NULL DEFAULT '',
  owner     TEXT NOT NULL DEFAULT '',
  status    TEXT NOT NULL DEFAULT 'Agendada',
  findings  TEXT NOT NULL DEFAULT '',
  actions   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cpm_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_cpm_reviews" ON cpm_reviews;
CREATE POLICY "allow_all_cpm_reviews" ON cpm_reviews FOR ALL USING (true) WITH CHECK (true);

-- ─── DMS Tasks (Collaboration) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_tasks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  document_id TEXT,
  assignee    TEXT NOT NULL DEFAULT '',
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'Aberta',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dms_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_dms_tasks" ON dms_tasks;
CREATE POLICY "allow_all_dms_tasks" ON dms_tasks FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Invoices (Billing) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_invoices (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer   TEXT NOT NULL DEFAULT '',
  order_id   TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value      NUMERIC NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_invoices" ON erp_invoices;
CREATE POLICY "allow_all_erp_invoices" ON erp_invoices FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Fulfillment ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_fulfillment (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer   TEXT NOT NULL DEFAULT '',
  order_id   TEXT,
  priority   TEXT NOT NULL DEFAULT 'Normal',
  status     TEXT NOT NULL DEFAULT 'Aguardando',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_fulfillment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_fulfillment" ON erp_fulfillment;
CREATE POLICY "allow_all_erp_fulfillment" ON erp_fulfillment FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Shipments (Shipping) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_shipments (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  carrier           TEXT NOT NULL DEFAULT '',
  shipment_date     DATE,
  estimated_delivery DATE,
  status            TEXT NOT NULL DEFAULT 'Agendado',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_shipments" ON erp_shipments;
CREATE POLICY "allow_all_erp_shipments" ON erp_shipments FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Asset Disposals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_asset_disposals (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  asset_name    TEXT NOT NULL DEFAULT '',
  reason        TEXT NOT NULL DEFAULT 'Obsolescência',
  disposal_date DATE,
  book_value    NUMERIC NOT NULL DEFAULT 0,
  sale_price    NUMERIC NOT NULL DEFAULT 0,
  responsible   TEXT NOT NULL DEFAULT '',
  result        TEXT NOT NULL DEFAULT 'Perda',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_asset_disposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_disposals" ON erp_asset_disposals;
CREATE POLICY "allow_all_erp_disposals" ON erp_asset_disposals FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Requisitions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_requisitions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_name   TEXT NOT NULL DEFAULT '',
  quantity    NUMERIC NOT NULL DEFAULT 1,
  requester   TEXT NOT NULL DEFAULT '',
  needed_date DATE,
  status      TEXT NOT NULL DEFAULT 'Aberta',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_requisitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_requisitions" ON erp_requisitions;
CREATE POLICY "allow_all_erp_requisitions" ON erp_requisitions FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Receiving ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_receiving (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier      TEXT NOT NULL DEFAULT '',
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_name     TEXT NOT NULL DEFAULT '',
  quantity      NUMERIC NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'Pendente',
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_receiving ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_receiving" ON erp_receiving;
CREATE POLICY "allow_all_erp_receiving" ON erp_receiving FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Inventory Movements ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_inventory_movements (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        TEXT NOT NULL DEFAULT 'Entrada',
  item_name   TEXT NOT NULL DEFAULT '',
  quantity    NUMERIC NOT NULL DEFAULT 0,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  origin      TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  reference   TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_movements" ON erp_inventory_movements;
CREATE POLICY "allow_all_erp_movements" ON erp_inventory_movements FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Warehouses ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_warehouses (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code       TEXT NOT NULL DEFAULT '',
  name       TEXT NOT NULL DEFAULT '',
  address    TEXT NOT NULL DEFAULT '',
  capacity   TEXT NOT NULL DEFAULT '',
  manager    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_warehouses" ON erp_warehouses;
CREATE POLICY "allow_all_erp_warehouses" ON erp_warehouses FOR ALL USING (true) WITH CHECK (true);

-- ─── ERP Contract Obligations ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_contract_obligations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contract_name TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL DEFAULT '',
  responsible   TEXT NOT NULL DEFAULT '',
  due_date      DATE,
  recurrence    TEXT NOT NULL DEFAULT 'Única',
  status        TEXT NOT NULL DEFAULT 'Pendente',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE erp_contract_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_erp_obligations" ON erp_contract_obligations;
CREATE POLICY "allow_all_erp_obligations" ON erp_contract_obligations FOR ALL USING (true) WITH CHECK (true);
