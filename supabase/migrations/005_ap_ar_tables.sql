-- ─── AP/AR Full Schema ────────────────────────────────────────────────────────
-- 9 tabelas: epm_ap, epm_ar, epm_suppliers, epm_customers, epm_ar_collections,
--            epm_ar_contracts, epm_cost_centers, epm_revenue_recognition,
--            epm_bank_transactions
-- Idempotente — seguro rodar múltiplas vezes (CREATE TABLE IF NOT EXISTS).

-- ─── 1. epm_ap (Contas a Pagar) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_ap (
  id               TEXT PRIMARY KEY,
  bu_code          TEXT NOT NULL,
  supplier_id      TEXT,
  supplier_name    TEXT NOT NULL,
  supplier_doc     TEXT,
  supplier_type    TEXT NOT NULL DEFAULT 'other',
  description      TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Fornecedor',
  cost_center      TEXT,
  reference_doc    TEXT,
  issue_date       TEXT NOT NULL,
  due_date         TEXT NOT NULL,
  gross_amount     NUMERIC NOT NULL,
  irrf_rate        NUMERIC NOT NULL DEFAULT 0,
  irrf_amount      NUMERIC NOT NULL DEFAULT 0,
  inss_rate        NUMERIC NOT NULL DEFAULT 0,
  inss_amount      NUMERIC NOT NULL DEFAULT 0,
  iss_rate         NUMERIC NOT NULL DEFAULT 0,
  iss_amount       NUMERIC NOT NULL DEFAULT 0,
  pis_rate         NUMERIC NOT NULL DEFAULT 0,
  pis_amount       NUMERIC NOT NULL DEFAULT 0,
  cofins_rate      NUMERIC NOT NULL DEFAULT 0,
  cofins_amount    NUMERIC NOT NULL DEFAULT 0,
  total_retentions NUMERIC NOT NULL DEFAULT 0,
  net_amount       NUMERIC NOT NULL,
  status           TEXT NOT NULL DEFAULT 'PENDING',
  paid_date        TEXT,
  paid_amount      NUMERIC,
  payment_ref      TEXT,
  source_system    TEXT NOT NULL DEFAULT 'manual',
  created_at       TEXT NOT NULL,
  created_by       TEXT
);

CREATE INDEX IF NOT EXISTS idx_epm_ap_bu_code  ON epm_ap(bu_code);
CREATE INDEX IF NOT EXISTS idx_epm_ap_status   ON epm_ap(status);
CREATE INDEX IF NOT EXISTS idx_epm_ap_due_date ON epm_ap(due_date);

-- ─── 2. epm_ar (Contas a Receber) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_ar (
  id              TEXT PRIMARY KEY,
  bu_code         TEXT NOT NULL,
  customer_id     TEXT,
  customer_name   TEXT NOT NULL,
  customer_doc    TEXT,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Serviço',
  cost_center     TEXT,
  reference_doc   TEXT,
  issue_date      TEXT NOT NULL,
  due_date        TEXT NOT NULL,
  gross_amount    NUMERIC NOT NULL,
  iss_rate        NUMERIC NOT NULL DEFAULT 0,
  iss_amount      NUMERIC NOT NULL DEFAULT 0,
  pis_rate        NUMERIC NOT NULL DEFAULT 0,
  pis_amount      NUMERIC NOT NULL DEFAULT 0,
  cofins_rate     NUMERIC NOT NULL DEFAULT 0,
  cofins_amount   NUMERIC NOT NULL DEFAULT 0,
  net_amount      NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'PENDING',
  received_date   TEXT,
  received_amount NUMERIC,
  receipt_ref     TEXT,
  source_system   TEXT NOT NULL DEFAULT 'manual',
  created_at      TEXT NOT NULL,
  created_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_epm_ar_bu_code  ON epm_ar(bu_code);
CREATE INDEX IF NOT EXISTS idx_epm_ar_status   ON epm_ar(status);
CREATE INDEX IF NOT EXISTS idx_epm_ar_due_date ON epm_ar(due_date);

-- ─── 3. epm_suppliers ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_suppliers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  doc           TEXT,
  email         TEXT,
  phone         TEXT,
  supplier_type TEXT NOT NULL DEFAULT 'other',
  bank_info     TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL
);

-- ─── 4. epm_customers ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_customers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  doc        TEXT,
  email      TEXT,
  phone      TEXT,
  address    TEXT,
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL
);

-- ─── 5. epm_ar_collections (Log de Cobranças) ────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_ar_collections (
  id              TEXT PRIMARY KEY,
  ar_id           TEXT NOT NULL REFERENCES epm_ar(id),
  collection_date TEXT NOT NULL,
  method          TEXT NOT NULL DEFAULT 'email',
  outcome         TEXT NOT NULL DEFAULT 'other',
  next_followup   TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_epm_ar_coll_ar_id ON epm_ar_collections(ar_id);

-- ─── 6. epm_ar_contracts (Contratos Recorrentes) ─────────────────────────────

CREATE TABLE IF NOT EXISTS epm_ar_contracts (
  id             TEXT PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  customer_doc   TEXT,
  description    TEXT NOT NULL,
  bu_code        TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'Serviço Recorrente',
  monthly_amount NUMERIC NOT NULL,
  billing_day    INTEGER NOT NULL DEFAULT 5,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  start_date     TEXT NOT NULL,
  end_date       TEXT,
  iss_rate       NUMERIC NOT NULL DEFAULT 0.05,
  next_invoice   TEXT,
  created_at     TEXT NOT NULL
);

-- ─── 7. epm_cost_centers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_cost_centers (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  bu_code     TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL
);

-- ─── 8. epm_revenue_recognition ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_revenue_recognition (
  id                 TEXT PRIMARY KEY,
  ar_id              TEXT NOT NULL,
  period             TEXT NOT NULL,
  recognized_amount  NUMERIC NOT NULL,
  recognition_method TEXT NOT NULL DEFAULT 'accrual',
  notes              TEXT,
  created_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_epm_rev_rec_ar_id  ON epm_revenue_recognition(ar_id);
CREATE INDEX IF NOT EXISTS idx_epm_rev_rec_period ON epm_revenue_recognition(period);

-- ─── 9. epm_bank_transactions (Reconciliação Bancária) ───────────────────────

CREATE TABLE IF NOT EXISTS epm_bank_transactions (
  id           TEXT PRIMARY KEY,
  txn_date     TEXT NOT NULL,
  description  TEXT NOT NULL,
  amount       NUMERIC NOT NULL,
  txn_type     TEXT NOT NULL,
  bank_ref     TEXT,
  status       TEXT NOT NULL DEFAULT 'unmatched',
  matched_id   TEXT,
  matched_type TEXT,
  bu_code      TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_epm_bank_txn_date   ON epm_bank_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_epm_bank_txn_status ON epm_bank_transactions(status);
