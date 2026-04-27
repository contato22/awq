-- ============================================================
-- AWQ EPM Platform — Supabase PostgreSQL Schema
-- 32 tables + 11 views = 43 objects
-- Compatible with Next.js financial-db.ts data model
-- Deploy: Supabase SQL Editor > Run this entire file
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CORE FINANCIAL TABLES  (mirrors financial-db.ts types exactly)
-- ============================================================

-- 1. financial_documents — ingested bank statements
CREATE TABLE IF NOT EXISTS financial_documents (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
  uploaded_at         TEXT NOT NULL DEFAULT NOW()::text,
  uploaded_by         TEXT NOT NULL DEFAULT 'system',
  status              TEXT NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received','extracting','classifying','reconciling','done','error')),
  error_message       TEXT,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  parser_confidence   TEXT CHECK (parser_confidence IN ('high','medium','low')),
  extraction_notes    TEXT,
  blob_url            TEXT
);

-- 2. bank_transactions — individual transactions from bank statements
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id                 TEXT NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
  bank                        TEXT NOT NULL,
  account_name                TEXT NOT NULL,
  entity                      TEXT NOT NULL,
  transaction_date            TEXT NOT NULL,
  description_original        TEXT NOT NULL,
  amount                      NUMERIC NOT NULL,
  direction                   TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  running_balance             NUMERIC,
  counterparty_name           TEXT,
  managerial_category         TEXT NOT NULL,
  classification_confidence   TEXT NOT NULL DEFAULT 'ambiguous'
                              CHECK (classification_confidence IN ('confirmed','probable','ambiguous','unclassifiable')),
  classification_note         TEXT,
  is_intercompany             BOOLEAN NOT NULL DEFAULT false,
  intercompany_match_id       TEXT,
  excluded_from_consolidated  BOOLEAN NOT NULL DEFAULT false,
  reconciliation_status       TEXT NOT NULL DEFAULT 'pendente'
                              CHECK (reconciliation_status IN ('pendente','em_revisao','conciliado','descartado')),
  extracted_at                TEXT NOT NULL DEFAULT NOW()::text,
  classified_at               TEXT
);

-- ============================================================
-- EPM DIMENSION TABLES
-- ============================================================

