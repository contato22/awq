-- ─── Stub Modules — Full Schema ───────────────────────────────────────────────
-- BI, CPM, GRC, DMS, ERP, HCM — minimal tables for future expansion.
-- Each module has a settings table and a log table.

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
  query_def    JSONB NOT NULL DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS idx_cpm_kpi_values_kpi    ON cpm_kpi_values(kpi_id);
CREATE INDEX IF NOT EXISTS idx_cpm_kpi_values_period ON cpm_kpi_values(periodo);

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

CREATE INDEX IF NOT EXISTS idx_grc_risks_status     ON grc_risks(status);
CREATE INDEX IF NOT EXISTS idx_grc_controls_risk_id ON grc_controls(risk_id);

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
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_orders (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        TEXT NOT NULL DEFAULT 'Venda',
  status      TEXT NOT NULL DEFAULT 'Rascunho',
  total       NUMERIC NOT NULL DEFAULT 0,
  owner       TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_erp_items_sku         ON erp_items(sku);
CREATE INDEX IF NOT EXISTS idx_erp_orders_status     ON erp_orders(status);
CREATE INDEX IF NOT EXISTS idx_erp_order_items_order ON erp_order_items(order_id);

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

CREATE INDEX IF NOT EXISTS idx_hcm_employees_status ON hcm_employees(status);
CREATE INDEX IF NOT EXISTS idx_hcm_absences_emp     ON hcm_absences(employee_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE bi_dashboards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpm_kpis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpm_kpi_values          ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_risks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE grc_controls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_document_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcm_absences            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_bi_dashboards"         ON bi_dashboards;
CREATE POLICY "allow_all_bi_dashboards"         ON bi_dashboards           FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_bi_reports"            ON bi_reports;
CREATE POLICY "allow_all_bi_reports"            ON bi_reports              FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_cpm_kpis"              ON cpm_kpis;
CREATE POLICY "allow_all_cpm_kpis"              ON cpm_kpis                FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_cpm_kpi_values"        ON cpm_kpi_values;
CREATE POLICY "allow_all_cpm_kpi_values"        ON cpm_kpi_values          FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_grc_risks"             ON grc_risks;
CREATE POLICY "allow_all_grc_risks"             ON grc_risks               FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_grc_controls"          ON grc_controls;
CREATE POLICY "allow_all_grc_controls"          ON grc_controls            FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_dms_documents"         ON dms_documents;
CREATE POLICY "allow_all_dms_documents"         ON dms_documents           FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_dms_versions"          ON dms_document_versions;
CREATE POLICY "allow_all_dms_versions"          ON dms_document_versions   FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_erp_items"             ON erp_items;
CREATE POLICY "allow_all_erp_items"             ON erp_items               FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_erp_orders"            ON erp_orders;
CREATE POLICY "allow_all_erp_orders"            ON erp_orders              FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_erp_order_items"       ON erp_order_items;
CREATE POLICY "allow_all_erp_order_items"       ON erp_order_items         FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_hcm_employees"         ON hcm_employees;
CREATE POLICY "allow_all_hcm_employees"         ON hcm_employees           FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_hcm_absences"          ON hcm_absences;
CREATE POLICY "allow_all_hcm_absences"          ON hcm_absences            FOR ALL USING (true) WITH CHECK (true);
