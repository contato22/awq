-- =============================================================================
-- AWQ GROUP — Schema Completo (Supabase / PostgreSQL)
-- =============================================================================
-- Execute este arquivo UMA VEZ no Supabase SQL Editor:
--   Dashboard → SQL Editor → Cole o conteúdo → Run
--
-- Todos os statements usam IF NOT EXISTS — seguro rodar múltiplas vezes.
-- Ordem de execução:
--   1. Extensões
--   2. AWQ Core (financial, advisor, caza)
--   3. EPM (master data + transacional)
--   4. CRM
--   5. BPM
--   6. M&A Portfolio
--   7. PPM
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. AWQ CORE — Documentos Financeiros
-- =============================================================================
-- Drop first so re-runs always get the correct schema (no stale column sets).

DROP TABLE IF EXISTS bank_transactions   CASCADE;
DROP TABLE IF EXISTS financial_documents CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_bt_document_id ON bank_transactions(document_id);
CREATE INDEX IF NOT EXISTS idx_bt_entity       ON bank_transactions(entity);

-- =============================================================================
-- 2. AWQ CORE — Advisor Clients
-- =============================================================================

CREATE TABLE IF NOT EXISTS advisor_clients (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL DEFAULT '',
  segmento              TEXT NOT NULL DEFAULT '',
  tipo_servico          TEXT NOT NULL DEFAULT '',
  aum                   NUMERIC NOT NULL DEFAULT 0,
  fee_mensal            NUMERIC NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'Ativo',
  since                 TEXT NOT NULL DEFAULT '',
  responsavel           TEXT NOT NULL DEFAULT '',
  contato_email         TEXT NOT NULL DEFAULT '',
  contato_phone         TEXT NOT NULL DEFAULT '',
  nps                   NUMERIC,
  imported_from_notion  BOOLEAN NOT NULL DEFAULT false,
  notion_page_id        TEXT,
  imported_at           TEXT,
  last_internal_update  TEXT NOT NULL,
  sync_status           TEXT NOT NULL DEFAULT 'internal'
);

CREATE INDEX IF NOT EXISTS idx_advisor_cli_status ON advisor_clients(status);
CREATE INDEX IF NOT EXISTS idx_advisor_cli_since  ON advisor_clients(since);

-- =============================================================================
-- 3. AWQ CORE — Caza Vision
-- =============================================================================

CREATE TABLE IF NOT EXISTS caza_projects (
  id                    TEXT PRIMARY KEY,
  titulo                TEXT NOT NULL DEFAULT '',
  cliente               TEXT NOT NULL DEFAULT '',
  tipo                  TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'Em Produção',
  prioridade            TEXT NOT NULL DEFAULT '',
  diretor               TEXT NOT NULL DEFAULT '',
  prazo                 TEXT NOT NULL DEFAULT '',
  inicio                TEXT NOT NULL DEFAULT '',
  valor                 NUMERIC NOT NULL DEFAULT 0,
  alimentacao           NUMERIC NOT NULL DEFAULT 0,
  gasolina              NUMERIC NOT NULL DEFAULT 0,
  despesas              NUMERIC NOT NULL DEFAULT 0,
  lucro                 NUMERIC NOT NULL DEFAULT 0,
  recebido              BOOLEAN NOT NULL DEFAULT false,
  recebimento           TEXT NOT NULL DEFAULT '',
  imported_from_notion  BOOLEAN NOT NULL DEFAULT false,
  notion_page_id        TEXT,
  imported_at           TEXT,
  last_internal_update  TEXT NOT NULL,
  sync_status           TEXT NOT NULL DEFAULT 'internal'
);

CREATE TABLE IF NOT EXISTS caza_clients (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL DEFAULT '',
  email                 TEXT NOT NULL DEFAULT '',
  phone                 TEXT NOT NULL DEFAULT '',
  type                  TEXT NOT NULL DEFAULT 'Marca',
  budget_anual          NUMERIC NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'Ativo',
  segmento              TEXT NOT NULL DEFAULT '',
  since                 TEXT NOT NULL DEFAULT '',
  cnpj                  TEXT NOT NULL DEFAULT '',
  contato_nome          TEXT NOT NULL DEFAULT '',
  contato_cargo         TEXT NOT NULL DEFAULT '',
  modelo_contrato       TEXT NOT NULL DEFAULT '',
  owner                 TEXT NOT NULL DEFAULT '',
  health_score          NUMERIC NOT NULL DEFAULT 80,
  nps                   NUMERIC,
  observacoes           TEXT NOT NULL DEFAULT '',
  imported_from_notion  BOOLEAN NOT NULL DEFAULT false,
  notion_page_id        TEXT,
  imported_at           TEXT,
  last_internal_update  TEXT NOT NULL,
  sync_status           TEXT NOT NULL DEFAULT 'internal'
);

CREATE INDEX IF NOT EXISTS idx_caza_proj_recebido ON caza_projects(recebido);
CREATE INDEX IF NOT EXISTS idx_caza_proj_prazo    ON caza_projects(prazo);
CREATE INDEX IF NOT EXISTS idx_caza_cli_status    ON caza_clients(status);



