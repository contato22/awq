-- =============================================================================
-- AWQ GROUP — EPM Full Schema (PostgreSQL / Neon)
-- =============================================================================
-- Camadas:
--   1. Master Data  — business_units, accounts (CoA), fiscal_periods,
--                     suppliers, customers, bank_accounts
--   2. Transactional — general_ledger, accounts_payable, accounts_receivable,
--                      bank_transactions, fixed_assets
--   3. Analytical   — budgets, budget_versions, kpi_catalog, kpi_values
--   4. Views        — v_pl_gerencial, v_balance_sheet, v_ap_aging,
--                     v_ar_aging, v_budget_vs_actual, v_kpi_dashboard
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. MASTER DATA
-- =============================================================================

-- ─── Business Units ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_units (
  bu_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_code        TEXT        NOT NULL UNIQUE,          -- 'AWQ','JACQES','CAZA','ADVISOR','VENTURE'
  bu_name        TEXT        NOT NULL,
  economic_type  TEXT        NOT NULL CHECK (economic_type IN
                   ('holding','operating','pre_revenue','hybrid_investment')),
  parent_bu_id   UUID        REFERENCES business_units(bu_id),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO business_units (bu_code, bu_name, economic_type) VALUES
  ('AWQ',     'AWQ Group (Holding)',    'holding'),
  ('JACQES',  'JACQES',                'operating'),
  ('CAZA',    'Caza Vision',           'operating'),
  ('ADVISOR', 'Advisor',               'pre_revenue'),
  ('VENTURE', 'AWQ Venture',           'hybrid_investment')
ON CONFLICT (bu_code) DO NOTHING;

-- ─── Chart of Accounts (Plano de Contas) ─────────────────────────────────────
-- Hierarchical: Level 1 (group) → Level 2 (subgroup) → Level 3 (account)
-- account_type: ASSET | LIABILITY | EQUITY | REVENUE | COGS | EXPENSE | INTERCOMPANY

CREATE TABLE IF NOT EXISTS accounts (
  account_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code      TEXT        NOT NULL UNIQUE,   -- e.g. '1.1.01'
  account_name      TEXT        NOT NULL,
  parent_account_id UUID        REFERENCES accounts(account_id),
  level             SMALLINT    NOT NULL CHECK (level BETWEEN 1 AND 3),
  account_type      TEXT        NOT NULL CHECK (account_type IN
                      ('ASSET','LIABILITY','EQUITY','REVENUE','COGS',
                       'EXPENSE','FINANCIAL_REVENUE','FINANCIAL_EXPENSE',
                       'INTERCOMPANY')),
  normal_balance    TEXT        NOT NULL CHECK (normal_balance IN ('DEBIT','CREDIT')),
  is_intercompany   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plano de Contas Brasil (padrão AWQ)
INSERT INTO accounts (account_code, account_name, level, account_type, normal_balance) VALUES
  -- ── ATIVO ──────────────────────────────────────────────────────────────────
  ('1',      'ATIVO',                         1, 'ASSET',      'DEBIT'),
  ('1.1',    'Ativo Circulante',               2, 'ASSET',      'DEBIT'),
  ('1.1.01', 'Caixa e Equivalentes',           3, 'ASSET',      'DEBIT'),
  ('1.1.02', 'Contas a Receber',               3, 'ASSET',      'DEBIT'),
  ('1.1.03', 'Adiantamentos a Fornecedores',   3, 'ASSET',      'DEBIT'),
  ('1.1.04', 'Outros Créditos Circulantes',    3, 'ASSET',      'DEBIT'),
  ('1.2',    'Ativo Não Circulante',           2, 'ASSET',      'DEBIT'),
  ('1.2.01', 'Imobilizado (líquido)',          3, 'ASSET',      'DEBIT'),
  ('1.2.02', 'Intangível (líquido)',           3, 'ASSET',      'DEBIT'),
  ('1.2.03', 'Investimentos / Aplicações LP',  3, 'ASSET',      'DEBIT'),
  -- ── PASSIVO ────────────────────────────────────────────────────────────────
  ('2',      'PASSIVO',                        1, 'LIABILITY',  'CREDIT'),
  ('2.1',    'Passivo Circulante',             2, 'LIABILITY',  'CREDIT'),
  ('2.1.01', 'Fornecedores (Contas a Pagar)',  3, 'LIABILITY',  'CREDIT'),
  ('2.1.02', 'Obrigações Fiscais',             3, 'LIABILITY',  'CREDIT'),
  ('2.1.03', 'Obrigações Trabalhistas',        3, 'LIABILITY',  'CREDIT'),
  ('2.1.04', 'Outros Passivos Circulantes',    3, 'LIABILITY',  'CREDIT'),
  ('2.2',    'Passivo Não Circulante',         2, 'LIABILITY',  'CREDIT'),
  ('2.2.01', 'Empréstimos e Financiamentos LP',3, 'LIABILITY',  'CREDIT'),
  -- ── PATRIMÔNIO LÍQUIDO ─────────────────────────────────────────────────────
  ('3',      'PATRIMÔNIO LÍQUIDO',             1, 'EQUITY',     'CREDIT'),
  ('3.1',    'Patrimônio Líquido',             2, 'EQUITY',     'CREDIT'),
  ('3.1.01', 'Capital Social',                 3, 'EQUITY',     'CREDIT'),
  ('3.1.02', 'Reservas de Lucros',             3, 'EQUITY',     'CREDIT'),
  ('3.1.03', 'Lucros / Prejuízos Acumulados',  3, 'EQUITY',     'CREDIT'),
  -- ── RECEITA ────────────────────────────────────────────────────────────────
  ('4',      'RECEITAS',                       1, 'REVENUE',    'CREDIT'),
  ('4.1',    'Receita Operacional',            2, 'REVENUE',    'CREDIT'),
  ('4.1.01', 'Receita de Serviços (JACQES)',   3, 'REVENUE',    'CREDIT'),
  ('4.1.02', 'Receita de Produção (Caza Vision)',3,'REVENUE',   'CREDIT'),
  ('4.1.03', 'Receita de Consultoria (Advisor)',3,'REVENUE',    'CREDIT'),
  ('4.1.04', 'Fee de Gestão (Venture)',        3, 'REVENUE',    'CREDIT'),
  ('4.1.05', 'Outras Receitas de Serviços',    3, 'REVENUE',    'CREDIT'),
  ('4.2',    'Receita Financeira',             2, 'FINANCIAL_REVENUE','CREDIT'),
  ('4.2.01', 'Rendimentos de Aplicações',      3, 'FINANCIAL_REVENUE','CREDIT'),
  ('4.2.02', 'Ajustes e Créditos Bancários',   3, 'FINANCIAL_REVENUE','CREDIT'),
  -- ── CUSTOS ─────────────────────────────────────────────────────────────────
  ('5',      'CUSTOS',                         1, 'COGS',       'DEBIT'),
  ('5.1',    'Custo dos Serviços Vendidos',    2, 'COGS',       'DEBIT'),
  ('5.1.01', 'Freelancers e Terceiros',        3, 'COGS',       'DEBIT'),
  ('5.1.02', 'Fornecedor Operacional',         3, 'COGS',       'DEBIT'),
  -- ── DESPESAS OPERACIONAIS ──────────────────────────────────────────────────
  ('6',      'DESPESAS OPERACIONAIS',          1, 'EXPENSE',    'DEBIT'),
  ('6.1',    'Despesas Administrativas',       2, 'EXPENSE',    'DEBIT'),
  ('6.1.01', 'Salários e Encargos',            3, 'EXPENSE',    'DEBIT'),
  ('6.1.02', 'Pró-labore / Retirada do Sócio', 3,'EXPENSE',    'DEBIT'),
  ('6.1.03', 'Impostos e Tributos',            3, 'EXPENSE',    'DEBIT'),
  ('6.1.04', 'Tarifa Bancária',                3, 'EXPENSE',    'DEBIT'),
  ('6.1.05', 'Software e Assinaturas',         3, 'EXPENSE',    'DEBIT'),
  ('6.1.06', 'Aluguel e Locação',              3, 'EXPENSE',    'DEBIT'),
  ('6.1.07', 'Energia / Água / Internet',      3, 'EXPENSE',    'DEBIT'),
  ('6.1.08', 'Serviços Contábeis / Jurídicos', 3, 'EXPENSE',    'DEBIT'),
  ('6.2',    'Despesas Comerciais',            2, 'EXPENSE',    'DEBIT'),
  ('6.2.01', 'Marketing e Mídia Paga',         3, 'EXPENSE',    'DEBIT'),
  ('6.2.02', 'Comissões de Venda',             3, 'EXPENSE',    'DEBIT'),
  ('6.3',    'Despesas Diversas',              2, 'EXPENSE',    'DEBIT'),
  ('6.3.01', 'Deslocamento e Combustível',     3, 'EXPENSE',    'DEBIT'),
  ('6.3.02', 'Alimentação e Representação',    3, 'EXPENSE',    'DEBIT'),
  ('6.3.03', 'Viagem e Hospedagem',            3, 'EXPENSE',    'DEBIT'),
  ('6.3.04', 'Compras via Cartão Corporativo', 3, 'EXPENSE',    'DEBIT'),
  ('6.3.05', 'Despesas Pessoais Mistas',       3, 'EXPENSE',    'DEBIT'),
  -- ── DESPESAS FINANCEIRAS ───────────────────────────────────────────────────
  ('7',      'DESPESAS FINANCEIRAS',           1, 'FINANCIAL_EXPENSE','DEBIT'),
  ('7.1',    'Despesas Financeiras',           2, 'FINANCIAL_EXPENSE','DEBIT'),
  ('7.1.01', 'Juros / Multa / IOF',            3, 'FINANCIAL_EXPENSE','DEBIT'),
  -- ── INTERCOMPANY ───────────────────────────────────────────────────────────
  ('9',      'CONTAS INTERCOMPANY',            1, 'INTERCOMPANY','DEBIT'),
  ('9.1',    'AR Intercompany',               2, 'INTERCOMPANY','DEBIT'),
  ('9.1.01', 'AR Intercompany — JACQES',      3, 'INTERCOMPANY','DEBIT'),
  ('9.1.02', 'AR Intercompany — Caza Vision', 3, 'INTERCOMPANY','DEBIT'),
  ('9.2',    'AP Intercompany',               2, 'INTERCOMPANY','CREDIT'),
  ('9.2.01', 'AP Intercompany — AWQ Holding', 3, 'INTERCOMPANY','CREDIT')
ON CONFLICT (account_code) DO NOTHING;

-- Set is_intercompany flag
UPDATE accounts SET is_intercompany = TRUE WHERE account_code LIKE '9%';

-- Link parent accounts
UPDATE accounts a SET parent_account_id = p.account_id
FROM accounts p
WHERE
  (a.account_code = '1.1'    AND p.account_code = '1')   OR
  (a.account_code = '1.2'    AND p.account_code = '1')   OR
  (a.account_code = '2.1'    AND p.account_code = '2')   OR
  (a.account_code = '2.2'    AND p.account_code = '2')   OR
  (a.account_code = '3.1'    AND p.account_code = '3')   OR
  (a.account_code = '4.1'    AND p.account_code = '4')   OR
  (a.account_code = '4.2'    AND p.account_code = '4')   OR
  (a.account_code = '5.1'    AND p.account_code = '5')   OR
  (a.account_code = '6.1'    AND p.account_code = '6')   OR
  (a.account_code = '6.2'    AND p.account_code = '6')   OR
  (a.account_code = '6.3'    AND p.account_code = '6')   OR
  (a.account_code = '7.1'    AND p.account_code = '7')   OR
  (a.account_code = '9.1'    AND p.account_code = '9')   OR
  (a.account_code = '9.2'    AND p.account_code = '9');

UPDATE accounts a SET parent_account_id = p.account_id
FROM accounts p
WHERE length(a.account_code) = 6
  AND substr(a.account_code, 1, 3) = p.account_code;

-- ─── Fiscal Periods ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fiscal_periods (
  period_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_code  TEXT        NOT NULL UNIQUE,   -- '2026-01', '2026-Q1', '2026'
  period_type  TEXT        NOT NULL CHECK (period_type IN ('MONTH','QUARTER','YEAR')),
  fiscal_year  SMALLINT    NOT NULL,
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  is_closed    BOOLEAN     NOT NULL DEFAULT FALSE,
  closed_at    TIMESTAMPTZ,
  closed_by    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Seed FY 2026 monthly periods
INSERT INTO fiscal_periods (period_code, period_type, fiscal_year, start_date, end_date) VALUES
  ('2026-01', 'MONTH', 2026, '2026-01-01', '2026-01-31'),
  ('2026-02', 'MONTH', 2026, '2026-02-01', '2026-02-28'),
  ('2026-03', 'MONTH', 2026, '2026-03-01', '2026-03-31'),
  ('2026-04', 'MONTH', 2026, '2026-04-01', '2026-04-30'),
  ('2026-05', 'MONTH', 2026, '2026-05-01', '2026-05-31'),
  ('2026-06', 'MONTH', 2026, '2026-06-01', '2026-06-30'),
  ('2026-07', 'MONTH', 2026, '2026-07-01', '2026-07-31'),
  ('2026-08', 'MONTH', 2026, '2026-08-01', '2026-08-31'),
  ('2026-09', 'MONTH', 2026, '2026-09-01', '2026-09-30'),
  ('2026-10', 'MONTH', 2026, '2026-10-01', '2026-10-31'),
  ('2026-11', 'MONTH', 2026, '2026-11-01', '2026-11-30'),
  ('2026-12', 'MONTH', 2026, '2026-12-01', '2026-12-31'),
  ('2026-Q1', 'QUARTER', 2026, '2026-01-01', '2026-03-31'),
  ('2026-Q2', 'QUARTER', 2026, '2026-04-01', '2026-06-30'),
  ('2026-Q3', 'QUARTER', 2026, '2026-07-01', '2026-09-30'),
  ('2026-Q4', 'QUARTER', 2026, '2026-10-01', '2026-12-31'),
  ('2026',    'YEAR',    2026, '2026-01-01', '2026-12-31')
ON CONFLICT (period_code) DO NOTHING;

-- ─── Suppliers ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code  TEXT        UNIQUE,
  legal_name     TEXT        NOT NULL,
  trade_name     TEXT,
  document_type  TEXT        CHECK (document_type IN ('CPF','CNPJ')),
  document_number TEXT       UNIQUE,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  bank_name      TEXT,
  bank_agency    TEXT,
  bank_account   TEXT,
  pix_key        TEXT,
  payment_terms  SMALLINT    DEFAULT 30,    -- days
  bu_id          UUID        REFERENCES business_units(bu_id),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     TEXT
);

-- ─── Customers ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  customer_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code   TEXT        UNIQUE,
  legal_name      TEXT        NOT NULL,
  trade_name      TEXT,
  document_type   TEXT        CHECK (document_type IN ('CPF','CNPJ')),
  document_number TEXT        UNIQUE,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  credit_limit    NUMERIC(15,2) DEFAULT 0,
  payment_terms   SMALLINT    DEFAULT 30,
  bu_id           UUID        REFERENCES business_units(bu_id),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT
);

-- ─── Bank Accounts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_accounts (
  bank_account_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name     TEXT        NOT NULL,
  bu_id            UUID        REFERENCES business_units(bu_id),
  bank_code        TEXT,
  bank_name        TEXT        NOT NULL,
  agency           TEXT,
  account_number   TEXT,
  account_type     TEXT        CHECK (account_type IN ('CHECKING','SAVINGS','INVESTMENT')),
  currency         CHAR(3)     NOT NULL DEFAULT 'BRL',
  current_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_date     DATE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bank_accounts (account_name, bank_name, account_type) VALUES
  ('Cora — AWQ Holding',  'Cora',  'CHECKING'),
  ('Cora — JACQES',       'Cora',  'CHECKING'),
  ('Itaú — Caza Vision',  'Itaú',  'CHECKING')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. TRANSACTIONAL
-- =============================================================================

-- ─── General Ledger ──────────────────────────────────────────────────────────
-- Double-entry: every journal must have SUM(debit) = SUM(credit).
-- journal_id groups the two (or more) legs of one entry.

CREATE TABLE IF NOT EXISTS general_ledger (
  gl_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id       UUID        NOT NULL,    -- groups debit+credit legs
  transaction_date DATE        NOT NULL,
  period_id        UUID        REFERENCES fiscal_periods(period_id),
  bu_id            UUID        REFERENCES business_units(bu_id),
  account_id       UUID        NOT NULL REFERENCES accounts(account_id),
  debit_amount     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit_amount  >= 0),
  credit_amount    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  description      TEXT        NOT NULL,
  reference_doc    TEXT,                    -- invoice / receipt number
  source_system    TEXT        NOT NULL DEFAULT 'manual',
                                            -- 'manual'|'bank_import'|'ap_payment'|'ar_receipt'
  is_intercompany  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT,
  CHECK (debit_amount > 0 OR credit_amount > 0),
  CHECK (NOT (debit_amount > 0 AND credit_amount > 0))  -- one side only per row
);

CREATE INDEX IF NOT EXISTS idx_gl_journal       ON general_ledger(journal_id);
CREATE INDEX IF NOT EXISTS idx_gl_date          ON general_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_gl_bu            ON general_ledger(bu_id);
CREATE INDEX IF NOT EXISTS idx_gl_account       ON general_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_period        ON general_ledger(period_id);

-- Auto-assign period_id from transaction_date
CREATE OR REPLACE FUNCTION set_gl_period()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT period_id INTO NEW.period_id
  FROM fiscal_periods
  WHERE period_type = 'MONTH'
    AND NEW.transaction_date BETWEEN start_date AND end_date
  LIMIT 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gl_period ON general_ledger;
CREATE TRIGGER trg_gl_period
  BEFORE INSERT OR UPDATE ON general_ledger
  FOR EACH ROW EXECUTE FUNCTION set_gl_period();

-- ─── Accounts Payable ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts_payable (
  ap_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID        REFERENCES suppliers(supplier_id),
  bu_id           UUID        REFERENCES business_units(bu_id),
  account_id      UUID        REFERENCES accounts(account_id),  -- expense account
  description     TEXT        NOT NULL,
  gross_amount    NUMERIC(15,2) NOT NULL CHECK (gross_amount > 0),
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(15,2) GENERATED ALWAYS AS (gross_amount - tax_amount) STORED,
  issue_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE        NOT NULL,
  paid_date       DATE,
  paid_amount     NUMERIC(15,2),
  status          TEXT        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING','SCHEDULED','PAID','OVERDUE','CANCELLED')),
  category        TEXT,
  reference_doc   TEXT,
  bank_account_id UUID        REFERENCES bank_accounts(bank_account_id),
  gl_id           UUID        REFERENCES general_ledger(gl_id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_ap_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_status   ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_bu       ON accounts_payable(bu_id);
CREATE INDEX IF NOT EXISTS idx_ap_supplier ON accounts_payable(supplier_id);

-- Auto-update status to OVERDUE
CREATE OR REPLACE FUNCTION update_ap_overdue()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE accounts_payable
  SET status = 'OVERDUE', updated_at = NOW()
  WHERE status = 'PENDING'
    AND due_date < CURRENT_DATE;
END;
$$;

-- ─── Accounts Receivable ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts_receivable (
  ar_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        REFERENCES customers(customer_id),
  bu_id           UUID        REFERENCES business_units(bu_id),
  account_id      UUID        REFERENCES accounts(account_id),  -- revenue account
  description     TEXT        NOT NULL,
  gross_amount    NUMERIC(15,2) NOT NULL CHECK (gross_amount > 0),
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(15,2) GENERATED ALWAYS AS (gross_amount - tax_amount) STORED,
  issue_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE        NOT NULL,
  received_date   DATE,
  received_amount NUMERIC(15,2),
  status          TEXT        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING','PARTIAL','RECEIVED','OVERDUE','CANCELLED')),
  category        TEXT,
  reference_doc   TEXT,
  bank_account_id UUID        REFERENCES bank_accounts(bank_account_id),
  gl_id           UUID        REFERENCES general_ledger(gl_id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_ar_due_date  ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_status    ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_ar_bu        ON accounts_receivable(bu_id);
CREATE INDEX IF NOT EXISTS idx_ar_customer  ON accounts_receivable(customer_id);

-- ─── Bank Transactions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_transactions_epm (
  bank_tx_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id  UUID        NOT NULL REFERENCES bank_accounts(bank_account_id),
  transaction_date DATE        NOT NULL,
  amount           NUMERIC(15,2) NOT NULL,   -- positive=credit, negative=debit
  description      TEXT        NOT NULL,
  counterparty     TEXT,
  reference_doc    TEXT,
  is_reconciled    BOOLEAN     NOT NULL DEFAULT FALSE,
  reconciled_at    TIMESTAMPTZ,
  gl_id            UUID        REFERENCES general_ledger(gl_id),
  ap_id            UUID        REFERENCES accounts_payable(ap_id),
  ar_id            UUID        REFERENCES accounts_receivable(ar_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bk_date     ON bank_transactions_epm(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bk_account  ON bank_transactions_epm(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bk_reconcil ON bank_transactions_epm(is_reconciled);

-- ─── Fixed Assets ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fixed_assets (
  asset_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code           TEXT        UNIQUE,
  asset_name           TEXT        NOT NULL,
  asset_category       TEXT        NOT NULL,  -- 'HARDWARE','SOFTWARE','FURNITURE','VEHICLE'
  bu_id                UUID        REFERENCES business_units(bu_id),
  acquisition_date     DATE        NOT NULL,
  cost                 NUMERIC(15,2) NOT NULL CHECK (cost > 0),
  useful_life_months   SMALLINT    NOT NULL DEFAULT 60,
  residual_value       NUMERIC(15,2) NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_value           NUMERIC(15,2) GENERATED ALWAYS AS
                         (cost - accumulated_depreciation) STORED,
  disposal_date        DATE,
  disposal_value       NUMERIC(15,2),
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. ANALYTICAL — BUDGET & KPIs
-- =============================================================================

-- ─── Budget Versions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budget_versions (
  version_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name  TEXT        NOT NULL,        -- 'FY2026-Base', 'FY2026-Bull'
  fiscal_year   SMALLINT    NOT NULL,
  scenario      TEXT        NOT NULL DEFAULT 'BASE'
                            CHECK (scenario IN ('BEAR','BASE','BULL')),
  status        TEXT        NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','APPROVED','LOCKED','ARCHIVED')),
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT
);

INSERT INTO budget_versions (version_name, fiscal_year, scenario, status) VALUES
  ('FY2026-Bear', 2026, 'BEAR', 'DRAFT'),
  ('FY2026-Base', 2026, 'BASE', 'APPROVED'),
  ('FY2026-Bull', 2026, 'BULL', 'DRAFT')
ON CONFLICT DO NOTHING;

-- ─── Budgets (line items) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budgets (
  budget_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id   UUID        NOT NULL REFERENCES budget_versions(version_id),
  period_id    UUID        NOT NULL REFERENCES fiscal_periods(period_id),
  bu_id        UUID        NOT NULL REFERENCES business_units(bu_id),
  account_id   UUID        NOT NULL REFERENCES accounts(account_id),
  amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT,
  UNIQUE (version_id, period_id, bu_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_version ON budgets(version_id);
CREATE INDEX IF NOT EXISTS idx_budget_period  ON budgets(period_id);
CREATE INDEX IF NOT EXISTS idx_budget_bu      ON budgets(bu_id);

-- ─── KPI Catalog ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_catalog (
  kpi_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code            TEXT        NOT NULL UNIQUE,
  kpi_name            TEXT        NOT NULL,
  kpi_description     TEXT,
  calculation_formula TEXT,
  unit                TEXT        CHECK (unit IN ('BRL','PCT','DAYS','RATIO','COUNT')),
  frequency           TEXT        NOT NULL DEFAULT 'MONTHLY'
                                  CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL')),
  higher_is_better    BOOLEAN     NOT NULL DEFAULT TRUE,
  alert_threshold     NUMERIC(15,4),
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO kpi_catalog (kpi_code, kpi_name, calculation_formula, unit, higher_is_better, alert_threshold) VALUES
  ('MRR',          'Monthly Recurring Revenue',       'SUM of recurring contracts / month',        'BRL',   TRUE,  NULL),
  ('ARR',          'Annual Recurring Revenue',         'MRR * 12',                                  'BRL',   TRUE,  NULL),
  ('GROSS_MARGIN', 'Gross Margin %',                   '(Revenue - COGS) / Revenue * 100',          'PCT',   TRUE,  50.0),
  ('EBITDA',       'EBITDA (R$)',                      'Gross Profit - OPEX',                       'BRL',   TRUE,  NULL),
  ('EBITDA_MARGIN','EBITDA Margin %',                  'EBITDA / Revenue * 100',                    'PCT',   TRUE,  10.0),
  ('NET_MARGIN',   'Net Margin %',                     'Net Result / Revenue * 100',                'PCT',   TRUE,   5.0),
  ('BURN_RATE',    'Burn Rate (R$/mês)',               'Monthly operational cash out',              'BRL',   FALSE, NULL),
  ('CASH_RUNWAY',  'Cash Runway (meses)',               'Cash Balance / Burn Rate',                  'RATIO', TRUE,   3.0),
  ('DSO',          'Days Sales Outstanding',            'AR / (Revenue / 30)',                       'DAYS',  FALSE, 45.0),
  ('DPO',          'Days Payable Outstanding',          'AP / (COGS / 30)',                          'DAYS',  TRUE,  NULL),
  ('CCC',          'Cash Conversion Cycle',             'DSO - DPO',                                 'DAYS',  FALSE, 30.0),
  ('ROIC',         'Return on Invested Capital %',      'NOPAT / Invested Capital * 100',            'PCT',   TRUE,  15.0),
  ('RULE_OF_40',   'Rule of 40',                        'Revenue Growth % + EBITDA Margin %',        'RATIO', TRUE,  40.0),
  ('WORKING_CAP',  'Working Capital (R$)',              'Current Assets - Current Liabilities',      'BRL',   TRUE,  NULL)
ON CONFLICT (kpi_code) DO NOTHING;

-- ─── KPI Values (actual + target) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_values (
  kpi_value_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id        UUID        NOT NULL REFERENCES kpi_catalog(kpi_id),
  period_id     UUID        NOT NULL REFERENCES fiscal_periods(period_id),
  bu_id         UUID        REFERENCES business_units(bu_id),   -- NULL = consolidated
  actual_value  NUMERIC(15,4),
  target_value  NUMERIC(15,4),
  variance_abs  NUMERIC(15,4) GENERATED ALWAYS AS
                  (actual_value - target_value) STORED,
  variance_pct  NUMERIC(8,4) GENERATED ALWAYS AS
                  (CASE WHEN target_value <> 0
                        THEN (actual_value - target_value) / ABS(target_value) * 100
                        ELSE NULL END) STORED,
  notes         TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kpi_id, period_id, bu_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_period ON kpi_values(period_id);
CREATE INDEX IF NOT EXISTS idx_kpi_bu     ON kpi_values(bu_id);

-- =============================================================================
-- 4. VIEWS
-- =============================================================================

-- ─── v_pl_gerencial — DRE Gerencial por BU e Consolidado ────────────────────

CREATE OR REPLACE VIEW v_pl_gerencial AS
WITH gl_classified AS (
  SELECT
    g.bu_id,
    g.transaction_date,
    g.period_id,
    a.account_type,
    a.account_code,
    a.account_name,
    CASE WHEN a.normal_balance = 'CREDIT' THEN g.credit_amount - g.debit_amount
         ELSE g.debit_amount - g.credit_amount
    END AS signed_amount
  FROM general_ledger g
  JOIN accounts a ON a.account_id = g.account_id
  WHERE a.is_intercompany = FALSE
)
SELECT
  b.bu_code,
  b.bu_name,
  fp.period_code,
  fp.fiscal_year,
  SUM(CASE WHEN gc.account_type IN ('REVENUE','FINANCIAL_REVENUE') THEN gc.signed_amount ELSE 0 END) AS receita_bruta,
  SUM(CASE WHEN gc.account_type = 'COGS'             THEN gc.signed_amount ELSE 0 END) AS cogs,
  SUM(CASE WHEN gc.account_type IN ('REVENUE','FINANCIAL_REVENUE') THEN gc.signed_amount ELSE 0 END)
  - SUM(CASE WHEN gc.account_type = 'COGS'           THEN gc.signed_amount ELSE 0 END) AS lucro_bruto,
  SUM(CASE WHEN gc.account_type = 'EXPENSE'          THEN gc.signed_amount ELSE 0 END) AS despesas_operacionais,
  SUM(CASE WHEN gc.account_type IN ('REVENUE','FINANCIAL_REVENUE') THEN gc.signed_amount ELSE 0 END)
  - SUM(CASE WHEN gc.account_type IN ('COGS','EXPENSE') THEN gc.signed_amount ELSE 0 END) AS ebitda,
  SUM(CASE WHEN gc.account_type = 'FINANCIAL_EXPENSE' THEN gc.signed_amount ELSE 0 END) AS despesas_financeiras,
  SUM(CASE WHEN gc.account_type IN ('REVENUE','FINANCIAL_REVENUE') THEN gc.signed_amount ELSE 0 END)
  - SUM(CASE WHEN gc.account_type IN ('COGS','EXPENSE','FINANCIAL_EXPENSE') THEN gc.signed_amount ELSE 0 END) AS resultado_liquido
FROM gl_classified gc
JOIN business_units b  ON b.bu_id    = gc.bu_id
JOIN fiscal_periods fp ON fp.period_id = gc.period_id
GROUP BY b.bu_code, b.bu_name, fp.period_code, fp.fiscal_year;

-- ─── v_balance_sheet — Balanço Patrimonial ───────────────────────────────────

CREATE OR REPLACE VIEW v_balance_sheet AS
SELECT
  b.bu_code,
  b.bu_name,
  fp.period_code,
  a.account_type,
  a.account_code,
  a.account_name,
  a.level,
  SUM(g.debit_amount - g.credit_amount) *
    CASE WHEN a.normal_balance = 'DEBIT' THEN 1 ELSE -1 END AS balance
FROM general_ledger g
JOIN accounts       a  ON a.account_id  = g.account_id
JOIN business_units b  ON b.bu_id       = g.bu_id
JOIN fiscal_periods fp ON fp.period_id  = g.period_id
WHERE a.account_type IN ('ASSET','LIABILITY','EQUITY')
GROUP BY b.bu_code, b.bu_name, fp.period_code,
         a.account_type, a.account_code, a.account_name, a.level
ORDER BY a.account_code;

-- ─── v_ap_aging — Aging de Contas a Pagar ────────────────────────────────────

CREATE OR REPLACE VIEW v_ap_aging AS
SELECT
  ap.ap_id,
  s.legal_name            AS supplier_name,
  b.bu_code,
  ap.description,
  ap.gross_amount,
  ap.net_amount,
  ap.due_date,
  ap.status,
  CURRENT_DATE - ap.due_date AS days_overdue,
  CASE
    WHEN ap.status = 'PAID'                           THEN 'PAID'
    WHEN CURRENT_DATE <= ap.due_date                  THEN 'CURRENT'
    WHEN CURRENT_DATE - ap.due_date BETWEEN 1  AND 30 THEN '1-30d'
    WHEN CURRENT_DATE - ap.due_date BETWEEN 31 AND 60 THEN '31-60d'
    WHEN CURRENT_DATE - ap.due_date BETWEEN 61 AND 90 THEN '61-90d'
    ELSE '+90d'
  END AS aging_bucket
FROM accounts_payable ap
LEFT JOIN suppliers     s ON s.supplier_id = ap.supplier_id
LEFT JOIN business_units b ON b.bu_id       = ap.bu_id
WHERE ap.status NOT IN ('CANCELLED');

-- ─── v_ar_aging — Aging de Contas a Receber ──────────────────────────────────

CREATE OR REPLACE VIEW v_ar_aging AS
SELECT
  ar.ar_id,
  c.legal_name             AS customer_name,
  b.bu_code,
  ar.description,
  ar.gross_amount,
  ar.net_amount,
  ar.due_date,
  ar.status,
  CURRENT_DATE - ar.due_date AS days_overdue,
  CASE
    WHEN ar.status = 'RECEIVED'                       THEN 'RECEIVED'
    WHEN CURRENT_DATE <= ar.due_date                  THEN 'CURRENT'
    WHEN CURRENT_DATE - ar.due_date BETWEEN 1  AND 30 THEN '1-30d'
    WHEN CURRENT_DATE - ar.due_date BETWEEN 31 AND 60 THEN '31-60d'
    WHEN CURRENT_DATE - ar.due_date BETWEEN 61 AND 90 THEN '61-90d'
    ELSE '+90d'
  END AS aging_bucket
FROM accounts_receivable ar
LEFT JOIN customers      c ON c.customer_id = ar.customer_id
LEFT JOIN business_units b ON b.bu_id        = ar.bu_id
WHERE ar.status NOT IN ('CANCELLED');

-- ─── v_budget_vs_actual ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_budget_vs_actual AS
SELECT
  bv.version_name,
  bv.scenario,
  fp.period_code,
  b_bu.bu_code,
  a.account_code,
  a.account_name,
  a.account_type,
  bud.amount                                AS budget_amount,
  COALESCE(gl_agg.actual_amount, 0)         AS actual_amount,
  COALESCE(gl_agg.actual_amount, 0) - bud.amount AS variance_abs,
  CASE WHEN bud.amount <> 0
       THEN (COALESCE(gl_agg.actual_amount, 0) - bud.amount) / ABS(bud.amount) * 100
       ELSE NULL
  END                                        AS variance_pct
FROM budgets bud
JOIN budget_versions bv ON bv.version_id = bud.version_id
JOIN fiscal_periods  fp ON fp.period_id  = bud.period_id
JOIN business_units b_bu ON b_bu.bu_id   = bud.bu_id
JOIN accounts         a  ON a.account_id = bud.account_id
LEFT JOIN (
  SELECT
    bu_id,
    period_id,
    account_id,
    SUM(CASE WHEN a2.normal_balance = 'CREDIT' THEN credit_amount - debit_amount
             ELSE debit_amount - credit_amount END) AS actual_amount
  FROM general_ledger g2
  JOIN accounts a2 ON a2.account_id = g2.account_id
  GROUP BY bu_id, period_id, account_id
) gl_agg ON gl_agg.bu_id      = bud.bu_id
         AND gl_agg.period_id  = bud.period_id
         AND gl_agg.account_id = bud.account_id;

-- ─── v_trial_balance — Balancete ─────────────────────────────────────────────

CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
  a.account_code,
  a.account_name,
  a.account_type,
  b.bu_code,
  fp.period_code,
  SUM(g.debit_amount)  AS total_debits,
  SUM(g.credit_amount) AS total_credits,
  SUM(g.debit_amount) - SUM(g.credit_amount) AS net_balance
FROM general_ledger g
JOIN accounts       a  ON a.account_id = g.account_id
JOIN business_units b  ON b.bu_id      = g.bu_id
JOIN fiscal_periods fp ON fp.period_id = g.period_id
GROUP BY a.account_code, a.account_name, a.account_type, b.bu_code, fp.period_code
ORDER BY a.account_code;

-- =============================================================================
-- 5. ROW-LEVEL SECURITY (enable; policies to be added per Supabase / Neon setup)
-- =============================================================================

ALTER TABLE business_units      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable    ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values          ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users (adjust for your auth setup)
CREATE POLICY "Allow select for authenticated"
  ON general_ledger FOR SELECT USING (TRUE);
CREATE POLICY "Allow insert for authenticated"
  ON general_ledger FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- 6. AUDIT TRIGGER (updated_at)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'business_units','suppliers','customers','bank_accounts',
    'general_ledger','accounts_payable','accounts_receivable',
    'fixed_assets','budget_versions','budgets'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl);
  END LOOP;
END;
$$;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