-- 3. business_units — the 4 AWQ Group operating units
CREATE TABLE IF NOT EXISTS business_units (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,
  entity_layer  TEXT NOT NULL,
  segment       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pre_revenue')),
  founded_year  INTEGER,
  description   TEXT,
  color_hex     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. chart_of_accounts — managerial category taxonomy
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  name_en       TEXT,
  account_type  TEXT NOT NULL CHECK (account_type IN ('revenue','expense','asset','liability','equity')),
  direction     TEXT NOT NULL CHECK (direction IN ('credit','debit','both')),
  group_code    TEXT,
  bu_scope      TEXT DEFAULT 'all',
  is_operational BOOLEAN NOT NULL DEFAULT true,
  is_intercompany BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- 5. account_groups — P&L groupings for DRE structure
CREATE TABLE IF NOT EXISTS account_groups (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  parent_code   TEXT REFERENCES account_groups(code),
  report_section TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- 6. cost_centers — operational cost centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  parent_id     TEXT REFERENCES cost_centers(id),
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. counterparties — clients, vendors, partners
CREATE TABLE IF NOT EXISTS counterparties (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  name_aliases  TEXT[],
  type          TEXT NOT NULL CHECK (type IN ('client','vendor','partner','employee','bank','government','intercompany','other')),
  bu_id         TEXT REFERENCES business_units(id),
  cnpj_cpf      TEXT,
  email         TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. team_members — org roster
CREATE TABLE IF NOT EXISTS team_members (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  role          TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  department    TEXT,
  salary_band   TEXT,
  start_date    TEXT,
  end_date      TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. risk_factors — risk register entries
CREATE TABLE IF NOT EXISTS risk_factors (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title         TEXT NOT NULL,
  description   TEXT,
  bu_id         TEXT REFERENCES business_units(id),
  category      TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  probability   TEXT NOT NULL DEFAULT 'medium' CHECK (probability IN ('low','medium','high')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigated','closed','monitoring')),
  owner         TEXT,
  due_date      TEXT,
  metric        TEXT,
  threshold     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. kpi_definitions — KPI registry
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  bu_id         TEXT REFERENCES business_units(id),
  unit          TEXT NOT NULL DEFAULT 'number' CHECK (unit IN ('currency','percent','number','ratio','days')),
  direction     TEXT NOT NULL DEFAULT 'higher_better' CHECK (direction IN ('higher_better','lower_better','target')),
  frequency     TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual')),
  target_value  NUMERIC,
  warning_pct   NUMERIC DEFAULT 0.1,
  critical_pct  NUMERIC DEFAULT 0.2,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EPM TRANSACTIONAL TABLES
-- ============================================================

-- 11. journal_entries — double-entry bookkeeping
CREATE TABLE IF NOT EXISTS journal_entries (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entry_date    TEXT NOT NULL,
  description   TEXT NOT NULL,
  reference     TEXT,
  bu_id         TEXT REFERENCES business_units(id),
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import','auto','bank_reconciliation')),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  period        TEXT NOT NULL,
  created_by    TEXT,
  posted_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. journal_entry_lines — line items for journal entries
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code    TEXT NOT NULL REFERENCES chart_of_accounts(code),
  cost_center_id  TEXT REFERENCES cost_centers(id),
  description     TEXT,
  debit_amount    NUMERIC NOT NULL DEFAULT 0,
  credit_amount   NUMERIC NOT NULL DEFAULT 0,
  counterparty_id TEXT REFERENCES counterparties(id),
  line_order      INTEGER NOT NULL DEFAULT 0
);

-- 13. budget_periods — budget cycles
CREATE TABLE IF NOT EXISTS budget_periods (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year          INTEGER NOT NULL,
  period_type   TEXT NOT NULL DEFAULT 'annual' CHECK (period_type IN ('annual','quarterly','monthly')),
  label         TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','locked','revised')),
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, period_type, bu_id)
);

-- 14. budget_entries — budget line items per account per month
CREATE TABLE IF NOT EXISTS budget_entries (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  budget_period_id TEXT NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  account_code    TEXT NOT NULL REFERENCES chart_of_accounts(code),
  cost_center_id  TEXT REFERENCES cost_centers(id),
  month           TEXT NOT NULL,
  amount          NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_period_id, account_code, cost_center_id, month)
);

-- 15. forecast_scenarios — forecast models
CREATE TABLE IF NOT EXISTS forecast_scenarios (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'base' CHECK (type IN ('base','optimistic','pessimistic','custom')),
  bu_id         TEXT REFERENCES business_units(id),
  base_year     INTEGER NOT NULL,
  horizon_months INTEGER NOT NULL DEFAULT 12,
  assumptions   JSONB,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','draft')),
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. forecast_entries — forecast data points
CREATE TABLE IF NOT EXISTS forecast_entries (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scenario_id     TEXT NOT NULL REFERENCES forecast_scenarios(id) ON DELETE CASCADE,
  account_code    TEXT NOT NULL REFERENCES chart_of_accounts(code),
  month           TEXT NOT NULL,
  amount          NUMERIC NOT NULL DEFAULT 0,
  growth_rate     NUMERIC,
  confidence      TEXT DEFAULT 'medium' CHECK (confidence IN ('low','medium','high')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scenario_id, account_code, month)
);

-- 17. kpi_values — historical KPI measurements
CREATE TABLE IF NOT EXISTS kpi_values (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kpi_id        TEXT NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  period        TEXT NOT NULL,
  value         NUMERIC NOT NULL,
  target        NUMERIC,
  previous      NUMERIC,
  notes         TEXT,
  source        TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kpi_id, period)
);

-- 18. cashflow_projections — FCO projections
CREATE TABLE IF NOT EXISTS cashflow_projections (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bu_id         TEXT REFERENCES business_units(id),
  period        TEXT NOT NULL,
  inflows       NUMERIC NOT NULL DEFAULT 0,
  outflows      NUMERIC NOT NULL DEFAULT 0,
  net_flow      NUMERIC GENERATED ALWAYS AS (inflows - outflows) STORED,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC GENERATED ALWAYS AS (opening_balance + inflows - outflows) STORED,
  scenario_type TEXT NOT NULL DEFAULT 'base',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bu_id, period, scenario_type)
);

-- 19. investment_portfolios — investment portfolios
CREATE TABLE IF NOT EXISTS investment_portfolios (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  institution   TEXT NOT NULL,
  account_number TEXT,
  portfolio_type TEXT NOT NULL CHECK (portfolio_type IN ('cdb','lci','lca','fii','fundo','acoes','crypto','other')),
  currency      TEXT NOT NULL DEFAULT 'BRL',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. investment_positions — current positions
CREATE TABLE IF NOT EXISTS investment_positions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id    TEXT NOT NULL REFERENCES investment_portfolios(id) ON DELETE CASCADE,
  asset_name      TEXT NOT NULL,
  asset_code      TEXT,
  quantity        NUMERIC NOT NULL DEFAULT 1,
  avg_cost        NUMERIC NOT NULL DEFAULT 0,
  current_value   NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl  NUMERIC GENERATED ALWAYS AS (current_value - (quantity * avg_cost)) STORED,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. investment_transactions — buy/sell/dividend events
CREATE TABLE IF NOT EXISTS investment_transactions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id    TEXT NOT NULL REFERENCES investment_portfolios(id) ON DELETE CASCADE,
  asset_name      TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('buy','sell','dividend','interest','fee','transfer_in','transfer_out')),
  event_date      TEXT NOT NULL,
  quantity        NUMERIC,
  unit_price      NUMERIC,
  gross_amount    NUMERIC NOT NULL,
  net_amount      NUMERIC NOT NULL,
  tax_withheld    NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. payables — AP: contas a pagar
CREATE TABLE IF NOT EXISTS payables (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bu_id           TEXT REFERENCES business_units(id),
  counterparty_id TEXT REFERENCES counterparties(id),
  description     TEXT NOT NULL,
  account_code    TEXT REFERENCES chart_of_accounts(code),
  amount          NUMERIC NOT NULL,
  amount_paid     NUMERIC NOT NULL DEFAULT 0,
  due_date        TEXT NOT NULL,
  issue_date      TEXT NOT NULL DEFAULT NOW()::text::date::text,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','partial','paid','overdue','cancelled')),
  invoice_number  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. receivables — AR: contas a receber
CREATE TABLE IF NOT EXISTS receivables (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bu_id           TEXT REFERENCES business_units(id),
  counterparty_id TEXT REFERENCES counterparties(id),
  description     TEXT NOT NULL,
  account_code    TEXT REFERENCES chart_of_accounts(code),
  amount          NUMERIC NOT NULL,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  due_date        TEXT NOT NULL,
  issue_date      TEXT NOT NULL DEFAULT NOW()::text::date::text,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','partial','received','overdue','cancelled','written_off')),
  invoice_number  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. tax_obligations — tax payment schedule
CREATE TABLE IF NOT EXISTS tax_obligations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bu_id         TEXT REFERENCES business_units(id),
  tax_type      TEXT NOT NULL,
  description   TEXT,
  competence    TEXT NOT NULL,
  due_date      TEXT NOT NULL,
  estimated_amount NUMERIC,
  paid_amount   NUMERIC,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','exempt','appealed')),
  receipt_number TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 25. legal_contracts — contract registry
CREATE TABLE IF NOT EXISTS legal_contracts (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL,
  bu_id           TEXT REFERENCES business_units(id),
  counterparty_id TEXT REFERENCES counterparties(id),
  value           NUMERIC,
  start_date      TEXT NOT NULL,
  end_date        TEXT,
  renewal_date    TEXT,
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('draft','active','expired','terminated','suspended')),
  storage_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 26. compliance_items — compliance checklist
CREATE TABLE IF NOT EXISTS compliance_items (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  frequency     TEXT NOT NULL,
  next_due      TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','done','overdue','na')),
  owner         TEXT,
  evidence_url  TEXT,
  notes         TEXT,
  last_completed TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. reconciliation_sessions — bank reconciliation audit trail
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id   TEXT REFERENCES financial_documents(id),
  period        TEXT NOT NULL,
  entity        TEXT NOT NULL,
  bank          TEXT NOT NULL,
  opening_balance NUMERIC,
  closing_balance NUMERIC,
  reconciled_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  discrepancy   NUMERIC NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed','approved')),
  closed_by     TEXT,
  closed_at     TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 28. deal_pipeline — M&A / investment deal tracking
CREATE TABLE IF NOT EXISTS deal_pipeline (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  company       TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  deal_type     TEXT NOT NULL CHECK (deal_type IN ('acquisition','investment','partnership','advisory','other')),
  stage         TEXT NOT NULL DEFAULT 'prospecting',
  value_estimate NUMERIC,
  equity_pct    NUMERIC,
  currency      TEXT NOT NULL DEFAULT 'BRL',
  lead_owner    TEXT,
  source        TEXT,
  next_action   TEXT,
  next_action_date TEXT,
  probability   NUMERIC DEFAULT 0,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','closed_won','closed_lost')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 29. monthly_snapshots — pre-aggregated monthly data
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  period        TEXT NOT NULL,
  bu_id         TEXT REFERENCES business_units(id),
  entity        TEXT,
  revenue       NUMERIC NOT NULL DEFAULT 0,
  expenses      NUMERIC NOT NULL DEFAULT 0,
  net_cash      NUMERIC GENERATED ALWAYS AS (revenue - expenses) STORED,
  cash_balance  NUMERIC NOT NULL DEFAULT 0,
  headcount     INTEGER DEFAULT 0,
  mrr           NUMERIC DEFAULT 0,
  arr           NUMERIC GENERATED ALWAYS AS (mrr * 12) STORED,
  source        TEXT NOT NULL DEFAULT 'pipeline',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, bu_id, entity)
);

-- 30. audit_log — system audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL,
  table_name    TEXT,
  record_id     TEXT,
  user_email    TEXT,
  ip_address    TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 31. notifications — alert/notification queue
CREATE TABLE IF NOT EXISTS notifications (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT,
  severity      TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  bu_id         TEXT REFERENCES business_units(id),
  target_user   TEXT,
  read          BOOLEAN NOT NULL DEFAULT false,
  action_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);

-- 32. platform_settings — platform configuration
CREATE TABLE IF NOT EXISTS platform_settings (
  key           TEXT PRIMARY KEY,
  value         TEXT,
  value_json    JSONB,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'general',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bt_document_id       ON bank_transactions(document_id);
CREATE INDEX IF NOT EXISTS idx_bt_entity            ON bank_transactions(entity);
CREATE INDEX IF NOT EXISTS idx_bt_date              ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bt_category          ON bank_transactions(managerial_category);
CREATE INDEX IF NOT EXISTS idx_bt_direction         ON bank_transactions(direction);
CREATE INDEX IF NOT EXISTS idx_bt_reconciliation    ON bank_transactions(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_fd_status            ON financial_documents(status);
CREATE INDEX IF NOT EXISTS idx_fd_entity            ON financial_documents(entity);
CREATE INDEX IF NOT EXISTS idx_fd_period            ON financial_documents(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_kpi_values_period    ON kpi_values(kpi_id, period);
CREATE INDEX IF NOT EXISTS idx_payables_due         ON payables(due_date, status);
CREATE INDEX IF NOT EXISTS idx_receivables_due      ON receivables(due_date, status);
CREATE INDEX IF NOT EXISTS idx_audit_created        ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_period       ON monthly_snapshots(period, bu_id);

-- ============================================================
-- VIEWS  (11 views — completing the 43-object schema)
-- ============================================================

-- View 33: v_cashflow_consolidated — operational cashflow (mirrors buildFinancialQuery)
CREATE OR REPLACE VIEW v_cashflow_consolidated AS
SELECT
  bt.entity,
  fd.bank,
  fd.account_name,
  SUM(CASE
    WHEN bt.direction = 'credit'
     AND bt.excluded_from_consolidated = false
     AND bt.managerial_category IN (
       'receita_recorrente','receita_projeto','receita_consultoria','receita_producao',
       'receita_social_media','receita_revenue_share','receita_fee_venture','receita_eventual',
       'rendimento_financeiro','ajuste_bancario_credito'
     )
    THEN ABS(bt.amount) ELSE 0 END)                         AS operational_revenue,
  SUM(CASE
    WHEN bt.direction = 'debit'
     AND bt.excluded_from_consolidated = false
     AND bt.managerial_category NOT IN ('aplicacao_financeira','resgate_financeiro')
    THEN ABS(bt.amount) ELSE 0 END)                         AS operational_expenses,
  SUM(CASE WHEN bt.is_intercompany THEN ABS(bt.amount) ELSE 0 END) / 2 AS intercompany_eliminated,
  COALESCE(fd.closing_balance, 0)                           AS cash_balance,
  COUNT(bt.id)                                              AS transaction_count,
  MIN(bt.transaction_date)                                  AS period_start,
  MAX(bt.transaction_date)                                  AS period_end
FROM bank_transactions bt
JOIN financial_documents fd ON fd.id = bt.document_id
WHERE fd.status = 'done'
GROUP BY bt.entity, fd.bank, fd.account_name, fd.closing_balance;

-- View 34: v_entity_summary — per-entity aggregation
CREATE OR REPLACE VIEW v_entity_summary AS
SELECT
  entity,
  SUM(operational_revenue)         AS total_revenue,
  SUM(operational_expenses)        AS total_expenses,
  SUM(operational_revenue - operational_expenses) AS net_cash,
  SUM(cash_balance)                AS cash_balance,
  SUM(transaction_count)           AS transaction_count,
  MIN(period_start)                AS period_start,
  MAX(period_end)                  AS period_end
FROM v_cashflow_consolidated
GROUP BY entity;

-- View 35: v_monthly_pl — monthly P&L bridge by entity
CREATE OR REPLACE VIEW v_monthly_pl AS
SELECT
  SUBSTR(bt.transaction_date, 1, 7)                          AS month,
  bt.entity,
  SUM(CASE
    WHEN bt.direction = 'credit'
     AND bt.excluded_from_consolidated = false
     AND bt.managerial_category IN (
       'receita_recorrente','receita_projeto','receita_consultoria','receita_producao',
       'receita_social_media','receita_revenue_share','receita_fee_venture','receita_eventual',
       'rendimento_financeiro','ajuste_bancario_credito'
     )
    THEN ABS(bt.amount) ELSE 0 END)                          AS revenue,
  SUM(CASE
    WHEN bt.direction = 'debit'
     AND bt.excluded_from_consolidated = false
     AND bt.managerial_category NOT IN ('aplicacao_financeira','resgate_financeiro','transferencia_interna_enviada')
    THEN ABS(bt.amount) ELSE 0 END)                          AS expenses,
  SUM(CASE
    WHEN bt.direction = 'credit'
     AND bt.excluded_from_consolidated = false
     AND bt.managerial_category IN (
       'receita_recorrente','receita_projeto','receita_consultoria','receita_producao',
       'receita_social_media','receita_revenue_share','receita_fee_venture','receita_eventual',
       'rendimento_financeiro','ajuste_bancario_credito'
     )
    THEN ABS(bt.amount)
    WHEN bt.direction = 'debit'
     AND bt.excluded_from_consolidated = false
     AND bt.managerial_category NOT IN ('aplicacao_financeira','resgate_financeiro','transferencia_interna_enviada')
    THEN -ABS(bt.amount) ELSE 0 END)                         AS net_cash
FROM bank_transactions bt
JOIN financial_documents fd ON fd.id = bt.document_id
WHERE fd.status = 'done' AND bt.transaction_date IS NOT NULL
GROUP BY SUBSTR(bt.transaction_date, 1, 7), bt.entity
ORDER BY 1, 2;

-- View 36: v_account_balances — cash position per account
CREATE OR REPLACE VIEW v_account_balances AS
SELECT
  fd.id              AS document_id,
  fd.filename,
  fd.bank,
  fd.account_name,
  fd.entity,
  fd.period_start,
  fd.period_end,
  COALESCE(fd.opening_balance, 0)           AS opening_balance,
  COALESCE(fd.closing_balance, 0)           AS closing_balance,
  SUM(CASE WHEN bt.direction = 'credit' THEN ABS(bt.amount) ELSE 0 END) AS total_credits,
  SUM(CASE WHEN bt.direction = 'debit'  THEN ABS(bt.amount) ELSE 0 END) AS total_debits,
  COUNT(bt.id)                               AS transaction_count
FROM financial_documents fd
LEFT JOIN bank_transactions bt ON bt.document_id = fd.id
WHERE fd.status = 'done'
GROUP BY fd.id, fd.filename, fd.bank, fd.account_name, fd.entity,
         fd.period_start, fd.period_end, fd.opening_balance, fd.closing_balance;

-- View 37: v_budget_vs_actual — budget variance analysis
CREATE OR REPLACE VIEW v_budget_vs_actual AS
SELECT
  be.month,
  be.account_code,
  ca.name                           AS account_name,
  bp.bu_id,
  bp.year,
  be.amount                         AS budget_amount,
  COALESCE(actuals.actual_amount, 0) AS actual_amount,
  be.amount - COALESCE(actuals.actual_amount, 0) AS variance,
  CASE
    WHEN be.amount = 0 THEN NULL
    ELSE ROUND(((COALESCE(actuals.actual_amount, 0) - be.amount) / ABS(be.amount)) * 100, 2)
  END                               AS variance_pct
FROM budget_entries be
JOIN budget_periods bp           ON bp.id = be.budget_period_id
JOIN chart_of_accounts ca        ON ca.code = be.account_code
LEFT JOIN (
  SELECT
    SUBSTR(bt.transaction_date, 1, 7) AS month,
    bt.managerial_category            AS account_code,
    SUM(ABS(bt.amount))               AS actual_amount
  FROM bank_transactions bt
  JOIN financial_documents fd ON fd.id = bt.document_id
  WHERE fd.status = 'done'
  GROUP BY SUBSTR(bt.transaction_date, 1, 7), bt.managerial_category
) actuals ON actuals.month = be.month AND actuals.account_code = be.account_code;

-- View 38: v_pipeline_by_stage — deal pipeline summary
CREATE OR REPLACE VIEW v_pipeline_by_stage AS
SELECT
  stage,
  deal_type,
  bu_id,
  COUNT(*)                          AS deal_count,
  SUM(COALESCE(value_estimate, 0))  AS total_value,
  AVG(probability)                  AS avg_probability,
  SUM(COALESCE(value_estimate, 0) * COALESCE(probability, 0) / 100) AS weighted_value
FROM deal_pipeline
WHERE status = 'active'
GROUP BY stage, deal_type, bu_id;

-- View 39: v_receivables_aging — AR aging buckets
CREATE OR REPLACE VIEW v_receivables_aging AS
SELECT
  r.id,
  r.bu_id,
  r.description,
  c.name                            AS counterparty,
  r.amount,
  r.amount_received,
  r.amount - r.amount_received      AS balance,
  r.due_date,
  r.status,
  CURRENT_DATE - r.due_date::date   AS days_overdue,
  CASE
    WHEN CURRENT_DATE <= r.due_date::date     THEN 'current'
    WHEN CURRENT_DATE - r.due_date::date <= 30 THEN '1-30 days'
    WHEN CURRENT_DATE - r.due_date::date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - r.due_date::date <= 90 THEN '61-90 days'
    ELSE '90+ days'
  END                               AS aging_bucket
FROM receivables r
LEFT JOIN counterparties c ON c.id = r.counterparty_id
WHERE r.status NOT IN ('cancelled','written_off');

-- View 40: v_payables_aging — AP aging buckets
CREATE OR REPLACE VIEW v_payables_aging AS
SELECT
  p.id,
  p.bu_id,
  p.description,
  c.name                            AS counterparty,
  p.amount,
  p.amount_paid,
  p.amount - p.amount_paid          AS balance,
  p.due_date,
  p.status,
  CURRENT_DATE - p.due_date::date   AS days_overdue,
  CASE
    WHEN CURRENT_DATE <= p.due_date::date     THEN 'current'
    WHEN CURRENT_DATE - p.due_date::date <= 30 THEN '1-30 days'
    WHEN CURRENT_DATE - p.due_date::date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - p.due_date::date <= 90 THEN '61-90 days'
    ELSE '90+ days'
  END                               AS aging_bucket
FROM payables p
LEFT JOIN counterparties c ON c.id = p.counterparty_id
WHERE p.status NOT IN ('cancelled');

-- View 41: v_kpi_dashboard — KPI overview with targets
CREATE OR REPLACE VIEW v_kpi_dashboard AS
SELECT
  kd.id,
  kd.code,
  kd.name,
  kd.bu_id,
  kd.unit,
  kd.direction,
  kv.period,
  kv.value,
  COALESCE(kv.target, kd.target_value) AS target,
  kv.previous,
  CASE
    WHEN kv.previous IS NULL OR kv.previous = 0 THEN NULL
    ELSE ROUND(((kv.value - kv.previous) / ABS(kv.previous)) * 100, 2)
  END                               AS pct_change,
  CASE
    WHEN COALESCE(kv.target, kd.target_value) IS NULL THEN 'no_target'
    WHEN kd.direction = 'higher_better' AND kv.value >= COALESCE(kv.target, kd.target_value)
      THEN 'on_track'
    WHEN kd.direction = 'lower_better' AND kv.value <= COALESCE(kv.target, kd.target_value)
      THEN 'on_track'
    WHEN kd.direction = 'higher_better'
      AND kv.value >= COALESCE(kv.target, kd.target_value) * (1 - COALESCE(kd.warning_pct, 0.1))
      THEN 'warning'
    ELSE 'critical'
  END                               AS status
FROM kpi_definitions kd
LEFT JOIN kpi_values kv ON kv.kpi_id = kd.id
WHERE kd.active = true;

-- View 42: v_cashflow_by_category — cashflow broken down by managerial category
CREATE OR REPLACE VIEW v_cashflow_by_category AS
SELECT
  bt.managerial_category,
  bt.entity,
  SUBSTR(bt.transaction_date, 1, 7) AS month,
  bt.direction,
  COUNT(*)                           AS transaction_count,
  SUM(ABS(bt.amount))                AS total_amount,
  AVG(ABS(bt.amount))                AS avg_amount
FROM bank_transactions bt
JOIN financial_documents fd ON fd.id = bt.document_id
WHERE fd.status = 'done' AND bt.excluded_from_consolidated = false
GROUP BY bt.managerial_category, bt.entity, SUBSTR(bt.transaction_date, 1, 7), bt.direction
ORDER BY month, direction, total_amount DESC;

-- View 43: v_open_risks — active risk register
CREATE OR REPLACE VIEW v_open_risks AS
SELECT
  rf.id,
  rf.title,
  rf.description,
  rf.category,
  rf.severity,
  rf.probability,
  rf.status,
  rf.owner,
  rf.due_date,
  rf.metric,
  rf.threshold,
  bu.name                           AS bu_name,
  CASE
    WHEN rf.severity = 'critical'                           THEN 4
    WHEN rf.severity = 'high'                               THEN 3
    WHEN rf.severity = 'medium'                             THEN 2
    ELSE 1
  END                               AS severity_score
FROM risk_factors rf
LEFT JOIN business_units bu ON bu.id = rf.bu_id
WHERE rf.status IN ('open','monitoring')
ORDER BY severity_score DESC, rf.due_date ASC;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE financial_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_units          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_scenarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_projections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_portfolios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables                ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_obligations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_pipeline           ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;

-- Permissive policies for private single-tenant platform (tighten with auth in production)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'financial_documents','bank_transactions','business_units','chart_of_accounts',
    'account_groups','cost_centers','counterparties','team_members','risk_factors',
    'kpi_definitions','journal_entries','journal_entry_lines','budget_periods',
    'budget_entries','forecast_scenarios','forecast_entries','kpi_values',
    'cashflow_projections','investment_portfolios','investment_positions',
    'investment_transactions','payables','receivables','tax_obligations',
    'legal_contracts','compliance_items','reconciliation_sessions','deal_pipeline',
    'monthly_snapshots','notifications','platform_settings'
  ] LOOP
    EXECUTE format('CREATE POLICY IF NOT EXISTS "allow_all_anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY IF NOT EXISTS "allow_all_authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ============================================================
-- SEED DATA — AWQ Group structure
-- ============================================================

INSERT INTO business_units (id, name, short_name, entity_layer, segment, status, founded_year, description, color_hex)
VALUES
  ('awq_holding',  'AWQ Group (Holding)',  'AWQ',     'AWQ_Holding', 'Holding / Investimentos', 'active',      2020, 'Holding consolidada do grupo AWQ', '#7C3AED'),
  ('jacqes',       'JACQES',               'JACQES',  'JACQES',      'Agência Digital',         'active',      2019, 'Agência full-service — social media, tráfego, branding', '#F59E0B'),
  ('caza_vision',  'Caza Vision',          'Caza',    'Caza_Vision', 'Produtora Audiovisual',   'active',      2021, 'Produtora de conteúdo — foto, vídeo, motion', '#10B981'),
  ('awq_venture',  'AWQ Venture',          'Venture', 'AWQ_Holding', 'Investimentos & Advisory', 'pre_revenue', 2022, 'Braço de investimento e advisory ESG/green-tech', '#6366F1'),
  ('advisor',      'Advisor',              'Advisor', 'AWQ_Holding', 'Consultoria',             'active',      2023, 'Consultoria estratégica e financeira', '#EC4899')
ON CONFLICT (id) DO NOTHING;

-- Chart of accounts (matches ManagerialCategory taxonomy from financial-db.ts)
INSERT INTO chart_of_accounts (code, name, account_type, direction, sort_order)
VALUES
  ('receita_recorrente',             'Receita Recorrente',                 'revenue', 'credit', 10),
  ('receita_projeto',                'Receita de Projeto',                 'revenue', 'credit', 11),
  ('receita_consultoria',            'Receita de Consultoria',             'revenue', 'credit', 12),
  ('receita_producao',               'Receita de Produção',                'revenue', 'credit', 13),
  ('receita_social_media',           'Receita Social Media',               'revenue', 'credit', 14),
  ('receita_revenue_share',          'Revenue Share',                      'revenue', 'credit', 15),
  ('receita_fee_venture',            'Fee Recorrente Venture',             'revenue', 'credit', 16),
  ('receita_eventual',               'Receita Eventual',                   'revenue', 'credit', 17),
  ('rendimento_financeiro',          'Rendimento Financeiro',              'revenue', 'credit', 18),
  ('aporte_socio',                   'Aporte do Sócio',                    'revenue', 'credit', 19),
  ('transferencia_interna_recebida', 'Transf. Intercompany Recebida',      'revenue', 'credit', 20),
  ('ajuste_bancario_credito',        'Ajuste / Crédito Bancário',          'revenue', 'credit', 21),
  ('recebimento_ambiguo',            'Recebimento Ambíguo',                'revenue', 'credit', 22),
  ('fornecedor_operacional',         'Fornecedor Operacional',             'expense', 'debit',  30),
  ('freelancer_terceiro',            'Freelancer / Terceiro',              'expense', 'debit',  31),
  ('folha_remuneracao',              'Folha / Remuneração',                'expense', 'debit',  32),
  ('prolabore_retirada',             'Pró-labore / Retirada',              'expense', 'debit',  33),
  ('imposto_tributo',                'Imposto / Tributo',                  'expense', 'debit',  34),
  ('juros_multa_iof',                'Juros / Multa / IOF',                'expense', 'debit',  35),
  ('tarifa_bancaria',                'Tarifa Bancária',                    'expense', 'debit',  36),
  ('software_assinatura',            'Software / Assinatura',              'expense', 'debit',  37),
  ('marketing_midia',                'Marketing / Mídia Paga',             'expense', 'debit',  38),
  ('deslocamento_combustivel',       'Deslocamento / Combustível',         'expense', 'debit',  39),
  ('alimentacao_representacao',      'Alimentação / Representação',        'expense', 'debit',  40),
  ('viagem_hospedagem',              'Viagem / Hospedagem',                'expense', 'debit',  41),
  ('aluguel_locacao',                'Aluguel / Locação',                  'expense', 'debit',  42),
  ('energia_agua_internet',          'Energia / Água / Internet',          'expense', 'debit',  43),
  ('servicos_contabeis_juridicos',   'Serviços Contábeis / Jurídicos',     'expense', 'debit',  44),
  ('cartao_compra_operacional',      'Compra via Cartão Corporativo',      'expense', 'debit',  45),
  ('despesa_pessoal_misturada',      'Despesa Pessoal Misturada',          'expense', 'debit',  46),
  ('aplicacao_financeira',           'Aplicação Financeira',               'asset',   'debit',  50),
  ('resgate_financeiro',             'Resgate Financeiro',                 'asset',   'credit', 51),
  ('transferencia_interna_enviada',  'Transf. Intercompany Enviada',       'expense', 'debit',  52),
  ('reserva_limite_cartao',          'Reserva Limite Cartão',              'expense', 'debit',  53),
  ('despesa_ambigua',                'Despesa Ambígua',                    'expense', 'debit',  54),
  ('unclassified',                   'Não Classificado',                   'expense', 'both',   99)
ON CONFLICT (code) DO NOTHING;

-- Initial platform settings
INSERT INTO platform_settings (key, value, description, category)
VALUES
  ('platform_version',       '1.0.0',       'EPM platform version',              'system'),
  ('base_currency',          'BRL',          'Base currency for all amounts',     'financial'),
  ('fiscal_year_start',      '01-01',        'Fiscal year start month-day',       'financial'),
  ('consolidation_entities', 'AWQ_Holding,JACQES,Caza_Vision', 'Entities in operational consolidation', 'financial'),
  ('schema_deployed_at',     NOW()::text,    'Timestamp of schema deployment',    'system')
ON CONFLICT (key) DO NOTHING;