-- =============================================================================
-- 4. AWQ CORE — Contrapartes (Cadastro de clientes / fornecedores)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contrapartes (
  id               TEXT PRIMARY KEY,
  tipo             TEXT NOT NULL,
  papel            TEXT NOT NULL,
  razao_social     TEXT NOT NULL,
  nome_fantasia    TEXT,
  cnpj_cpf         TEXT NOT NULL,
  ie               TEXT,
  im               TEXT,
  regime           TEXT NOT NULL,
  email_financeiro TEXT,
  telefone         TEXT,
  cep              TEXT,
  logradouro       TEXT,
  numero           TEXT,
  complemento      TEXT,
  bairro           TEXT,
  cidade           TEXT,
  uf               TEXT,
  banco            TEXT,
  agencia          TEXT,
  conta            TEXT,
  pix              TEXT,
  bu               TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'ativo',
  observacoes      TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_contrapartes_papel  ON contrapartes(papel);
CREATE INDEX IF NOT EXISTS idx_contrapartes_bu     ON contrapartes(bu);
CREATE INDEX IF NOT EXISTS idx_contrapartes_status ON contrapartes(status);

ALTER TABLE contrapartes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contrapartes_all ON contrapartes;
CREATE POLICY contrapartes_all ON contrapartes FOR ALL USING (TRUE);

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
DELETE FROM fiscal_periods WHERE fiscal_year = 2026;
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
         a.account_type, a.account_code, a.account_name, a.level, a.normal_balance
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
    g2.bu_id,
    g2.period_id,
    g2.account_id,
    SUM(CASE WHEN a2.normal_balance = 'CREDIT' THEN g2.credit_amount - g2.debit_amount
             ELSE g2.debit_amount - g2.credit_amount END) AS actual_amount
  FROM general_ledger g2
  JOIN accounts a2 ON a2.account_id = g2.account_id
  GROUP BY g2.bu_id, g2.period_id, g2.account_id
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
DROP POLICY IF EXISTS "Allow select for authenticated" ON general_ledger;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON general_ledger;
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


-- =============================================================================
-- AWQ GROUP — CRM Full Schema (PostgreSQL / Neon)
-- =============================================================================
-- Integrates with EPM tables: business_units, customers, general_ledger,
--   accounts_receivable (those must already exist — see awq_epm_full_schema.sql)
--
-- Layers:
--   1. Master Data  — crm_accounts, crm_contacts
--   2. Pipeline     — crm_leads, crm_opportunities, crm_opportunity_stage_history
--   3. Activities   — crm_activities
--   4. Analytics    — crm_pipeline_snapshot
--   5. Views        — v_crm_pipeline_overview, v_crm_sales_forecast,
--                     v_crm_account_health, v_crm_conversion_funnel,
--                     v_crm_rep_performance
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. MASTER DATA
-- =============================================================================

-- ─── CRM Accounts (Companies / Organizations) ────────────────────────────────
-- NOTE: named crm_accounts to avoid collision with EPM accounts (Chart of Accounts)

CREATE TABLE IF NOT EXISTS crm_accounts (
  account_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code             TEXT        UNIQUE,                          -- ACC-001
  account_name             TEXT        NOT NULL,
  trade_name               TEXT,
  document_number          TEXT        UNIQUE,                          -- CNPJ
  industry                 TEXT        CHECK (industry IN
                             ('tech','finance','education','health','media','retail','other')),
  company_size             TEXT        CHECK (company_size IN
                             ('1-10','11-50','51-200','201-500','500+')),
  annual_revenue_estimate  NUMERIC(15,2),
  website                  TEXT,
  linkedin_url             TEXT,
  address_street           TEXT,
  address_city             TEXT,
  address_state            TEXT,
  address_zip              TEXT,
  account_type             TEXT        NOT NULL DEFAULT 'prospect'
                             CHECK (account_type IN ('prospect','customer','partner','former_customer')),
  owner                    TEXT        NOT NULL DEFAULT 'Miguel',
  health_score             SMALLINT    NOT NULL DEFAULT 70
                             CHECK (health_score BETWEEN 0 AND 100),
  churn_risk               TEXT        NOT NULL DEFAULT 'low'
                             CHECK (churn_risk IN ('low','medium','high')),
  renewal_date             DATE,
  epm_customer_id          UUID        REFERENCES customers(customer_id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_type   ON crm_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_owner  ON crm_accounts(owner);

-- ─── CRM Contacts (People within companies) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_contacts (
  contact_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID        REFERENCES crm_accounts(account_id) ON DELETE CASCADE,
  full_name           TEXT        NOT NULL,
  email               TEXT,
  phone               TEXT,
  mobile              TEXT,
  job_title           TEXT,
  department          TEXT,
  seniority           TEXT        NOT NULL DEFAULT 'manager'
                        CHECK (seniority IN ('c_level','director','manager','ic')),
  linkedin_url        TEXT,
  is_primary_contact  BOOLEAN     NOT NULL DEFAULT FALSE,
  contact_preferences TEXT[]      NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts(account_id);

-- =============================================================================
-- 2. PIPELINE
-- =============================================================================

-- ─── CRM Leads ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_leads (
  lead_id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_source                  TEXT        NOT NULL DEFAULT 'manual'
                                 CHECK (lead_source IN ('organic','paid','referral','inbound','manual')),
  company_name                 TEXT        NOT NULL,
  contact_name                 TEXT        NOT NULL,
  email                        TEXT,
  phone                        TEXT,
  job_title                    TEXT,
  bu                           TEXT        NOT NULL DEFAULT 'JACQES'
                                 CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE')),
  lead_score                   SMALLINT    NOT NULL DEFAULT 0
                                 CHECK (lead_score BETWEEN 0 AND 100),
  status                       TEXT        NOT NULL DEFAULT 'new'
                                 CHECK (status IN ('new','contacted','qualified','unqualified','converted')),
  qualification_notes          TEXT,
  bant_budget                  NUMERIC(15,2),
  bant_authority               BOOLEAN     NOT NULL DEFAULT FALSE,
  bant_need                    TEXT        CHECK (bant_need IN ('low','medium','high')),
  bant_timeline                DATE,
  assigned_to                  TEXT        NOT NULL DEFAULT 'Miguel',
  converted_to_opportunity_id  UUID,                                    -- set on convert
  converted_at                 TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                   TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_status      ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_bu          ON crm_leads(bu);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned    ON crm_leads(assigned_to);

-- ─── CRM Opportunities ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_opportunities (
  opportunity_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_code    TEXT        UNIQUE,                               -- OPP-001
  opportunity_name    TEXT        NOT NULL,
  account_id          UUID        REFERENCES crm_accounts(account_id) ON DELETE SET NULL,
  contact_id          UUID        REFERENCES crm_contacts(contact_id) ON DELETE SET NULL,
  bu                  TEXT        NOT NULL
                        CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE')),
  stage               TEXT        NOT NULL DEFAULT 'discovery'
                        CHECK (stage IN ('discovery','qualification','proposal','negotiation','closed_won','closed_lost')),
  deal_value          NUMERIC(15,2) NOT NULL DEFAULT 0,
  probability         SMALLINT    NOT NULL DEFAULT 25
                        CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date   DATE,
  lost_reason         TEXT,
  lost_to_competitor  TEXT,
  win_reason          TEXT,                                             -- JSON array stored as text
  owner               TEXT        NOT NULL DEFAULT 'Miguel',
  proposal_sent_date  DATE,
  proposal_viewed     BOOLEAN     NOT NULL DEFAULT FALSE,
  proposal_accepted   BOOLEAN     NOT NULL DEFAULT FALSE,
  synced_to_epm       BOOLEAN     NOT NULL DEFAULT FALSE,
  epm_customer_id     UUID        REFERENCES customers(customer_id) ON DELETE SET NULL,
  epm_ar_id           UUID        REFERENCES accounts_receivable(ar_id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_stage    ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opp_bu       ON crm_opportunities(bu);
CREATE INDEX IF NOT EXISTS idx_crm_opp_owner    ON crm_opportunities(owner);
CREATE INDEX IF NOT EXISTS idx_crm_opp_account  ON crm_opportunities(account_id);

-- ─── Stage History (audit trail) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_opportunity_stage_history (
  history_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID        NOT NULL REFERENCES crm_opportunities(opportunity_id) ON DELETE CASCADE,
  from_stage      TEXT,
  to_stage        TEXT        NOT NULL,
  changed_by      TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_stage_hist_opp ON crm_opportunity_stage_history(opportunity_id);

-- =============================================================================
-- 3. ACTIVITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_activities (
  activity_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type     TEXT        NOT NULL
                      CHECK (activity_type IN ('call','email','meeting','task','note')),
  related_to_type   TEXT        NOT NULL
                      CHECK (related_to_type IN ('lead','opportunity','account','contact')),
  related_to_id     UUID        NOT NULL,
  subject           TEXT        NOT NULL,
  description       TEXT,
  outcome           TEXT        CHECK (outcome IN ('successful','unsuccessful','no_answer')),
  duration_minutes  INTEGER,
  scheduled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  status            TEXT        NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','completed','cancelled')),
  created_by        TEXT        NOT NULL DEFAULT 'Miguel',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_act_related  ON crm_activities(related_to_type, related_to_id);
CREATE INDEX IF NOT EXISTS idx_crm_act_status   ON crm_activities(status);
CREATE INDEX IF NOT EXISTS idx_crm_act_creator  ON crm_activities(created_by);

-- =============================================================================
-- 4. ANALYTICS SNAPSHOTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_pipeline_snapshot (
  snapshot_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  stage               TEXT        NOT NULL,
  bu                  TEXT        NOT NULL,
  total_opportunities INTEGER     NOT NULL DEFAULT 0,
  total_value         NUMERIC(15,2) NOT NULL DEFAULT 0,
  weighted_value      NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_crm_snap_date ON crm_pipeline_snapshot(snapshot_date);

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- ─── Auto-set probability by stage ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_crm_opp_set_probability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.probability := CASE NEW.stage
    WHEN 'discovery'     THEN 25
    WHEN 'qualification' THEN 40
    WHEN 'proposal'      THEN 60
    WHEN 'negotiation'   THEN 75
    WHEN 'closed_won'    THEN 100
    WHEN 'closed_lost'   THEN 0
    ELSE NEW.probability
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_opp_probability ON crm_opportunities;
CREATE TRIGGER trg_crm_opp_probability
  BEFORE INSERT OR UPDATE OF stage ON crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION fn_crm_opp_set_probability();

-- ─── Auto-log stage changes ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_crm_opp_log_stage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO crm_opportunity_stage_history (opportunity_id, from_stage, to_stage, changed_by)
    VALUES (NEW.opportunity_id, OLD.stage, NEW.stage, NEW.created_by);

    -- set actual_close_date when closing
    IF NEW.stage IN ('closed_won', 'closed_lost') AND OLD.actual_close_date IS NULL THEN
      NEW.actual_close_date := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_opp_stage_history ON crm_opportunities;
CREATE TRIGGER trg_crm_opp_stage_history
  BEFORE UPDATE ON crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION fn_crm_opp_log_stage();

-- ─── Auto-generate opportunity_code ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_crm_opp_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_seq INTEGER;
BEGIN
  IF NEW.opportunity_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(opportunity_code FROM 5) AS INTEGER)), 0) + 1
    INTO v_seq FROM crm_opportunities WHERE opportunity_code LIKE 'OPP-%';
    NEW.opportunity_code := 'OPP-' || LPAD(v_seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_opp_code ON crm_opportunities;
CREATE TRIGGER trg_crm_opp_code
  BEFORE INSERT ON crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION fn_crm_opp_code();

-- ─── Auto-generate account_code ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_crm_account_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_seq INTEGER;
BEGIN
  IF NEW.account_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_code FROM 5) AS INTEGER)), 0) + 1
    INTO v_seq FROM crm_accounts WHERE account_code LIKE 'ACC-%';
    NEW.account_code := 'ACC-' || LPAD(v_seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_account_code ON crm_accounts;
CREATE TRIGGER trg_crm_account_code
  BEFORE INSERT ON crm_accounts
  FOR EACH ROW EXECUTE FUNCTION fn_crm_account_code();

-- =============================================================================
-- 6. VIEWS
-- =============================================================================

-- ─── Pipeline Overview ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_crm_pipeline_overview AS
SELECT
  o.stage,
  o.bu,
  COUNT(*)                                        AS deal_count,
  SUM(o.deal_value)                               AS total_value,
  SUM(o.deal_value * o.probability / 100.0)       AS weighted_value
FROM crm_opportunities o
WHERE o.stage NOT IN ('closed_won','closed_lost')
GROUP BY o.stage, o.bu;

-- ─── Sales Forecast ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_crm_sales_forecast AS
SELECT
  o.bu,
  o.owner,
  TO_CHAR(o.expected_close_date, 'YYYY-MM')       AS forecast_month,
  COUNT(*)                                         AS deal_count,
  SUM(o.deal_value)                                AS pipeline_value,
  SUM(o.deal_value * o.probability / 100.0)        AS weighted_forecast
FROM crm_opportunities o
WHERE o.stage NOT IN ('closed_won','closed_lost')
  AND o.expected_close_date IS NOT NULL
GROUP BY o.bu, o.owner, TO_CHAR(o.expected_close_date, 'YYYY-MM')
ORDER BY forecast_month, bu;

-- ─── Account Health Dashboard ─────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_crm_account_health AS
SELECT
  a.account_id,
  a.account_code,
  a.account_name,
  a.account_type,
  a.owner,
  a.health_score,
  a.churn_risk,
  a.renewal_date,
  COUNT(DISTINCT o.opportunity_id) FILTER (WHERE o.stage NOT IN ('closed_won','closed_lost'))
                                                  AS open_opportunities,
  MAX(act.created_at)                             AS last_activity_at,
  EXTRACT(DAY FROM NOW() - MAX(act.created_at))   AS days_since_activity
FROM crm_accounts a
LEFT JOIN crm_opportunities o  ON o.account_id = a.account_id
LEFT JOIN crm_activities    act ON act.related_to_type = 'account' AND act.related_to_id = a.account_id
GROUP BY a.account_id, a.account_code, a.account_name, a.account_type,
         a.owner, a.health_score, a.churn_risk, a.renewal_date;

-- ─── Conversion Funnel ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_crm_conversion_funnel AS
SELECT
  stage,
  COUNT(*)              AS deal_count,
  AVG(deal_value)       AS avg_deal_value,
  SUM(deal_value)       AS total_value
FROM crm_opportunities
GROUP BY stage
ORDER BY CASE stage
  WHEN 'discovery'     THEN 1
  WHEN 'qualification' THEN 2
  WHEN 'proposal'      THEN 3
  WHEN 'negotiation'   THEN 4
  WHEN 'closed_won'    THEN 5
  WHEN 'closed_lost'   THEN 6
END;

-- ─── Rep Performance ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_crm_rep_performance AS
WITH monthly AS (
  SELECT
    owner,
    COUNT(*) FILTER (WHERE stage = 'closed_won'
      AND actual_close_date >= DATE_TRUNC('month', NOW()))  AS won_this_month,
    SUM(deal_value) FILTER (WHERE stage = 'closed_won'
      AND actual_close_date >= DATE_TRUNC('month', NOW()))  AS revenue_this_month,
    COUNT(*) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')) AS open_deals,
    COUNT(*) FILTER (WHERE stage = 'closed_won')            AS total_won,
    COUNT(*) FILTER (WHERE stage = 'closed_lost')           AS total_lost
  FROM crm_opportunities
  GROUP BY owner
)
SELECT
  owner,
  won_this_month,
  COALESCE(revenue_this_month, 0)                          AS revenue_this_month,
  open_deals,
  total_won,
  total_lost,
  CASE WHEN (total_won + total_lost) > 0
    THEN ROUND(total_won::NUMERIC / (total_won + total_lost) * 100, 1)
    ELSE 0
  END                                                       AS win_rate
FROM monthly;

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE crm_accounts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunity_stage_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities                  ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated operations (same pattern as EPM)
DROP POLICY IF EXISTS crm_accounts_all      ON crm_accounts;
DROP POLICY IF EXISTS crm_contacts_all      ON crm_contacts;
DROP POLICY IF EXISTS crm_leads_all         ON crm_leads;
DROP POLICY IF EXISTS crm_opportunities_all ON crm_opportunities;
DROP POLICY IF EXISTS crm_stage_hist_all    ON crm_opportunity_stage_history;
DROP POLICY IF EXISTS crm_activities_all    ON crm_activities;
CREATE POLICY crm_accounts_all      ON crm_accounts              FOR ALL USING (TRUE);
CREATE POLICY crm_contacts_all      ON crm_contacts              FOR ALL USING (TRUE);
CREATE POLICY crm_leads_all         ON crm_leads                 FOR ALL USING (TRUE);
CREATE POLICY crm_opportunities_all ON crm_opportunities         FOR ALL USING (TRUE);
CREATE POLICY crm_stage_hist_all    ON crm_opportunity_stage_history FOR ALL USING (TRUE);
CREATE POLICY crm_activities_all    ON crm_activities            FOR ALL USING (TRUE);

-- =============================================================================
-- 8. SEED DATA
-- =============================================================================

-- Clear seed tables to ensure idempotency
DELETE FROM crm_activities;
DELETE FROM crm_opportunity_stage_history;
DELETE FROM crm_opportunities;
DELETE FROM crm_leads;
DELETE FROM crm_contacts;
DELETE FROM crm_accounts;

-- ─── Accounts ────────────────────────────────────────────────────────────────

INSERT INTO crm_accounts (account_code, account_name, trade_name, document_number, industry, company_size, account_type, owner, health_score, churn_risk, address_city, address_state, website) VALUES
  ('ACC-001', 'XP Investimentos S.A.',       'XP Investimentos', '02.332.886/0001-04', 'finance',    '500+',    'customer', 'Miguel', 88, 'low',    'São Paulo',      'SP', 'https://xpi.com.br'),
  ('ACC-002', 'Nu Pagamentos S.A.',           'Nubank',           '18.236.120/0001-58', 'finance',    '500+',    'customer', 'Danilo', 82, 'low',    'São Paulo',      'SP', 'https://nubank.com.br'),
  ('ACC-003', 'Colégio CEM',                  'Colégio CEM',      '60.621.457/0001-99', 'education',  '51-200',  'customer', 'Miguel', 75, 'medium', 'São Paulo',      'SP', null),
  ('ACC-004', 'Reabilicor Clínica Cardíaca',  'Reabilicor',       '12.345.678/0001-00', 'health',     '11-50',   'prospect', 'Danilo', 60, 'medium', 'Rio de Janeiro', 'RJ', null),
  ('ACC-005', 'Clínica Teresópolis',          'Clínica Teresópolis','98.765.432/0001-11','health',    '11-50',   'customer', 'Danilo', 72, 'low',    'Teresópolis',   'RJ', null),
  ('ACC-006', 'Carol Bertolini',              'Carol Bertolini',  '11.111.111/0001-22', 'media',      '1-10',    'customer', 'Miguel', 91, 'low',    'São Paulo',      'SP', null)
ON CONFLICT (account_code) DO NOTHING;

-- ─── Contacts ────────────────────────────────────────────────────────────────

INSERT INTO crm_contacts (account_id, full_name, email, phone, job_title, department, seniority, is_primary_contact) VALUES
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-001'), 'João Silva',       'joao.silva@xpi.com.br',          '11 3456-7890', 'Head of Marketing',  'Marketing',  'director', TRUE),
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-001'), 'Maria Santos',     'maria.santos@xpi.com.br',        '11 3456-7891', 'Brand Manager',      'Marketing',  'manager',  FALSE),
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-002'), 'Carlos Mendes',    'carlos.mendes@nubank.com.br',    '11 4567-8901', 'VP Marketing',       'Marketing',  'director', TRUE),
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-003'), 'Fernanda Costa',   'fernanda@colegiocm.com.br',      '11 5678-9012', 'Diretora Pedagógica','Diretoria',  'c_level',  TRUE),
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-004'), 'Dr. Roberto Silva','roberto@reabilicor.com.br',      '21 6789-0123', 'Diretor Médico',     'Diretoria',  'c_level',  TRUE),
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-005'), 'Dra. Aline Duarte','aline@clinicateresopolis.com.br','24 7890-1234', 'Sócia Fundadora',    'Diretoria',  'c_level',  TRUE),
  ((SELECT account_id FROM crm_accounts WHERE account_code='ACC-006'), 'Carol Bertolini',  'carol@carolbertolini.com.br',    '11 9999-0000', 'Artista',            'Pessoal',    'c_level',  TRUE)
ON CONFLICT DO NOTHING;

-- ─── Leads ───────────────────────────────────────────────────────────────────

INSERT INTO crm_leads (lead_id, lead_source, company_name, contact_name, email, phone, job_title, bu, lead_score, status, bant_budget, bant_authority, bant_need, bant_timeline, assigned_to, qualification_notes) VALUES
  ('00000000-0000-0000-0000-000000000011', 'inbound',  'Tech Solutions BR',    'Rafael Moura',     'rafael@techsolutions.com.br', '11 9999-0001', 'CEO',              'JACQES',  75, 'qualified',   25000,  TRUE,  'high',   '2026-05-30', 'Miguel', 'Grande interesse em gestão de mídias sociais'),
  ('00000000-0000-0000-0000-000000000012', 'referral', 'HealthFirst Clínicas', 'Dra. Sandra Lima', 'sandra@healthfirst.com.br',   '21 9888-0002', 'Sócia',            'ADVISOR', 60, 'contacted',   40000,  TRUE,  'medium', '2026-06-15', 'Danilo', 'Interesse em consultoria estratégica para expansão'),
  ('00000000-0000-0000-0000-000000000013', 'organic',  'Esporte Clube Nac.',   'Lucas Ferreira',   'lucas@ecnacional.com.br',     '11 9777-0003', 'Dir. de Marketing','CAZA',    40, 'new',         15000,  FALSE, 'low',    null,         'Miguel', null),
  ('00000000-0000-0000-0000-000000000014', 'manual',   'Fintechx',             'Ana Rocha',        'ana@fintechx.io',             '11 9666-0004', 'CMO',              'JACQES',  85, 'qualified',   60000,  TRUE,  'high',   '2026-05-15', 'Miguel', 'Quer escalar social media para campanha de lançamento'),
  ('00000000-0000-0000-0000-000000000015', 'paid',     'Construtora Viva',     'Pedro Andrade',    'pedro@construtoraviva.com.br','31 9555-0005', 'Gerente',          'CAZA',    30, 'unqualified', 5000,   FALSE, 'low',    null,         'Danilo', 'Orçamento muito abaixo do escopo desejado')
ON CONFLICT (lead_id) DO NOTHING;

-- ─── Opportunities ───────────────────────────────────────────────────────────

INSERT INTO crm_opportunities (opportunity_id, opportunity_code, opportunity_name, account_id, contact_id, bu, stage, deal_value, probability, expected_close_date, owner) VALUES
  ('00000000-0000-0000-0001-000000000001', 'OPP-001', 'XP Q2 — Campanha Performance',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-001'),
    (SELECT contact_id FROM crm_contacts  WHERE email='joao.silva@xpi.com.br'),
    'CAZA', 'discovery', 120000, 25, '2026-06-30', 'Miguel'),

  ('00000000-0000-0000-0001-000000000002', 'OPP-002', 'Nubank — Vídeo Institucional',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-002'),
    (SELECT contact_id FROM crm_contacts  WHERE email='carlos.mendes@nubank.com.br'),
    'CAZA', 'qualification', 85000, 40, '2026-05-31', 'Danilo'),

  ('00000000-0000-0000-0001-000000000003', 'OPP-003', 'CEM — Produção Anual 2026',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-003'),
    (SELECT contact_id FROM crm_contacts  WHERE email='fernanda@colegiocm.com.br'),
    'CAZA', 'proposal', 35000, 60, '2026-05-15', 'Miguel'),

  ('00000000-0000-0000-0001-000000000004', 'OPP-004', 'Reabilicor — Consultoria Estratégica',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-004'),
    (SELECT contact_id FROM crm_contacts  WHERE email='roberto@reabilicor.com.br'),
    'ADVISOR', 'negotiation', 95000, 75, '2026-05-10', 'Danilo'),

  ('00000000-0000-0000-0001-000000000005', 'OPP-005', 'Carol Bertolini — Pacote Social Media',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-006'),
    (SELECT contact_id FROM crm_contacts  WHERE email='carol@carolbertolini.com.br'),
    'JACQES', 'closed_won', 18000, 100, '2026-04-15', 'Miguel'),

  ('00000000-0000-0000-0001-000000000006', 'OPP-006', 'Clínica Teresópolis — Estratégia Digital',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-005'),
    (SELECT contact_id FROM crm_contacts  WHERE email='aline@clinicateresopolis.com.br'),
    'ADVISOR', 'closed_lost', 50000, 0, '2026-04-20', 'Danilo'),

  ('00000000-0000-0000-0001-000000000007', 'OPP-007', 'Fintechx — Social Media Growth',
    null, null, 'JACQES', 'discovery', 60000, 25, '2026-06-15', 'Miguel'),

  ('00000000-0000-0000-0001-000000000008', 'OPP-008', 'XP — Brand Refresh Q3',
    (SELECT account_id FROM crm_accounts WHERE account_code='ACC-001'),
    (SELECT contact_id FROM crm_contacts  WHERE email='joao.silva@xpi.com.br'),
    'CAZA', 'qualification', 45000, 40, '2026-07-31', 'Miguel')
ON CONFLICT (opportunity_id) DO NOTHING;

-- Update closed opp
UPDATE crm_opportunities SET actual_close_date = '2026-04-15', win_reason = 'Relationship,Price competitive'
  WHERE opportunity_id = '00000000-0000-0000-0001-000000000005';
UPDATE crm_opportunities SET actual_close_date = '2026-04-20', lost_reason = 'Price too high', proposal_sent_date = '2026-04-05'
  WHERE opportunity_id = '00000000-0000-0000-0001-000000000006';

-- ─── Activities ──────────────────────────────────────────────────────────────

INSERT INTO crm_activities (activity_type, related_to_type, related_to_id, subject, description, outcome, duration_minutes, status, completed_at, created_by) VALUES
  ('call',    'opportunity', '00000000-0000-0000-0001-000000000001', 'Discovery call — XP Q2',         'Entendimento inicial do escopo da campanha Q2',    'successful',    45, 'completed', NOW() - INTERVAL '5 days',  'Miguel'),
  ('meeting', 'opportunity', '00000000-0000-0000-0001-000000000002', 'Reunião de qualificação Nubank',  'Demo do portfólio de produção audiovisual',        'successful',    90, 'completed', NOW() - INTERVAL '3 days',  'Danilo'),
  ('email',   'opportunity', '00000000-0000-0000-0001-000000000003', 'Proposta enviada — CEM',          'Proposta completa com cronograma e valores',       'successful',    null,'completed', NOW() - INTERVAL '2 days',  'Miguel'),
  ('call',    'opportunity', '00000000-0000-0000-0001-000000000004', 'Negociação comercial Reabilicor', 'Discussão de condições de pagamento e escopo',     'successful',    60, 'completed', NOW() - INTERVAL '1 day',   'Danilo'),
  ('task',    'lead',        '00000000-0000-0000-0000-000000000014', 'Follow-up Fintechx — Ana Rocha',  'Enviar material de cases do JACQES',               null,            null,'scheduled', null,                       'Miguel'),
  ('meeting', 'account',     (SELECT account_id FROM crm_accounts WHERE account_code='ACC-001'), 'QBR — XP Investimentos', 'Revisão trimestral da parceria', 'successful', 120, 'completed', NOW() - INTERVAL '7 days', 'Miguel')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- AWQ GROUP — BPM Full Schema (PostgreSQL / Neon)
-- =============================================================================
-- Business Process Management — Approval Workflow Engine
--
-- Camadas:
--   1. Process Definitions  — process_definitions (6 workflows prontos)
--   2. Process Instances    — process_instances (execuções em andamento)
--   3. Process Tasks        — process_tasks (tarefas individuais de aprovação)
--   4. Process History      — process_history (audit trail completo)
--   5. Notifications        — bpm_notifications (in-app + email)
--   6. Views                — v_work_queue, v_process_performance,
--                             v_sla_dashboard, v_process_bottlenecks
--
-- Integra com: accounts_payable, budgets, ppm_projects (EPM + PPM schemas)
-- Usuários: TEXT IDs mapeados de lib/auth-users.ts ("1"–"6")
--           "4" = Danilo (finance_manager), "5" = Miguel (cfo/ceo)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROCESS DEFINITIONS (Catálogo de Workflows)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_definitions (
  process_def_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code    TEXT        NOT NULL UNIQUE, -- 'PO_APPROVAL', 'EXPENSE_APPROVAL'
  process_name    TEXT        NOT NULL,
  process_category TEXT       NOT NULL CHECK (process_category IN
                    ('approval','procurement','finance','legal','project_management')),
  description     TEXT,
  process_owner   TEXT,                        -- user_id from auth-users.ts

  -- WORKFLOW STRUCTURE
  workflow_steps  JSONB       NOT NULL,
  -- [{ step_id, step_name, step_type, approver_role, conditions?, sla_hours }]

  routing_rules   JSONB,                       -- conditional routing overrides

  -- SLA DEFAULTS
  default_sla_hours INTEGER   NOT NULL DEFAULT 48,
  escalation_enabled BOOLEAN  NOT NULL DEFAULT TRUE,
  escalation_hours  INTEGER   NOT NULL DEFAULT 72,

  -- NOTIFICATION CONFIG
  notification_config JSONB,

  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  version         INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT                         -- user_id
);

CREATE INDEX IF NOT EXISTS idx_process_defs_code     ON process_definitions(process_code);
CREATE INDEX IF NOT EXISTS idx_process_defs_category ON process_definitions(process_category);
CREATE INDEX IF NOT EXISTS idx_process_defs_active   ON process_definitions(is_active);

-- ── Update timestamp helper ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION bpm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_defs_updated_at ON process_definitions;
CREATE TRIGGER trg_process_defs_updated_at
  BEFORE UPDATE ON process_definitions
  FOR EACH ROW EXECUTE FUNCTION bpm_update_updated_at();

-- ── Seed: 6 Critical Workflows ────────────────────────────────────────────────

DELETE FROM process_instances;
DELETE FROM process_definitions;

INSERT INTO process_definitions
  (process_code, process_name, process_category, description, workflow_steps, default_sla_hours)
VALUES

-- 1. Purchase Order Approval
('PO_APPROVAL', 'Purchase Order Approval', 'procurement',
 'Aprovação de ordens de compra. >R$1K: Manager. >R$5K: Finance. >R$10K: CEO.',
 '[
   {"step_id":"1","step_name":"Manager Review","step_type":"approval",
    "approver_role":"manager","sla_hours":24,
    "conditions":{"amount":{"operator":">=","value":1000}}},
   {"step_id":"2","step_name":"Finance Approval","step_type":"approval",
    "approver_role":"finance_manager","sla_hours":48,
    "conditions":{"amount":{"operator":">=","value":5000}}},
   {"step_id":"3","step_name":"CEO Approval","step_type":"approval",
    "approver_role":"ceo","sla_hours":72,
    "conditions":{"amount":{"operator":">=","value":10000}}}
 ]', 72),

-- 2. Expense Approval
('EXPENSE_APPROVAL', 'Expense Approval', 'finance',
 'Aprovação de despesas operacionais. <R$1K: Manager. ≥R$1K: CFO.',
 '[
   {"step_id":"1","step_name":"Manager Approval","step_type":"approval",
    "approver_role":"manager","sla_hours":24,
    "conditions":{"amount":{"operator":"<","value":1000}}},
   {"step_id":"2","step_name":"CFO Approval","step_type":"approval",
    "approver_role":"cfo","sla_hours":48,
    "conditions":{"amount":{"operator":">=","value":1000}}}
 ]', 48),

-- 3. AP Approval
('AP_APPROVAL', 'Accounts Payable Approval', 'finance',
 'Aprovação de contas a pagar antes do pagamento. Sempre Finance; ≥R$5K também CFO.',
 '[
   {"step_id":"1","step_name":"Finance Manager Review","step_type":"approval",
    "approver_role":"finance_manager","sla_hours":48},
   {"step_id":"2","step_name":"CFO Approval","step_type":"approval",
    "approver_role":"cfo","sla_hours":48,
    "conditions":{"amount":{"operator":">=","value":5000}}}
 ]', 48),

-- 4. Budget Approval
('BUDGET_APPROVAL', 'Budget Approval', 'finance',
 'Aprovação do orçamento anual/trimestral. BU Lead → CFO → CEO → Locked.',
 '[
   {"step_id":"1","step_name":"BU Lead Review","step_type":"approval",
    "approver_role":"bu_lead","sla_hours":72},
   {"step_id":"2","step_name":"CFO Review","step_type":"approval",
    "approver_role":"cfo","sla_hours":96},
   {"step_id":"3","step_name":"CEO Final Approval","step_type":"approval",
    "approver_role":"ceo","sla_hours":120}
 ]', 240),

-- 5. Contract Approval
('CONTRACT_APPROVAL', 'Contract Approval', 'legal',
 'Aprovação de contratos antes da assinatura. Legal → Finance → CEO.',
 '[
   {"step_id":"1","step_name":"Legal Review","step_type":"approval",
    "approver_role":"legal","sla_hours":96},
   {"step_id":"2","step_name":"Finance Review","step_type":"approval",
    "approver_role":"finance_manager","sla_hours":48},
   {"step_id":"3","step_name":"CEO Signature","step_type":"approval",
    "approver_role":"ceo","sla_hours":72}
 ]', 168),

-- 6. Project Kickoff Approval
('PROJECT_KICKOFF', 'Project Kickoff Approval', 'project_management',
 'Aprovação para iniciar novo projeto. PM Review → CFO (se budget ≥R$50K).',
 '[
   {"step_id":"1","step_name":"PM Review","step_type":"approval",
    "approver_role":"pm","sla_hours":24},
   {"step_id":"2","step_name":"CFO Budget Approval","step_type":"approval",
    "approver_role":"cfo","sla_hours":48,
    "conditions":{"budget":{"operator":">=","value":50000}}}
 ]', 72)

ON CONFLICT (process_code) DO NOTHING;

-- =============================================================================
-- 2. PROCESS INSTANCES (Execuções em andamento)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_instances (
  instance_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code       TEXT        NOT NULL UNIQUE,  -- 'PI-2026-0001'

  -- PROCESSO
  process_def_id      UUID        REFERENCES process_definitions(process_def_id),
  process_code        TEXT        NOT NULL,
  process_name        TEXT        NOT NULL,

  -- OBJETO APROVADO
  related_entity_type TEXT        NOT NULL,  -- 'AP','PO','Budget','Contract','Project','Expense'
  related_entity_id   TEXT        NOT NULL,  -- PK of the related row (TEXT to support any PK type)

  -- SNAPSHOT DOS DADOS NO MOMENTO DO INÍCIO
  request_data        JSONB       NOT NULL DEFAULT '{}',

  -- INICIADOR
  initiated_by        TEXT        NOT NULL,  -- user_id
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ESTADO ATUAL
  current_step_id     TEXT,
  current_step_name   TEXT,
  status              TEXT        NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','approved','rejected','cancelled')),

  -- DATAS
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,

  -- SLA
  sla_due_date        TIMESTAMPTZ,
  sla_breached        BOOLEAN     NOT NULL DEFAULT FALSE,

  -- RESULTADO
  final_decision      TEXT        CHECK (final_decision IN ('approved','rejected','cancelled')),
  rejection_reason    TEXT,

  priority            TEXT        NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instances_process_def  ON process_instances(process_def_id);
CREATE INDEX IF NOT EXISTS idx_instances_status       ON process_instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_entity       ON process_instances(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_instances_initiated_by ON process_instances(initiated_by);
CREATE INDEX IF NOT EXISTS idx_instances_sla_due      ON process_instances(sla_due_date);

DROP TRIGGER IF EXISTS trg_process_instances_updated_at ON process_instances;
CREATE TRIGGER trg_process_instances_updated_at
  BEFORE UPDATE ON process_instances
  FOR EACH ROW EXECUTE FUNCTION bpm_update_updated_at();

-- Auto-mark SLA breach on update
CREATE OR REPLACE FUNCTION bpm_check_instance_sla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('in_progress')
     AND NEW.sla_due_date IS NOT NULL
     AND NEW.sla_due_date < NOW() THEN
    NEW.sla_breached = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instance_sla_check ON process_instances;
CREATE TRIGGER trg_instance_sla_check
  BEFORE UPDATE ON process_instances
  FOR EACH ROW EXECUTE FUNCTION bpm_check_instance_sla();

-- =============================================================================
-- 3. PROCESS TASKS (Tarefas individuais de aprovação)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_tasks (
  task_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  instance_id     UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,
  step_id         TEXT        NOT NULL,       -- "1", "2", "3"
  step_name       TEXT        NOT NULL,

  -- ASSIGNMENT
  assigned_to     TEXT        NOT NULL,       -- user_id
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  task_type       TEXT        NOT NULL DEFAULT 'approval'
                    CHECK (task_type IN ('approval','review','sign','acknowledge')),

  -- STATUS
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','rejected','cancelled','escalated')),

  -- DECISÃO
  decision        TEXT        CHECK (decision IN ('approved','rejected')),
  decision_notes  TEXT,
  decided_by      TEXT,                       -- user_id
  decided_at      TIMESTAMPTZ,

  -- SLA
  sla_hours       INTEGER,
  sla_due_date    TIMESTAMPTZ,
  sla_breached    BOOLEAN     NOT NULL DEFAULT FALSE,

  -- ESCALATION
  escalated       BOOLEAN     NOT NULL DEFAULT FALSE,
  escalated_to    TEXT,                       -- user_id
  escalated_at    TIMESTAMPTZ,

  task_data       JSONB,                      -- snapshot de request_data para este step

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_instance   ON process_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON process_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON process_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_due    ON process_tasks(sla_due_date);

DROP TRIGGER IF EXISTS trg_process_tasks_updated_at ON process_tasks;
CREATE TRIGGER trg_process_tasks_updated_at
  BEFORE UPDATE ON process_tasks
  FOR EACH ROW EXECUTE FUNCTION bpm_update_updated_at();

-- Auto-mark SLA breach on task update
CREATE OR REPLACE FUNCTION bpm_check_task_sla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending'
     AND NEW.sla_due_date IS NOT NULL
     AND NEW.sla_due_date < NOW() THEN
    NEW.sla_breached = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_sla_check ON process_tasks;
CREATE TRIGGER trg_task_sla_check
  BEFORE UPDATE ON process_tasks
  FOR EACH ROW EXECUTE FUNCTION bpm_check_task_sla();

-- =============================================================================
-- 4. PROCESS HISTORY (Audit trail completo)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_history (
  history_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id         UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,

  action              TEXT        NOT NULL,   -- 'started','step_completed','approved','rejected','escalated','cancelled'
  action_description  TEXT,

  step_id             TEXT,
  step_name           TEXT,

  performed_by        TEXT,                   -- user_id (NULL = system)
  performed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  action_data         JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_instance     ON process_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_history_performed_by ON process_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_history_date         ON process_history(performed_at);

-- =============================================================================
-- 5. NOTIFICATIONS (In-app + email)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bpm_notifications (
  notification_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id             TEXT        NOT NULL,   -- user_id

  notification_type   TEXT        NOT NULL
                        CHECK (notification_type IN (
                          'task_assigned','approval_needed','approved',
                          'rejected','escalated','sla_warning','sla_breached')),

  related_entity_type TEXT        CHECK (related_entity_type IN ('process_instance','process_task')),
  related_entity_id   UUID,

  title               TEXT        NOT NULL,
  message             TEXT        NOT NULL,
  action_url          TEXT,

  is_read             BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at             TIMESTAMPTZ,

  send_email          BOOLEAN     NOT NULL DEFAULT TRUE,
  email_sent          BOOLEAN     NOT NULL DEFAULT FALSE,
  email_sent_at       TIMESTAMPTZ,

  priority            TEXT        NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON bpm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON bpm_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_date   ON bpm_notifications(created_at);

-- =============================================================================
-- 6. ANALYTICAL VIEWS
-- =============================================================================

-- ── Work Queue (My Pending Tasks) ────────────────────────────────────────────

CREATE OR REPLACE VIEW v_work_queue AS
SELECT
  t.task_id,
  t.instance_id,
  t.step_id,
  t.step_name,
  t.task_type,
  t.status       AS task_status,
  t.assigned_to,
  t.assigned_at,
  t.sla_due_date,
  t.sla_breached,

  i.instance_code,
  i.process_code,
  i.process_name,
  i.related_entity_type,
  i.related_entity_id,
  i.request_data,
  i.initiated_by,
  i.priority,

  EXTRACT(EPOCH FROM (NOW() - t.assigned_at)) / 3600   AS hours_pending,
  EXTRACT(EPOCH FROM (t.sla_due_date - NOW())) / 3600   AS sla_hours_remaining

FROM process_tasks t
JOIN process_instances i ON t.instance_id = i.instance_id
WHERE t.status = 'pending'
ORDER BY
  CASE WHEN t.sla_breached     THEN 0 ELSE 1 END,
  CASE WHEN i.priority = 'urgent' THEN 0
       WHEN i.priority = 'high'   THEN 1
       WHEN i.priority = 'normal' THEN 2
       ELSE 3 END,
  t.sla_due_date ASC NULLS LAST,
  t.assigned_at  ASC;

-- ── Process Performance (last 90 days) ───────────────────────────────────────

CREATE OR REPLACE VIEW v_process_performance AS
SELECT
  pd.process_def_id,
  pd.process_code,
  pd.process_name,
  pd.process_category,

  COUNT(pi.instance_id)                                                      AS total_instances,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'approved')                AS approved_count,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'rejected')                AS rejected_count,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'in_progress')             AS in_progress_count,

  CASE WHEN COUNT(pi.instance_id) FILTER (WHERE pi.status IN ('approved','rejected')) > 0
    THEN ROUND(
      COUNT(pi.instance_id) FILTER (WHERE pi.status = 'approved')::NUMERIC /
      COUNT(pi.instance_id) FILTER (WHERE pi.status IN ('approved','rejected')) * 100, 1)
    ELSE 0
  END AS approval_rate_pct,

  ROUND(AVG(
    EXTRACT(EPOCH FROM (pi.completed_at - pi.started_at)) / 3600
  ) FILTER (WHERE pi.completed_at IS NOT NULL), 1)                            AS avg_cycle_time_hours,

  COUNT(pi.instance_id) FILTER (WHERE pi.sla_breached)                       AS sla_breaches,

  CASE WHEN COUNT(pi.instance_id) > 0
    THEN ROUND(
      (COUNT(pi.instance_id) - COUNT(pi.instance_id) FILTER (WHERE pi.sla_breached))::NUMERIC /
      COUNT(pi.instance_id) * 100, 1)
    ELSE 100
  END AS sla_compliance_pct

FROM process_definitions pd
LEFT JOIN process_instances pi
  ON pd.process_def_id = pi.process_def_id
  AND pi.created_at >= CURRENT_DATE - INTERVAL '90 days'
WHERE pd.is_active = TRUE
GROUP BY pd.process_def_id, pd.process_code, pd.process_name, pd.process_category;

-- ── SLA Dashboard ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_sla_dashboard AS
SELECT
  pd.process_code,
  pd.process_name,

  COUNT(t.task_id)                                                            AS active_tasks,
  COUNT(t.task_id) FILTER (WHERE t.sla_breached)                             AS breached_tasks,
  COUNT(t.task_id) FILTER (WHERE t.sla_due_date < NOW() + INTERVAL '24 hours'
                              AND NOT t.sla_breached)                        AS at_risk_tasks,

  ROUND(AVG(
    EXTRACT(EPOCH FROM (t.decided_at - t.assigned_at)) / 3600
  ) FILTER (WHERE t.decided_at IS NOT NULL), 1)                              AS avg_response_hours

FROM process_definitions pd
LEFT JOIN process_instances pi  ON pd.process_def_id = pi.process_def_id
LEFT JOIN process_tasks     t   ON pi.instance_id = t.instance_id
WHERE pd.is_active = TRUE
  AND (t.status = 'pending' OR t.decided_at >= CURRENT_DATE - INTERVAL '30 days')
GROUP BY pd.process_code, pd.process_name;

-- ── Bottleneck Analysis ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_process_bottlenecks AS
SELECT
  pd.process_code,
  pd.process_name,
  t.step_name,

  COUNT(t.task_id)                                                            AS task_count,
  COUNT(t.task_id) FILTER (WHERE t.sla_breached)                             AS breach_count,

  ROUND(AVG(
    EXTRACT(EPOCH FROM (t.decided_at - t.assigned_at)) / 3600
  ) FILTER (WHERE t.decided_at IS NOT NULL)::numeric, 1)                    AS avg_time_hours,

  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (t.decided_at - t.assigned_at)) / 3600
  ) FILTER (WHERE t.decided_at IS NOT NULL))::numeric, 1)                   AS median_time_hours

FROM process_definitions pd
JOIN process_instances pi ON pd.process_def_id = pi.process_def_id
JOIN process_tasks     t  ON pi.instance_id = t.instance_id
WHERE pi.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY pd.process_code, pd.process_name, t.step_name
ORDER BY avg_time_hours DESC NULLS LAST;

-- =============================================================================
-- 7. INTEGRATION TRIGGERS (EPM + PPM sync)
-- =============================================================================

-- ── AP: workflow approved → update accounts_payable ──────────────────────────

CREATE OR REPLACE FUNCTION bpm_on_ap_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.related_entity_type = 'AP' THEN
    UPDATE accounts_payable
       SET approval_status = 'approved',
           approved_by     = NEW.initiated_by,
           approved_at     = NOW(),
           status          = 'approved'
     WHERE ap_id::TEXT = NEW.related_entity_id;
  END IF;

  IF NEW.status = 'rejected' AND OLD.status <> 'rejected'
     AND NEW.related_entity_type = 'AP' THEN
    UPDATE accounts_payable
       SET approval_status = 'rejected',
           status          = 'cancelled'
     WHERE ap_id::TEXT = NEW.related_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bpm_ap_approved ON process_instances;
CREATE TRIGGER trg_bpm_ap_approved
  AFTER UPDATE ON process_instances
  FOR EACH ROW
  WHEN (NEW.related_entity_type = 'AP')
  EXECUTE FUNCTION bpm_on_ap_approved();

-- ── Budget: workflow approved → lock budget ───────────────────────────────────

CREATE OR REPLACE FUNCTION bpm_on_budget_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.related_entity_type = 'Budget' THEN
    UPDATE budgets
       SET status      = 'approved',
           approved_by = NEW.initiated_by,
           approved_at = NOW(),
           is_locked   = TRUE
     WHERE budget_id::TEXT = NEW.related_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bpm_budget_approved ON process_instances;
CREATE TRIGGER trg_bpm_budget_approved
  AFTER UPDATE ON process_instances
  FOR EACH ROW
  WHEN (NEW.related_entity_type = 'Budget')
  EXECUTE FUNCTION bpm_on_budget_approved();

-- ── Project Kickoff: workflow approved → activate project ────────────────────

CREATE OR REPLACE FUNCTION bpm_on_project_kickoff_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.related_entity_type = 'Project' THEN
    -- Try ppm_projects first, fall back to projects
    UPDATE ppm_projects
       SET status = 'active',
           phase  = 'execution'
     WHERE project_id::TEXT = NEW.related_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bpm_project_kickoff_approved ON process_instances;
CREATE TRIGGER trg_bpm_project_kickoff_approved
  AFTER UPDATE ON process_instances
  FOR EACH ROW
  WHEN (NEW.related_entity_type = 'Project')
  EXECUTE FUNCTION bpm_on_project_kickoff_approved();

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================


-- =============================================================================
-- AWQ GROUP — M&A & Portfolio Management Full Schema (PostgreSQL / Neon)
-- =============================================================================
-- Module: Holding-Level M&A & Portfolio Management
-- Extends: EPM (general_ledger, business_units, accounts)
--          CRM (accounts)
--          PPM (projects)
-- Principle: EXTEND, not REPLACE. Zero breaking changes on existing tables.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. DEALS (M&A Deal Pipeline)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_deals (
  deal_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_code             TEXT        NOT NULL UNIQUE,                -- "DEAL-2026-001"
  deal_name             TEXT        NOT NULL,
  company_name          TEXT        NOT NULL,
  company_website       TEXT,
  industry              TEXT,
  company_stage         TEXT,                                       -- pre_seed, seed, series_a, growth
  deal_type             TEXT        NOT NULL DEFAULT 'm4e',         -- m4e, equity_investment, acquisition

  -- Pipeline
  pipeline_stage        TEXT        NOT NULL DEFAULT 'sourcing',    -- sourcing, screening, due_diligence, structuring, ic_review, closed_won, closed_lost
  lead_source           TEXT,                                       -- inbound, outbound, referral, event
  lead_source_detail    TEXT,

  -- Screening scores (0-25 each, total 0-100)
  market_score          NUMERIC(5,2) DEFAULT 0,
  team_score            NUMERIC(5,2) DEFAULT 0,
  product_score         NUMERIC(5,2) DEFAULT 0,
  traction_score        NUMERIC(5,2) DEFAULT 0,
  total_score           NUMERIC(5,2) DEFAULT 0,
  screening_decision    TEXT,                                       -- pass, no_go, pending
  screening_notes       TEXT,

  -- Due Diligence
  dd_status             TEXT        DEFAULT 'not_started',          -- not_started, in_progress, completed
  dd_completion_pct     NUMERIC(5,2) DEFAULT 0,
  dd_start_date         DATE,
  dd_end_date           DATE,

  -- Deal Terms
  proposed_valuation          NUMERIC(15,2),
  proposed_investment_amount  NUMERIC(15,2),
  proposed_equity_pct         NUMERIC(5,2),
  media_commitment_value      NUMERIC(15,2),
  media_delivery_period_months INTEGER,
  board_seat                  BOOLEAN DEFAULT FALSE,
  observer_rights             BOOLEAN DEFAULT FALSE,
  vesting_period_years        INTEGER,
  vesting_cliff_months        INTEGER,

  -- IC
  ic_memo_url           TEXT,
  ic_presentation_url   TEXT,
  ic_meeting_date       DATE,
  ic_decision           TEXT,                                       -- approved, rejected, deferred
  ic_decision_date      DATE,
  ic_decision_notes     TEXT,

  -- Closing
  expected_close_date   DATE,
  actual_close_date     DATE,
  close_reason          TEXT,
  close_notes           TEXT,

  -- Link to portco (if closed_won)
  portco_id             UUID,                                       -- FK → ma_portfolio_companies.portco_id (added below)

  -- Ownership
  deal_lead             TEXT,                                       -- "Miguel"

  tags                  JSONB,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT
);

CREATE INDEX IF NOT EXISTS idx_ma_deals_stage   ON ma_deals(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_ma_deals_type    ON ma_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_ma_deals_portco  ON ma_deals(portco_id);

CREATE OR REPLACE FUNCTION calculate_ma_deal_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_score = COALESCE(NEW.market_score,0) + COALESCE(NEW.team_score,0)
                  + COALESCE(NEW.product_score,0) + COALESCE(NEW.traction_score,0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_deal_score ON ma_deals;
CREATE TRIGGER trg_ma_deal_score
  BEFORE INSERT OR UPDATE ON ma_deals
  FOR EACH ROW EXECUTE FUNCTION calculate_ma_deal_score();

DROP TRIGGER IF EXISTS trg_ma_deals_updated_at ON ma_deals;
CREATE TRIGGER trg_ma_deals_updated_at
  BEFORE UPDATE ON ma_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. PORTFOLIO COMPANIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_portfolio_companies (
  portco_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_code           TEXT        NOT NULL UNIQUE,                -- "PORTCO-2026-001"
  legal_name            TEXT        NOT NULL,
  trade_name            TEXT,
  document_number       TEXT,                                       -- CNPJ

  -- Deal link
  deal_id               UUID        REFERENCES ma_deals(deal_id),
  deal_type             TEXT        DEFAULT 'm4e',

  -- Investment
  investment_date       DATE        NOT NULL,
  awq_ownership_pct     NUMERIC(5,2),
  awq_shares_held       BIGINT,
  total_shares_outstanding BIGINT,

  -- Valuation
  entry_valuation       NUMERIC(15,2),
  current_valuation     NUMERIC(15,2),
  valuation_date        DATE,

  -- M4E media commitment
  media_commitment_value    NUMERIC(15,2),
  media_delivered_value     NUMERIC(15,2) DEFAULT 0,
  media_remaining_value     NUMERIC(15,2),
  media_delivery_start_date DATE,
  media_delivery_end_date   DATE,

  -- Governance
  board_seat            BOOLEAN DEFAULT FALSE,
  observer_rights       BOOLEAN DEFAULT FALSE,
  board_meeting_frequency TEXT,                                     -- monthly, quarterly

  -- Company info
  company_stage         TEXT,
  ceo_name              TEXT,
  ceo_email             TEXT,
  ceo_phone             TEXT,
  website               TEXT,
  industry              TEXT,
  sector                TEXT,

  -- Status
  status                TEXT        NOT NULL DEFAULT 'active',      -- active, exited, written_off

  -- Exit
  exit_date             DATE,
  exit_type             TEXT,                                       -- acquisition, ipo, secondary_sale
  exit_valuation        NUMERIC(15,2),
  exit_proceeds         NUMERIC(15,2),

  tags                  JSONB,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT
);

CREATE INDEX IF NOT EXISTS idx_ma_portco_status ON ma_portfolio_companies(status);
CREATE INDEX IF NOT EXISTS idx_ma_portco_deal   ON ma_portfolio_companies(deal_id);

-- Auto-calc media_remaining_value
CREATE OR REPLACE FUNCTION update_ma_media_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.media_remaining_value = COALESCE(NEW.media_commitment_value,0) - COALESCE(NEW.media_delivered_value,0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_media_remaining ON ma_portfolio_companies;
CREATE TRIGGER trg_ma_media_remaining
  BEFORE INSERT OR UPDATE ON ma_portfolio_companies
  FOR EACH ROW EXECUTE FUNCTION update_ma_media_remaining();

DROP TRIGGER IF EXISTS trg_ma_portco_updated_at ON ma_portfolio_companies;
CREATE TRIGGER trg_ma_portco_updated_at
  BEFORE UPDATE ON ma_portfolio_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK from ma_deals.portco_id
ALTER TABLE ma_deals DROP CONSTRAINT IF EXISTS fk_ma_deals_portco;
ALTER TABLE ma_deals
  ADD CONSTRAINT fk_ma_deals_portco
  FOREIGN KEY (portco_id) REFERENCES ma_portfolio_companies(portco_id)
  DEFERRABLE INITIALLY DEFERRED;

-- =============================================================================
-- 3. DUE DILIGENCE ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_due_diligence_items (
  dd_item_id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID  NOT NULL REFERENCES ma_deals(deal_id) ON DELETE CASCADE,

  dd_category   TEXT  NOT NULL,                                     -- financial, legal, commercial, technical, esg
  item_name     TEXT  NOT NULL,
  item_description TEXT,

  status        TEXT  DEFAULT 'pending',                            -- pending, in_progress, completed, not_applicable
  completion_pct NUMERIC(5,2) DEFAULT 0,

  finding       TEXT,                                               -- clear, minor_issue, major_issue, red_flag
  finding_notes TEXT,
  risk_level    TEXT,                                               -- low, medium, high, critical

  documents     JSONB,                                              -- [{name, url}]
  assigned_to   TEXT,
  due_date      DATE,
  completed_date DATE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_dd_deal     ON ma_due_diligence_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_ma_dd_category ON ma_due_diligence_items(dd_category);
CREATE INDEX IF NOT EXISTS idx_ma_dd_status   ON ma_due_diligence_items(status);

DROP TRIGGER IF EXISTS trg_ma_dd_updated_at ON ma_due_diligence_items;
CREATE TRIGGER trg_ma_dd_updated_at
  BEFORE UPDATE ON ma_due_diligence_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. CAP TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_cap_table (
  cap_table_id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id       UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  shareholder_name   TEXT NOT NULL,
  shareholder_type   TEXT,                                          -- founder, investor, employee, advisor
  shareholder_entity TEXT,

  share_class     TEXT DEFAULT 'common',                            -- common, preferred, options
  shares_held     BIGINT NOT NULL,
  ownership_pct   NUMERIC(5,2),

  -- Vesting
  vesting_schedule    TEXT,
  vesting_start_date  DATE,
  vesting_cliff_date  DATE,
  vesting_end_date    DATE,
  shares_vested       BIGINT DEFAULT 0,
  shares_unvested     BIGINT,

  cost_per_share    NUMERIC(15,6),
  total_cost_basis  NUMERIC(15,2),
  acquisition_date  DATE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_cap_table_portco ON ma_cap_table(portco_id);

-- Auto-calc ownership_pct & unvested
CREATE OR REPLACE FUNCTION update_ma_ownership_pct()
RETURNS TRIGGER AS $$
DECLARE
  total_shares BIGINT;
BEGIN
  SELECT total_shares_outstanding INTO total_shares
  FROM ma_portfolio_companies WHERE portco_id = NEW.portco_id;

  IF total_shares IS NOT NULL AND total_shares > 0 THEN
    NEW.ownership_pct = ROUND((NEW.shares_held::NUMERIC / total_shares::NUMERIC) * 100, 2);
  END IF;
  NEW.shares_unvested = NEW.shares_held - COALESCE(NEW.shares_vested, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_ownership_pct ON ma_cap_table;
CREATE TRIGGER trg_ma_ownership_pct
  BEFORE INSERT OR UPDATE ON ma_cap_table
  FOR EACH ROW EXECUTE FUNCTION update_ma_ownership_pct();

DROP TRIGGER IF EXISTS trg_ma_cap_table_updated_at ON ma_cap_table;
CREATE TRIGGER trg_ma_cap_table_updated_at
  BEFORE UPDATE ON ma_cap_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. PORTCO KPIs (Monthly Reporting)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_portco_kpis (
  kpi_id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id       UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  reporting_date  DATE  NOT NULL,
  year_month      TEXT,                                             -- "2026-03"

  -- Financial
  mrr             NUMERIC(15,2),
  arr             NUMERIC(15,2),
  total_revenue   NUMERIC(15,2),
  gross_margin_pct NUMERIC(5,2),
  burn_rate       NUMERIC(15,2),
  cash_balance    NUMERIC(15,2),
  runway_months   NUMERIC(5,1),

  -- Growth
  mom_growth_pct  NUMERIC(5,2),
  yoy_growth_pct  NUMERIC(5,2),
  cac             NUMERIC(15,2),
  ltv             NUMERIC(15,2),
  ltv_cac_ratio   NUMERIC(5,2),

  -- Operational
  gmv             NUMERIC(15,2),
  active_users    INTEGER,
  new_users       INTEGER,
  churn_rate_pct  NUMERIC(5,2),
  nps             NUMERIC(5,2),
  headcount       INTEGER,

  -- Milestones
  product_launched        BOOLEAN DEFAULT FALSE,
  funding_round_closed    BOOLEAN DEFAULT FALSE,

  notes           TEXT,
  submitted_by    TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(portco_id, reporting_date)
);

CREATE INDEX IF NOT EXISTS idx_ma_kpis_portco ON ma_portco_kpis(portco_id);
CREATE INDEX IF NOT EXISTS idx_ma_kpis_date   ON ma_portco_kpis(reporting_date);
CREATE INDEX IF NOT EXISTS idx_ma_kpis_month  ON ma_portco_kpis(year_month);

-- Auto-set year_month, ARR, runway, LTV:CAC
CREATE OR REPLACE FUNCTION ma_kpi_derived()
RETURNS TRIGGER AS $$
BEGIN
  NEW.year_month = TO_CHAR(NEW.reporting_date, 'YYYY-MM');
  IF NEW.mrr IS NOT NULL THEN NEW.arr = NEW.mrr * 12; END IF;
  IF NEW.cash_balance IS NOT NULL AND NEW.burn_rate IS NOT NULL AND NEW.burn_rate < 0 THEN
    NEW.runway_months = ROUND(NEW.cash_balance / ABS(NEW.burn_rate), 1);
  END IF;
  IF NEW.ltv IS NOT NULL AND NEW.cac IS NOT NULL AND NEW.cac > 0 THEN
    NEW.ltv_cac_ratio = ROUND(NEW.ltv / NEW.cac, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_kpi_derived ON ma_portco_kpis;
CREATE TRIGGER trg_ma_kpi_derived
  BEFORE INSERT OR UPDATE ON ma_portco_kpis
  FOR EACH ROW EXECUTE FUNCTION ma_kpi_derived();

DROP TRIGGER IF EXISTS trg_ma_kpis_updated_at ON ma_portco_kpis;
CREATE TRIGGER trg_ma_kpis_updated_at
  BEFORE UPDATE ON ma_portco_kpis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. BOARD MEETINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_board_meetings (
  meeting_id      UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id       UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  meeting_date    DATE  NOT NULL,
  meeting_type    TEXT  DEFAULT 'regular',                          -- regular, special, annual
  agenda          TEXT,

  board_deck_url          TEXT,
  financial_report_url    TEXT,
  other_materials         JSONB,

  attendees               JSONB,
  awq_representative      TEXT,

  minutes_url     TEXT,
  resolutions     JSONB,
  action_items    JSONB,

  status          TEXT  DEFAULT 'scheduled',                        -- scheduled, completed, cancelled
  notes           TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_board_portco ON ma_board_meetings(portco_id);
CREATE INDEX IF NOT EXISTS idx_ma_board_date   ON ma_board_meetings(meeting_date);

DROP TRIGGER IF EXISTS trg_ma_board_updated_at ON ma_board_meetings;
CREATE TRIGGER trg_ma_board_updated_at
  BEFORE UPDATE ON ma_board_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. MEDIA DELIVERABLES (M4E Tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_media_deliverables (
  deliverable_id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id         UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  deliverable_type  TEXT  NOT NULL,                                 -- social_media, video_production, branding, campaign, event
  description       TEXT,
  agreed_value      NUMERIC(15,2),

  executing_bu      TEXT,                                           -- JACQES, CAZA, STUDIO
  project_ref       TEXT,                                           -- project reference from PPM

  scheduled_delivery_date DATE,
  actual_delivery_date    DATE,

  status            TEXT  DEFAULT 'planned',                        -- planned, in_progress, delivered, approved

  approved_by_portco BOOLEAN DEFAULT FALSE,
  approval_date      DATE,
  approval_notes     TEXT,
  deliverable_url    TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_media_portco ON ma_media_deliverables(portco_id);
CREATE INDEX IF NOT EXISTS idx_ma_media_bu     ON ma_media_deliverables(executing_bu);

-- Auto-update portco.media_delivered_value when deliverable approved
CREATE OR REPLACE FUNCTION update_ma_portco_media_delivered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_by_portco = TRUE THEN
    UPDATE ma_portfolio_companies
    SET media_delivered_value = (
      SELECT COALESCE(SUM(agreed_value), 0)
      FROM ma_media_deliverables
      WHERE portco_id = NEW.portco_id
        AND status = 'approved' AND approved_by_portco = TRUE
    )
    WHERE portco_id = NEW.portco_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_media_delivered ON ma_media_deliverables;
CREATE TRIGGER trg_ma_media_delivered
  AFTER INSERT OR UPDATE ON ma_media_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_ma_portco_media_delivered();

DROP TRIGGER IF EXISTS trg_ma_media_updated_at ON ma_media_deliverables;
CREATE TRIGGER trg_ma_media_updated_at
  BEFORE UPDATE ON ma_media_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. INTERCOMPANY TRANSACTIONS (Consolidation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_intercompany_transactions (
  ic_transaction_id UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  transaction_date  DATE  NOT NULL,
  transaction_type  TEXT,                                           -- sale, loan, shared_service_allocation, dividend, media_delivery

  from_entity_type  TEXT,                                           -- bu, portco, holding
  from_entity_id    TEXT,
  from_entity_name  TEXT,

  to_entity_type    TEXT,
  to_entity_id      TEXT,
  to_entity_name    TEXT,

  amount            NUMERIC(15,2) NOT NULL,
  debit_account_code  TEXT,                                         -- GL account codes for elimination
  credit_account_code TEXT,

  description       TEXT,
  source_system     TEXT,                                           -- epm, ppm, ma

  elimination_status TEXT DEFAULT 'pending',                        -- pending, eliminated, excluded
  elimination_date   DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_ic_date         ON ma_intercompany_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ma_ic_from_entity  ON ma_intercompany_transactions(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_ma_ic_to_entity    ON ma_intercompany_transactions(to_entity_id);

-- =============================================================================
-- 9. SYNERGY OPPORTUNITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_synergy_opportunities (
  synergy_id        UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  synergy_type      TEXT,                                           -- cross_selling, shared_resource, knowledge_sharing, cost_reduction
  opportunity_name  TEXT,
  description       TEXT,

  source_bu         TEXT,
  target_bu         TEXT,
  portco_id         UUID  REFERENCES ma_portfolio_companies(portco_id),

  estimated_revenue_impact  NUMERIC(15,2),
  estimated_cost_savings    NUMERIC(15,2),

  status            TEXT  DEFAULT 'identified',                     -- identified, in_progress, realized, abandoned

  identified_date   DATE  DEFAULT CURRENT_DATE,
  realization_date  DATE,

  actual_revenue_impact  NUMERIC(15,2),
  actual_cost_savings    NUMERIC(15,2),

  owner             TEXT,
  notes             TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_synergy_portco ON ma_synergy_opportunities(portco_id);

DROP TRIGGER IF EXISTS trg_ma_synergy_updated_at ON ma_synergy_opportunities;
CREATE TRIGGER trg_ma_synergy_updated_at
  BEFORE UPDATE ON ma_synergy_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 10. INVESTMENT COMMITTEE MEETINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_ic_meetings (
  ic_meeting_id   UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  meeting_date    DATE  NOT NULL,
  meeting_type    TEXT  DEFAULT 'regular',
  attendees       JSONB,
  deals_reviewed  JSONB,                                            -- [deal_id, ...]
  minutes_url     TEXT,
  status          TEXT  DEFAULT 'scheduled',                        -- scheduled, completed, cancelled

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_ic_meetings_date ON ma_ic_meetings(meeting_date);

CREATE TABLE IF NOT EXISTS ma_ic_decisions (
  ic_decision_id  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  ic_meeting_id   UUID  REFERENCES ma_ic_meetings(ic_meeting_id),
  deal_id         UUID  NOT NULL REFERENCES ma_deals(deal_id),

  decision        TEXT  NOT NULL,                                   -- approved, rejected, deferred
  decision_date   DATE  NOT NULL,
  votes           JSONB,                                            -- [{member, vote}]
  vote_result     TEXT,                                             -- unanimous, majority, split
  decision_rationale TEXT,
  conditions      TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_ic_decisions_deal    ON ma_ic_decisions(deal_id);
CREATE INDEX IF NOT EXISTS idx_ma_ic_decisions_meeting ON ma_ic_decisions(ic_meeting_id);

-- =============================================================================
-- 11. CONSOLIDATED VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_ma_portfolio_dashboard AS
SELECT
  pc.portco_id,
  pc.portco_code,
  pc.legal_name,
  pc.trade_name,
  pc.awq_ownership_pct,
  pc.entry_valuation,
  pc.current_valuation,
  pc.current_valuation - pc.entry_valuation                                           AS unrealized_gain,
  CASE WHEN pc.entry_valuation > 0
    THEN ROUND(pc.current_valuation / pc.entry_valuation, 2) ELSE NULL END            AS valuation_multiple,
  pc.media_commitment_value,
  pc.media_delivered_value,
  pc.media_remaining_value,
  CASE WHEN pc.media_commitment_value > 0
    THEN ROUND((pc.media_delivered_value / pc.media_commitment_value) * 100, 1)
    ELSE 0 END                                                                        AS media_delivery_pct,
  k.mrr            AS latest_mrr,
  k.arr            AS latest_arr,
  k.burn_rate      AS latest_burn,
  k.runway_months  AS latest_runway,
  k.mom_growth_pct AS latest_mom_growth,
  k.headcount      AS latest_headcount,
  k.reporting_date AS kpi_as_of,
  pc.company_stage,
  pc.status,
  pc.investment_date,
  pc.industry,
  pc.ceo_name,
  pc.board_seat,
  pc.deal_type
FROM ma_portfolio_companies pc
LEFT JOIN LATERAL (
  SELECT * FROM ma_portco_kpis
  WHERE portco_id = pc.portco_id
  ORDER BY reporting_date DESC LIMIT 1
) k ON TRUE
ORDER BY pc.current_valuation DESC;

CREATE OR REPLACE VIEW v_ma_deal_pipeline AS
SELECT
  d.*,
  COUNT(dd.dd_item_id)                                              AS dd_total_items,
  COUNT(dd.dd_item_id) FILTER (WHERE dd.status = 'completed')      AS dd_completed_items
FROM ma_deals d
LEFT JOIN ma_due_diligence_items dd ON dd.deal_id = d.deal_id
GROUP BY d.deal_id;

CREATE OR REPLACE VIEW v_ma_pipeline_funnel AS
SELECT
  pipeline_stage,
  COUNT(*)                               AS deal_count,
  SUM(proposed_investment_amount)        AS total_investment,
  AVG(total_score)                       AS avg_score
FROM ma_deals
WHERE pipeline_stage NOT IN ('closed_won', 'closed_lost')
GROUP BY pipeline_stage
ORDER BY CASE pipeline_stage
  WHEN 'sourcing'      THEN 1
  WHEN 'screening'     THEN 2
  WHEN 'due_diligence' THEN 3
  WHEN 'structuring'   THEN 4
  WHEN 'ic_review'     THEN 5 END;

-- =============================================================================
-- 12. SEED DATA — Enerdy (first portco, M4E deal March 2026)
-- =============================================================================

-- Clear M&A seed tables for idempotency
DELETE FROM ma_ic_decisions;
DELETE FROM ma_ic_meetings;
DELETE FROM ma_synergy_opportunities;
DELETE FROM ma_intercompany_transactions;
DELETE FROM ma_media_deliverables;
DELETE FROM ma_board_meetings;
DELETE FROM ma_portco_kpis;
DELETE FROM ma_cap_table;
DELETE FROM ma_due_diligence_items;
DELETE FROM ma_portfolio_companies;
DELETE FROM ma_deals;

-- Deal
INSERT INTO ma_deals (
  deal_code, deal_name, company_name, industry, company_stage, deal_type,
  pipeline_stage, lead_source,
  market_score, team_score, product_score, traction_score,
  proposed_valuation, proposed_investment_amount, proposed_equity_pct,
  media_commitment_value, media_delivery_period_months,
  board_seat, observer_rights,
  ic_decision, ic_decision_date,
  actual_close_date, close_reason,
  deal_lead, created_by
) VALUES (
  'DEAL-2026-001', 'Enerdy M4E Deal', 'Grupo Energdy',
  'Energia / Utilities', 'pre_seed', 'm4e',
  'closed_won', 'referral',
  20, 18, 15, 12,
  1000000, 200000, 20,
  200000, 24,
  FALSE, TRUE,
  'approved', '2026-02-28',
  '2026-03-01', 'won_terms',
  'Miguel', 'Miguel'
) ON CONFLICT (deal_code) DO NOTHING;

-- Portfolio Company
INSERT INTO ma_portfolio_companies (
  portco_code, legal_name, trade_name,
  deal_type, investment_date,
  awq_ownership_pct, awq_shares_held, total_shares_outstanding,
  entry_valuation, current_valuation, valuation_date,
  media_commitment_value, media_delivered_value,
  media_delivery_start_date, media_delivery_end_date,
  board_seat, observer_rights, board_meeting_frequency,
  company_stage, industry, sector,
  ceo_name, ceo_email, website,
  status, created_by
) VALUES (
  'PORTCO-2026-001', 'Grupo Energdy Soluções Ltda', 'Grupo Energdy',
  'm4e', '2026-03-01',
  20.00, 200000, 1000000,
  1000000, 1050000, '2026-04-30',
  200000, 24000,
  '2026-03-01', '2028-02-28',
  FALSE, TRUE, 'monthly',
  'pre_seed', 'Energia / Utilities', 'Energia',
  'Fundadores Energdy', 'contato@energdy.com.br', 'https://energdy.com.br',
  'active', 'Miguel'
) ON CONFLICT (portco_code) DO NOTHING;

-- Link deal → portco
UPDATE ma_deals d
SET portco_id = pc.portco_id
FROM ma_portfolio_companies pc
WHERE d.deal_code = 'DEAL-2026-001' AND pc.portco_code = 'PORTCO-2026-001';

-- Cap Table — Enerdy
INSERT INTO ma_cap_table (portco_id, shareholder_name, shareholder_type, shareholder_entity,
  share_class, shares_held, shares_vested, cost_per_share, total_cost_basis, acquisition_date)
SELECT
  pc.portco_id, 'Fundadores Energdy', 'founder', 'Fundadores',
  'common', 700000, 700000, 1.00, 700000, '2023-01-01'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_cap_table (portco_id, shareholder_name, shareholder_type, shareholder_entity,
  share_class, shares_held, shares_vested,
  vesting_schedule, vesting_start_date, vesting_cliff_date, vesting_end_date,
  cost_per_share, total_cost_basis, acquisition_date)
SELECT
  pc.portco_id, 'AWQ Group', 'investor', 'AWQ Produções Ltda',
  'common', 200000, 0,
  '4 anos, 1 ano cliff, vesting mensal', '2026-03-01', '2027-03-01', '2030-03-01',
  1.00, 200000, '2026-03-01'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_cap_table (portco_id, shareholder_name, shareholder_type, shareholder_entity,
  share_class, shares_held, shares_vested, cost_per_share, total_cost_basis, acquisition_date)
SELECT
  pc.portco_id, 'Investidores Anjos', 'investor', 'Angels Round',
  'common', 100000, 100000, 1.50, 150000, '2025-06-01'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- KPIs Enerdy — Mar/2026
INSERT INTO ma_portco_kpis (portco_id, reporting_date, mrr, total_revenue,
  gross_margin_pct, burn_rate, cash_balance, mom_growth_pct, headcount, notes, submitted_by)
SELECT
  pc.portco_id, '2026-03-31', 8500, 8500,
  65, -22000, 180000, NULL, 4,
  'Primeiro mês pós deal AWQ. MRR inicial, queimando caixa na estruturação.', 'Miguel'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT (portco_id, reporting_date) DO NOTHING;

INSERT INTO ma_portco_kpis (portco_id, reporting_date, mrr, total_revenue,
  gross_margin_pct, burn_rate, cash_balance, mom_growth_pct, headcount, notes, submitted_by)
SELECT
  pc.portco_id, '2026-04-30', 11200, 11200,
  68, -19500, 160500, 31.76, 5,
  'Crescimento forte no MRR (+32% MoM). Novo cliente enterprise fechado.', 'Miguel'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT (portco_id, reporting_date) DO NOTHING;

-- Media Deliverables — Enerdy
INSERT INTO ma_media_deliverables (portco_id, deliverable_type, description,
  agreed_value, executing_bu, scheduled_delivery_date, actual_delivery_date,
  status, approved_by_portco, approval_date)
SELECT
  pc.portco_id, 'social_media', 'Gestão de redes sociais — Março 2026',
  8000, 'JACQES', '2026-03-31', '2026-03-31',
  'approved', TRUE, '2026-04-02'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_media_deliverables (portco_id, deliverable_type, description,
  agreed_value, executing_bu, scheduled_delivery_date, actual_delivery_date,
  status, approved_by_portco, approval_date)
SELECT
  pc.portco_id, 'social_media', 'Gestão de redes sociais — Abril 2026',
  8000, 'JACQES', '2026-04-30', '2026-04-30',
  'approved', TRUE, '2026-05-02'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_media_deliverables (portco_id, deliverable_type, description,
  agreed_value, executing_bu, scheduled_delivery_date,
  status, approved_by_portco)
SELECT
  pc.portco_id, 'video_production', 'Vídeo institucional — Identidade de marca Energdy',
  35000, 'CAZA', '2026-06-30',
  'in_progress', FALSE
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- Board Meetings — Enerdy
INSERT INTO ma_board_meetings (portco_id, meeting_date, meeting_type,
  agenda, awq_representative, status, notes)
SELECT
  pc.portco_id, '2026-04-10', 'regular',
  'Review financeiro Mar/2026 · KPIs operacionais · Roadmap produto Q2 · Status captação',
  'Miguel (AWQ)', 'completed',
  'Primeira board meeting pós investimento. Founders apresentaram plano Q2. AWQ confirmou entrega mídia on-track.'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- IC Meeting — aprovação Enerdy
INSERT INTO ma_ic_meetings (meeting_date, meeting_type, attendees, status)
VALUES ('2026-02-28', 'regular', '["Miguel (CEO/CIO)"]', 'completed')
ON CONFLICT DO NOTHING;

-- Synergy — JACQES gerencia mídia Enerdy
INSERT INTO ma_synergy_opportunities (synergy_type, opportunity_name, description,
  source_bu, portco_id, estimated_revenue_impact, status, owner)
SELECT
  'cross_selling',
  'JACQES × Energdy — Gestão de Mídia M4E',
  'JACQES entrega serviços de social media e conteúdo para Energdy como parte do deal M4E. Receita intercompany reconhecida no JACQES, eliminada na consolidação.',
  'JACQES', pc.portco_id, 200000, 'in_progress', 'Miguel'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- Intercompany — JACQES → Energdy (Mar + Apr media delivery)
INSERT INTO ma_intercompany_transactions (transaction_date, transaction_type,
  from_entity_type, from_entity_id, from_entity_name,
  to_entity_type, to_entity_id, to_entity_name,
  amount, debit_account_code, credit_account_code,
  description, source_system, elimination_status)
SELECT
  '2026-03-31', 'media_delivery',
  'bu', 'JACQES', 'JACQES',
  'portco', pc.portco_id::TEXT, 'Grupo Energdy',
  8000, '9.9.01', '9.9.02',
  'Social media management — Março 2026', 'ma', 'eliminated'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_intercompany_transactions (transaction_date, transaction_type,
  from_entity_type, from_entity_id, from_entity_name,
  to_entity_type, to_entity_id, to_entity_name,
  amount, debit_account_code, credit_account_code,
  description, source_system, elimination_status)
SELECT
  '2026-04-30', 'media_delivery',
  'bu', 'JACQES', 'JACQES',
  'portco', pc.portco_id::TEXT, 'Grupo Energdy',
  8000, '9.9.01', '9.9.02',
  'Social media management — Abril 2026', 'ma', 'eliminated'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;


-- =============================================================================
-- AWQ GROUP — PPM Full Schema (PostgreSQL / Neon)
-- Project Portfolio Management: projects, tasks, milestones, allocations,
-- time entries, risks, issues + analytical views.
-- =============================================================================
-- Run ONCE against your Neon database:
--   psql $DATABASE_URL < awq_ppm_full_schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Updated-at helper ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 0. USERS (shared identity table referenced by PPM FKs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  user_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT        NOT NULL,
  email      TEXT        UNIQUE NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'member',
  bu_code    TEXT,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 1. PROJECTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_projects (
  project_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code        TEXT        NOT NULL UNIQUE,                 -- PRJ-2026-001
  project_name        TEXT        NOT NULL,

  -- Relationships
  customer_id         UUID        REFERENCES customers(customer_id),
  bu_code             TEXT        NOT NULL REFERENCES business_units(bu_code),
  opportunity_id      UUID,                                        -- FK → crm_opportunities

  -- Classification
  project_type        TEXT        NOT NULL CHECK (project_type IN ('one_off','retainer','internal','investment')),
  service_category    TEXT        CHECK (service_category IN ('social_media','video_production','consulting','m4e_deal','other')),
  contract_type       TEXT        NOT NULL CHECK (contract_type IN ('fixed_price','time_and_materials','retainer')),

  -- Dates
  start_date          DATE        NOT NULL,
  planned_end_date    DATE        NOT NULL,
  actual_end_date     DATE,
  baseline_end_date   DATE,

  -- Financials
  budget_hours        NUMERIC(10,2),
  actual_hours        NUMERIC(10,2)  NOT NULL DEFAULT 0,
  budget_cost         NUMERIC(15,2)  NOT NULL DEFAULT 0,
  actual_cost         NUMERIC(15,2)  NOT NULL DEFAULT 0,
  budget_revenue      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  actual_revenue      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  margin_target       NUMERIC(5,4),                               -- 0.73 = 73%

  -- People
  project_manager_id  UUID        REFERENCES users(user_id),
  account_manager_id  UUID        REFERENCES users(user_id),

  -- Scope
  description         TEXT,
  objectives          TEXT,
  scope               TEXT,
  success_criteria    TEXT,

  -- Status
  phase               TEXT        NOT NULL DEFAULT 'initiation'
                        CHECK (phase IN ('initiation','planning','execution','monitoring','closure')),
  status              TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','on_hold','completed','cancelled')),
  health_status       TEXT        NOT NULL DEFAULT 'green'
                        CHECK (health_status IN ('green','yellow','red')),
  health_notes        TEXT,

  -- Prioritisation
  priority            TEXT        NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low','medium','high','critical')),
  strategic_alignment NUMERIC(3,2),
  roi_estimate        NUMERIC(15,2),

  -- Billing
  billing_frequency   TEXT        CHECK (billing_frequency IN ('monthly','milestone','upon_completion')),
  next_billing_date   DATE,

  -- Meta
  tags                JSONB,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES users(user_id),
  updated_by          UUID        REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ppm_prj_bu      ON ppm_projects(bu_code);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_status  ON ppm_projects(status);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_health  ON ppm_projects(health_status);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_pm      ON ppm_projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_cust    ON ppm_projects(customer_id);

CREATE OR REPLACE TRIGGER trg_ppm_projects_updated_at
  BEFORE UPDATE ON ppm_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calc actual_hours from time entries
CREATE OR REPLACE FUNCTION fn_ppm_update_project_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ppm_projects
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM ppm_time_entries
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calc actual_cost from AP (linked by project_id on accounts_payable)
CREATE OR REPLACE FUNCTION fn_ppm_update_project_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE ppm_projects
    SET actual_cost = (
      SELECT COALESCE(SUM(net_amount), 0)
      FROM accounts_payable
      WHERE project_id = NEW.project_id AND status = 'PAID'
    )
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calc actual_revenue from AR (linked by project_id on accounts_receivable)
CREATE OR REPLACE FUNCTION fn_ppm_update_project_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE ppm_projects
    SET actual_revenue = (
      SELECT COALESCE(SUM(net_amount), 0)
      FROM accounts_receivable
      WHERE project_id = NEW.project_id AND status = 'RECEIVED'
    )
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. TASKS (WBS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_tasks (
  task_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  parent_task_id      UUID        REFERENCES ppm_tasks(task_id),

  task_name           TEXT        NOT NULL,
  description         TEXT,
  task_type           TEXT        NOT NULL DEFAULT 'task'
                        CHECK (task_type IN ('milestone','task','phase')),

  wbs_code            TEXT,
  sort_order          INTEGER     NOT NULL DEFAULT 0,

  assigned_to         UUID        REFERENCES users(user_id),

  estimated_hours     NUMERIC(10,2),
  actual_hours        NUMERIC(10,2) NOT NULL DEFAULT 0,

  start_date          DATE,
  due_date            DATE,
  completed_date      DATE,
  baseline_due_date   DATE,

  status              TEXT        NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started','in_progress','completed','blocked','cancelled')),
  completion_pct      NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (completion_pct BETWEEN 0 AND 100),

  dependencies        JSONB,
  is_deliverable      BOOLEAN     NOT NULL DEFAULT FALSE,
  deliverable_desc    TEXT,
  blocked_reason      TEXT,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ppm_tasks_project  ON ppm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_tasks_assigned ON ppm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ppm_tasks_status   ON ppm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ppm_tasks_parent   ON ppm_tasks(parent_task_id);

CREATE OR REPLACE TRIGGER trg_ppm_tasks_updated_at
  BEFORE UPDATE ON ppm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-complete task when status set to completed
CREATE OR REPLACE FUNCTION fn_ppm_auto_complete_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completion_pct   := 100;
    NEW.completed_date   := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ppm_task_auto_complete
  BEFORE UPDATE ON ppm_tasks
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_auto_complete_task();

-- Auto-update task actual_hours from time entries
CREATE OR REPLACE FUNCTION fn_ppm_update_task_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.task_id, OLD.task_id) IS NOT NULL THEN
    UPDATE ppm_tasks
    SET actual_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM ppm_time_entries
      WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    )
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. MILESTONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_milestones (
  milestone_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,

  milestone_name      TEXT        NOT NULL,
  description         TEXT,

  planned_date        DATE        NOT NULL,
  actual_date         DATE,
  baseline_date       DATE,

  status              TEXT        NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming','achieved','missed','cancelled')),

  triggers_payment    BOOLEAN     NOT NULL DEFAULT FALSE,
  payment_amount      NUMERIC(15,2),
  payment_percentage  NUMERIC(5,2),

  requires_approval   BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by         UUID        REFERENCES users(user_id),
  approved_at         TIMESTAMPTZ,

  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_milestones_project ON ppm_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_milestones_status  ON ppm_milestones(status);

CREATE OR REPLACE TRIGGER trg_ppm_milestones_updated_at
  BEFORE UPDATE ON ppm_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. RESOURCE ALLOCATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_allocations (
  allocation_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(user_id),

  role                TEXT        NOT NULL,

  allocation_pct      NUMERIC(5,2) NOT NULL CHECK (allocation_pct BETWEEN 0 AND 200),
  hours_per_week      NUMERIC(5,2),

  start_date          DATE        NOT NULL,
  end_date            DATE,

  billable_rate       NUMERIC(10,2),
  cost_rate           NUMERIC(10,2),
  is_billable         BOOLEAN     NOT NULL DEFAULT TRUE,

  status              TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','completed','cancelled')),
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_alloc_project ON ppm_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_alloc_user    ON ppm_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_ppm_alloc_dates   ON ppm_allocations(start_date, end_date);

CREATE OR REPLACE TRIGGER trg_ppm_alloc_updated_at
  BEFORE UPDATE ON ppm_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. TIME ENTRIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_time_entries (
  entry_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id             UUID        NOT NULL REFERENCES users(user_id),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id),
  task_id             UUID        REFERENCES ppm_tasks(task_id),

  entry_date          DATE        NOT NULL,
  hours               NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),

  is_billable         BOOLEAN     NOT NULL DEFAULT TRUE,
  billing_rate        NUMERIC(10,2),
  cost_rate           NUMERIC(10,2),

  description         TEXT,

  status              TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_at        TIMESTAMPTZ,
  approved_by         UUID        REFERENCES users(user_id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,

  invoiced            BOOLEAN     NOT NULL DEFAULT FALSE,
  invoice_id          UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_te_user    ON ppm_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ppm_te_project ON ppm_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_te_task    ON ppm_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_ppm_te_date    ON ppm_time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ppm_te_status  ON ppm_time_entries(status);

CREATE OR REPLACE TRIGGER trg_ppm_te_updated_at
  BEFORE UPDATE ON ppm_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wire up project hours trigger
CREATE OR REPLACE TRIGGER trg_ppm_te_project_hours
  AFTER INSERT OR UPDATE OR DELETE ON ppm_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_update_project_hours();

-- Wire up task hours trigger
CREATE OR REPLACE TRIGGER trg_ppm_te_task_hours
  AFTER INSERT OR UPDATE OR DELETE ON ppm_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_update_task_hours();

-- =============================================================================
-- 6. RISKS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_risks (
  risk_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,

  risk_description    TEXT        NOT NULL,

  impact              TEXT        NOT NULL CHECK (impact IN ('low','medium','high')),
  probability         TEXT        NOT NULL CHECK (probability IN ('low','medium','high')),
  risk_score          INTEGER     CHECK (risk_score BETWEEN 1 AND 9),

  mitigation_plan     TEXT,
  contingency_plan    TEXT,

  owner_id            UUID        REFERENCES users(user_id),

  status              TEXT        NOT NULL DEFAULT 'identified'
                        CHECK (status IN ('identified','mitigating','occurred','closed')),

  identified_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  closed_date         DATE,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_risks_project ON ppm_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_risks_status  ON ppm_risks(status);

CREATE OR REPLACE TRIGGER trg_ppm_risks_updated_at
  BEFORE UPDATE ON ppm_risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate risk_score = impact_num × probability_num
CREATE OR REPLACE FUNCTION fn_ppm_calc_risk_score()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  p INTEGER;
BEGIN
  i := CASE NEW.impact      WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END;
  p := CASE NEW.probability WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END;
  NEW.risk_score := i * p;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ppm_risks_score
  BEFORE INSERT OR UPDATE ON ppm_risks
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_calc_risk_score();

-- =============================================================================
-- 7. ISSUES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_issues (
  issue_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,

  issue_description   TEXT        NOT NULL,

  severity            TEXT        NOT NULL CHECK (severity IN ('low','medium','high','critical')),

  reported_by         UUID        REFERENCES users(user_id),
  assigned_to         UUID        REFERENCES users(user_id),

  status              TEXT        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution          TEXT,

  reported_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  resolved_date       DATE,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_issues_project  ON ppm_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_issues_assigned ON ppm_issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ppm_issues_status   ON ppm_issues(status);

CREATE OR REPLACE TRIGGER trg_ppm_issues_updated_at
  BEFORE UPDATE ON ppm_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. ANALYTICAL VIEWS
-- =============================================================================

-- ── Portfolio Dashboard ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_portfolio AS
SELECT
  p.project_id,
  p.project_code,
  p.project_name,
  p.bu_code,
  bu.bu_name,
  c.customer_name,
  u.full_name                                        AS project_manager,
  p.project_type,
  p.service_category,
  p.contract_type,
  p.status,
  p.health_status,
  p.health_notes,
  p.phase,
  p.priority,
  p.start_date,
  p.planned_end_date,
  p.actual_end_date,
  p.baseline_end_date,

  -- Financials
  p.budget_revenue,
  p.actual_revenue,
  p.budget_cost,
  p.actual_cost,
  p.budget_revenue  - p.budget_cost                 AS budget_margin,
  p.actual_revenue  - p.actual_cost                 AS actual_margin,
  CASE WHEN p.budget_revenue  > 0
    THEN ROUND(((p.budget_revenue  - p.budget_cost)  / p.budget_revenue)  * 100, 1)
    ELSE 0 END                                       AS budget_margin_pct,
  CASE WHEN p.actual_revenue  > 0
    THEN ROUND(((p.actual_revenue  - p.actual_cost)  / p.actual_revenue)  * 100, 1)
    ELSE 0 END                                       AS actual_margin_pct,

  -- Hours
  p.budget_hours,
  p.actual_hours,
  CASE WHEN p.budget_hours > 0
    THEN ROUND((p.actual_hours / p.budget_hours) * 100, 1)
    ELSE 0 END                                       AS hours_burn_pct,

  -- Team
  (SELECT COUNT(DISTINCT user_id)
   FROM ppm_allocations a
   WHERE a.project_id = p.project_id AND a.status = 'active') AS team_size,

  -- Completion
  COALESCE(
    (SELECT COUNT(*) FROM ppm_tasks t WHERE t.project_id = p.project_id AND t.status = 'completed')::FLOAT /
    NULLIF((SELECT COUNT(*) FROM ppm_tasks t WHERE t.project_id = p.project_id), 0) * 100,
    0
  )                                                  AS completion_pct,

  -- Tasks summary
  (SELECT COUNT(*) FROM ppm_tasks WHERE project_id = p.project_id)                                AS total_tasks,
  (SELECT COUNT(*) FROM ppm_tasks WHERE project_id = p.project_id AND status = 'completed')       AS completed_tasks,
  (SELECT COUNT(*) FROM ppm_tasks WHERE project_id = p.project_id AND status = 'blocked')         AS blocked_tasks,

  -- Schedule variance (days late vs planned_end_date)
  CASE WHEN p.status = 'completed'
    THEN p.actual_end_date - p.planned_end_date
    ELSE CURRENT_DATE - p.planned_end_date
  END                                                AS schedule_variance_days,

  p.created_at,
  p.updated_at

FROM ppm_projects p
LEFT JOIN business_units bu ON p.bu_code = bu.bu_code
LEFT JOIN customers c       ON p.customer_id = c.customer_id
LEFT JOIN users u           ON p.project_manager_id = u.user_id;

-- ── Project Profitability (EVM) ───────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_profitability AS
SELECT
  p.project_id,
  p.project_code,
  p.project_name,
  p.bu_code,
  p.status,

  -- Revenue
  p.budget_revenue,
  p.actual_revenue,
  p.budget_revenue - p.actual_revenue                               AS revenue_variance,

  -- Cost
  p.budget_cost,
  p.actual_cost,
  p.actual_cost - p.budget_cost                                     AS cost_variance,

  -- Margin
  p.budget_revenue - p.budget_cost                                  AS budget_margin,
  p.actual_revenue - p.actual_cost                                  AS actual_margin,
  CASE WHEN p.budget_revenue > 0
    THEN ROUND(((p.budget_revenue - p.budget_cost) / p.budget_revenue) * 100, 1) ELSE 0
  END                                                               AS budget_margin_pct,
  CASE WHEN p.actual_revenue > 0
    THEN ROUND(((p.actual_revenue - p.actual_cost) / p.actual_revenue) * 100, 1) ELSE 0
  END                                                               AS actual_margin_pct,

  -- EVM
  p.budget_cost                                                     AS planned_value,
  p.actual_cost                                                     AS actual_cost_evm,
  CASE WHEN p.budget_revenue > 0
    THEN (p.actual_revenue / p.budget_revenue) * p.budget_cost
    ELSE 0 END                                                      AS earned_value,

  -- CPI = EV / AC
  CASE WHEN p.actual_cost > 0
    THEN ROUND(
      ((p.actual_revenue / NULLIF(p.budget_revenue,0)) * p.budget_cost) / p.actual_cost,
      3)
    ELSE NULL END                                                   AS cpi,

  -- SPI = EV / PV
  CASE WHEN p.budget_cost > 0
    THEN ROUND(
      ((p.actual_revenue / NULLIF(p.budget_revenue,0)) * p.budget_cost) / p.budget_cost,
      3)
    ELSE NULL END                                                   AS spi

FROM ppm_projects p;

-- ── Resource Utilization ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_resource_utilization AS
SELECT
  u.user_id,
  u.full_name                                                     AS user_name,
  u.email,
  COALESCE(SUM(a.allocation_pct), 0)                             AS total_allocation_pct,
  CASE
    WHEN COALESCE(SUM(a.allocation_pct), 0) > 100  THEN 'overallocated'
    WHEN COALESCE(SUM(a.allocation_pct), 0) >= 80  THEN 'fully_allocated'
    WHEN COALESCE(SUM(a.allocation_pct), 0) >= 50  THEN 'partially_allocated'
    ELSE 'available'
  END                                                             AS utilization_status,
  COUNT(DISTINCT a.project_id)                                   AS active_projects,
  ARRAY_AGG(DISTINCT p.project_name) FILTER (WHERE p.project_name IS NOT NULL) AS project_names
FROM users u
LEFT JOIN ppm_allocations a ON u.user_id = a.user_id
  AND a.status = 'active'
  AND a.start_date <= CURRENT_DATE
  AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
LEFT JOIN ppm_projects p ON a.project_id = p.project_id
GROUP BY u.user_id, u.full_name, u.email;

-- ── Timesheet Summary ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_timesheet_summary AS
SELECT
  p.project_id,
  p.project_code,
  p.project_name,
  p.bu_code,
  SUM(e.hours)                                                   AS total_hours,
  SUM(CASE WHEN e.is_billable THEN e.hours ELSE 0 END)          AS billable_hours,
  SUM(CASE WHEN NOT e.is_billable THEN e.hours ELSE 0 END)      AS non_billable_hours,
  SUM(CASE WHEN e.is_billable THEN e.hours * COALESCE(e.billing_rate,0) ELSE 0 END) AS billable_amount,
  SUM(e.hours * COALESCE(e.cost_rate, 0))                       AS cost_amount,
  COUNT(DISTINCT e.user_id)                                     AS contributors,
  COUNT(e.entry_id)                                             AS entries_count,
  MAX(e.entry_date)                                             AS last_entry_date
FROM ppm_projects p
LEFT JOIN ppm_time_entries e ON p.project_id = e.project_id
GROUP BY p.project_id, p.project_code, p.project_name, p.bu_code;

-- =============================================================================
-- 9. SEED DATA
-- =============================================================================

-- Clear PPM seed tables for idempotency
DELETE FROM ppm_timesheets;
DELETE FROM ppm_risks;
DELETE FROM ppm_tasks;
DELETE FROM ppm_projects;

-- Depends on existing business_units, customers, and users tables.
INSERT INTO ppm_projects (
  project_code, project_name, customer_id, bu_code,
  project_type, service_category, contract_type,
  start_date, planned_end_date, baseline_end_date,
  budget_hours, budget_cost, budget_revenue, margin_target,
  description, phase, status, health_status, priority
) VALUES
  ('PRJ-2026-001', 'XP Investimentos — Campanha Q1 2026',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%XP%' LIMIT 1),
   'CAZA', 'one_off', 'video_production', 'fixed_price',
   '2026-01-15', '2026-03-31', '2026-03-31',
   240, 85000, 320000, 0.73,
   'Produção campanha institucional Q1: 5 vídeos + fotografia.',
   'execution', 'active', 'green', 'high'),

  ('PRJ-2026-002', 'Nubank — Vídeo Institucional',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%Nubank%' LIMIT 1),
   'CAZA', 'one_off', 'video_production', 'fixed_price',
   '2026-02-01', '2026-03-15', '2026-03-15',
   80, 28000, 85000, 0.67,
   NULL,
   'planning', 'active', 'yellow', 'medium'),

  ('PRJ-2026-003', 'Carol Bertolini — Social Media Mensal',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%Carol%' LIMIT 1),
   'JACQES', 'retainer', 'social_media', 'retainer',
   '2026-01-01', '2026-12-31', '2026-12-31',
   20, 900, 3000, 0.70,
   'Retainer mensal de gestão de social media.',
   'execution', 'active', 'green', 'low'),

  ('PRJ-2026-004', 'Reabilicor — Consultoria Estratégica',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%Reabilicor%' LIMIT 1),
   'ADVISOR', 'one_off', 'consulting', 'fixed_price',
   '2026-03-01', '2026-06-30', '2026-06-30',
   120, 22000, 95000, 0.77,
   'Consultoria estratégica: diagnóstico, plano de ação e implementação.',
   'execution', 'active', 'green', 'high')

ON CONFLICT (project_code) DO NOTHING;
