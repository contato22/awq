-- ─── EPM Full Seed: Tables + Static Data ─────────────────────────────────────
-- Generated from:
--   lib/epm-planning-db.ts  (initEPMPlanningDB — table schemas)
--   lib/awq-group-data.ts   (buData, ventureContracts, monthlyRevenue,
--                            categoryBudget, allocFlags, holdingTreasurySnapshot)
--   lib/epm-gl-constants.ts (CHART_OF_ACCOUNTS)

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epm_bu_data (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  sub               TEXT,
  color             TEXT,
  accent_color      TEXT,
  status            TEXT,
  economic_type     TEXT,
  revenue           NUMERIC DEFAULT 0,
  gross_profit      NUMERIC DEFAULT 0,
  ebitda            NUMERIC DEFAULT 0,
  net_income        NUMERIC DEFAULT 0,
  cash_generated    NUMERIC DEFAULT 0,
  cash_balance      NUMERIC DEFAULT 0,
  customers         INTEGER DEFAULT 0,
  ftes              INTEGER DEFAULT 0,
  capital_allocated NUMERIC DEFAULT 0,
  roic              NUMERIC DEFAULT 0,
  budget_revenue    NUMERIC DEFAULT 0,
  href_overview     TEXT,
  href_financial    TEXT,
  href_customers    TEXT,
  href_unit_econ    TEXT,
  href_budget       TEXT,
  updated_at        TEXT
);

CREATE TABLE IF NOT EXISTS epm_venture_contracts (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  counterparty         TEXT NOT NULL,
  type                 TEXT,
  status               TEXT,
  start_date           TEXT,
  end_date             TEXT,
  monthly_fee          NUMERIC DEFAULT 0,
  arr                  NUMERIC DEFAULT 0,
  total_contract_value NUMERIC DEFAULT 0,
  duration_months      INTEGER DEFAULT 0,
  note                 TEXT,
  created_at           TEXT,
  updated_at           TEXT
);

CREATE TABLE IF NOT EXISTS epm_monthly_revenue (
  month       TEXT PRIMARY KEY,
  jacqes      NUMERIC DEFAULT 0,
  caza        NUMERIC DEFAULT 0,
  advisor     NUMERIC DEFAULT 0,
  venture     NUMERIC DEFAULT 0,
  enrd        NUMERIC DEFAULT 0,
  is_forecast BOOLEAN DEFAULT false,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS epm_category_budget (
  category   TEXT PRIMARY KEY,
  budget     NUMERIC DEFAULT 0,
  actual     NUMERIC DEFAULT 0,
  bu         TEXT DEFAULT 'Grupo',
  updated_at TEXT
);

ALTER TABLE epm_category_budget ADD COLUMN IF NOT EXISTS bu TEXT DEFAULT 'Grupo';

CREATE TABLE IF NOT EXISTS epm_alloc_flags (
  bu_id      TEXT PRIMARY KEY,
  flag       TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS epm_holding_treasury (
  id                     TEXT PRIMARY KEY,
  as_of                  TEXT,
  source                 TEXT,
  total_invested_real    NUMERIC DEFAULT 0,
  last_application_amount NUMERIC DEFAULT 0,
  last_application_date  TEXT,
  investment_type        TEXT,
  investment_bank        TEXT,
  investment_account_cash NUMERIC DEFAULT 0,
  bank_fees              NUMERIC DEFAULT 0,
  operational_cash       NUMERIC DEFAULT 0,
  card_limit_total       NUMERIC DEFAULT 0,
  card_limit_committed   NUMERIC DEFAULT 0,
  card_reserve_deposited NUMERIC DEFAULT 0,
  intercompany_total     NUMERIC DEFAULT 0,
  partner_withdrawals    NUMERIC DEFAULT 0,
  confidence             TEXT,
  note                   TEXT,
  updated_at             TEXT
);

CREATE TABLE IF NOT EXISTS epm_chart_of_accounts (
  account_code   TEXT PRIMARY KEY,
  account_name   TEXT NOT NULL,
  account_type   TEXT NOT NULL,
  normal_balance TEXT NOT NULL,
  level          INTEGER DEFAULT 3,
  updated_at     TEXT
);

CREATE TABLE IF NOT EXISTS epm_fiscal_rates (
  supplier_type TEXT PRIMARY KEY,
  irrf_rate     NUMERIC DEFAULT 0,
  inss_rate     NUMERIC DEFAULT 0,
  iss_rate      NUMERIC DEFAULT 0,
  pis_rate      NUMERIC DEFAULT 0,
  cofins_rate   NUMERIC DEFAULT 0,
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS epm_gl_entries (
  gl_id            TEXT PRIMARY KEY,
  journal_id       TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  period_code      TEXT NOT NULL,
  bu_code          TEXT NOT NULL,
  account_code     TEXT NOT NULL,
  account_name     TEXT NOT NULL,
  account_type     TEXT NOT NULL,
  debit_amount     NUMERIC NOT NULL DEFAULT 0,
  credit_amount    NUMERIC NOT NULL DEFAULT 0,
  description      TEXT NOT NULL,
  reference_doc    TEXT,
  source_system    TEXT NOT NULL DEFAULT 'manual',
  is_intercompany  BOOLEAN NOT NULL DEFAULT false,
  created_at       TEXT NOT NULL,
  created_by       TEXT
);

CREATE INDEX IF NOT EXISTS idx_gl_journal ON epm_gl_entries(journal_id);
CREATE INDEX IF NOT EXISTS idx_gl_period  ON epm_gl_entries(period_code);
CREATE INDEX IF NOT EXISTS idx_gl_bu      ON epm_gl_entries(bu_code);

-- ─── Seed: epm_bu_data ────────────────────────────────────────────────────────

INSERT INTO epm_bu_data (
  id, name, sub, color, accent_color, status, economic_type,
  revenue, gross_profit, ebitda, net_income, cash_generated, cash_balance,
  customers, ftes, capital_allocated, roic, budget_revenue,
  href_overview, href_financial, href_customers, href_unit_econ, href_budget,
  updated_at
) VALUES
  (
    'jacqes', 'JACQES', 'Agência · AWQ Group', 'bg-brand-600', 'text-brand-400',
    'Ativo', 'operational',
    27750, 0, 0, 0, 0, 0,
    4, 0, 0, 0, 0,
    '/jacqes', '/jacqes/fpa', '/jacqes/fpa', '/jacqes/fpa', '/jacqes/fpa',
    NOW()::text
  ),
  (
    'caza', 'Caza Vision', 'Produtora · AWQ Group', 'bg-emerald-600', 'text-emerald-400',
    'Ativo', 'operational',
    74200, 0, 0, 0, 0, 0,
    6, 15, 0, 0, 0,
    '/caza-vision', '/caza-vision/financial', '/caza-vision/clientes',
    '/caza-vision/unit-economics', '/caza-vision',
    NOW()::text
  ),
  (
    'advisor', 'Advisor', 'Consultoria · AWQ Group', 'bg-violet-600', 'text-violet-400',
    'Ativo', 'pre_revenue',
    0, 0, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    '/advisor', '/advisor/financial', '/advisor/customers', '/advisor', '/advisor',
    NOW()::text
  ),
  (
    'venture', 'AWQ Venture', 'Investimentos · AWQ Group', 'bg-amber-600', 'text-amber-400',
    'Ativo', 'hybrid_investment',
    0, 0, 0, 0, 0, 15762.62,
    0, 3, 15762.62, 0, 0,
    '/awq-venture', '/awq-venture/financial', '/awq-venture', '/awq-venture', '/awq-venture',
    NOW()::text
  ),
  (
    'enrd', 'ENRD', 'Agência Solar · AWQ Group', 'bg-orange-600', 'text-orange-400',
    'Ativo', 'operational',
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    '/enrd', '/enrd/financial', '/enrd/customers', '/enrd', '/enrd',
    NOW()::text
  )
ON CONFLICT DO NOTHING;

-- ─── Seed: epm_venture_contracts ─────────────────────────────────────────────

INSERT INTO epm_venture_contracts (
  counterparty, monthly_fee, duration_months, total_contract_value,
  arr, start_date, status, note, created_at, updated_at
) VALUES
  (
    'ENERDY', 2000.00, 36, 72000.00,
    24000.00, NULL, 'active',
    'Fee recorrente de advisory/incubação. Confirmed by user. Único contrato operacional confirmado da Venture.',
    NOW()::text, NOW()::text
  )
ON CONFLICT DO NOTHING;

-- ─── Seed: epm_monthly_revenue ───────────────────────────────────────────────

INSERT INTO epm_monthly_revenue (month, jacqes, caza, advisor, venture, enrd, is_forecast, updated_at) VALUES
  ('Jan/26', 6490,  0,     0, 0, 0, false, NOW()::text),
  ('Fev/26', 6490,  12400, 0, 0, 0, false, NOW()::text),
  ('Mar/26', 6490,  33900, 0, 0, 0, false, NOW()::text),
  ('Abr/26', 8280,  27900, 0, 0, 0, false, NOW()::text)
ON CONFLICT (month) DO NOTHING;

-- ─── Seed: epm_category_budget ───────────────────────────────────────────────

INSERT INTO epm_category_budget (category, budget, actual, bu, updated_at) VALUES
  ('Marketing & Growth',    0, 0, 'Grupo', NOW()::text),
  ('Salários & Benefícios', 0, 0, 'Grupo', NOW()::text),
  ('Tecnologia & Infra',    0, 0, 'Grupo', NOW()::text),
  ('Vendas & Comissões',    0, 0, 'Grupo', NOW()::text),
  ('G&A Consolidado',       0, 0, 'Grupo', NOW()::text),
  ('Desp. Operacionais',    0, 0, 'Grupo', NOW()::text)
ON CONFLICT DO NOTHING;

-- ─── Seed: epm_alloc_flags ───────────────────────────────────────────────────

INSERT INTO epm_alloc_flags (bu_id, flag, updated_at) VALUES
  ('jacqes',  'maintain', NOW()::text),
  ('caza',    'expand',   NOW()::text),
  ('advisor', 'expand',   NOW()::text),
  ('venture', 'maintain', NOW()::text),
  ('enrd',    'expand',   NOW()::text)
ON CONFLICT (bu_id) DO NOTHING;

-- ─── Seed: epm_holding_treasury ──────────────────────────────────────────────

INSERT INTO epm_holding_treasury (
  id, as_of, source,
  total_invested_real, last_application_amount, last_application_date,
  investment_type, investment_bank,
  investment_account_cash, bank_fees,
  operational_cash, card_limit_total, card_limit_committed, card_reserve_deposited,
  intercompany_total, partner_withdrawals,
  confidence, note, updated_at
) VALUES (
  'current',
  '2026-04-04',
  'Prints bancários Cora AWQ + Itaú Empresas (02–04/04/2026)',
  15762.62, 5000.00, '2026-04-02',
  'Renda Fixa — CDB DI', 'Itaú Empresas',
  1193.58, 108.60,
  8460.00, 1000.00, 522.61, 1000.00,
  14000.00, 2000.00,
  'empirical_print',
  'Posição empírica confirmada. totalInvestedReal = R$15.762,62 é o único valor de investimento com prova documental nesta data. Aguardando extrato PDF Itaú para integração com pipeline financeira e atualização automática via ingest.',
  NOW()::text
)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: epm_chart_of_accounts ─────────────────────────────────────────────

INSERT INTO epm_chart_of_accounts (account_code, account_name, account_type, normal_balance, level, updated_at) VALUES
  ('1.1.01', 'Caixa e Equivalentes',             'ASSET',              'DEBIT',  3, NOW()::text),
  ('1.1.02', 'Contas a Receber',                  'ASSET',              'DEBIT',  3, NOW()::text),
  ('1.1.03', 'Adiantamentos a Fornecedores',      'ASSET',              'DEBIT',  3, NOW()::text),
  ('1.1.04', 'Outros Créditos Circulantes',       'ASSET',              'DEBIT',  3, NOW()::text),
  ('1.2.01', 'Imobilizado (líquido)',             'ASSET',              'DEBIT',  3, NOW()::text),
  ('1.2.02', 'Intangível (líquido)',              'ASSET',              'DEBIT',  3, NOW()::text),
  ('1.2.03', 'Investimentos / Aplicações LP',     'ASSET',              'DEBIT',  3, NOW()::text),
  ('2.1.01', 'Fornecedores (Contas a Pagar)',     'LIABILITY',          'CREDIT', 3, NOW()::text),
  ('2.1.02', 'Obrigações Fiscais',                'LIABILITY',          'CREDIT', 3, NOW()::text),
  ('2.1.03', 'Obrigações Trabalhistas',           'LIABILITY',          'CREDIT', 3, NOW()::text),
  ('2.1.04', 'Outros Passivos Circulantes',       'LIABILITY',          'CREDIT', 3, NOW()::text),
  ('2.2.01', 'Empréstimos e Financiamentos LP',   'LIABILITY',          'CREDIT', 3, NOW()::text),
  ('3.1.01', 'Capital Social',                    'EQUITY',             'CREDIT', 3, NOW()::text),
  ('3.1.02', 'Reservas de Lucros',                'EQUITY',             'CREDIT', 3, NOW()::text),
  ('3.1.03', 'Lucros / Prejuízos Acumulados',     'EQUITY',             'CREDIT', 3, NOW()::text),
  ('4.1.01', 'Receita de Serviços (JACQES)',      'REVENUE',            'CREDIT', 3, NOW()::text),
  ('4.1.02', 'Receita de Produção (Caza Vision)', 'REVENUE',            'CREDIT', 3, NOW()::text),
  ('4.1.03', 'Receita de Consultoria (Advisor)',  'REVENUE',            'CREDIT', 3, NOW()::text),
  ('4.1.04', 'Fee de Gestão (Venture)',           'REVENUE',            'CREDIT', 3, NOW()::text),
  ('4.1.05', 'Outras Receitas de Serviços',       'REVENUE',            'CREDIT', 3, NOW()::text),
  ('4.2.01', 'Rendimentos de Aplicações',         'FINANCIAL_REVENUE',  'CREDIT', 3, NOW()::text),
  ('4.2.02', 'Ajustes e Créditos Bancários',      'FINANCIAL_REVENUE',  'CREDIT', 3, NOW()::text),
  ('5.1.01', 'Freelancers e Terceiros',           'COGS',               'DEBIT',  3, NOW()::text),
  ('5.1.02', 'Fornecedor Operacional',            'COGS',               'DEBIT',  3, NOW()::text),
  ('6.1.01', 'Salários e Encargos',               'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.02', 'Pró-labore / Retirada do Sócio',    'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.03', 'Impostos e Tributos',               'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.04', 'Tarifa Bancária',                   'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.05', 'Software e Assinaturas',            'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.06', 'Aluguel e Locação',                 'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.07', 'Energia / Água / Internet',         'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.1.08', 'Serviços Contábeis / Jurídicos',    'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.2.01', 'Marketing e Mídia Paga',            'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.2.02', 'Comissões de Venda',                'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.3.01', 'Deslocamento e Combustível',        'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.3.02', 'Alimentação e Representação',       'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.3.03', 'Viagem e Hospedagem',               'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.3.04', 'Compras via Cartão Corporativo',    'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('6.3.05', 'Despesas Pessoais Mistas',          'EXPENSE',            'DEBIT',  3, NOW()::text),
  ('7.1.01', 'Juros / Multa / IOF',               'FINANCIAL_EXPENSE',  'DEBIT',  3, NOW()::text),
  ('9.1.01', 'AR Intercompany — JACQES',          'INTERCOMPANY',       'DEBIT',  3, NOW()::text),
  ('9.1.02', 'AR Intercompany — Caza Vision',     'INTERCOMPANY',       'DEBIT',  3, NOW()::text),
  ('9.2.01', 'AP Intercompany — AWQ Holding',     'INTERCOMPANY',       'CREDIT', 3, NOW()::text)
ON CONFLICT (account_code) DO NOTHING;

-- ─── Seed: epm_fiscal_rates ──────────────────────────────────────────────────

INSERT INTO epm_fiscal_rates (supplier_type, irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate, updated_at) VALUES
  ('service_professional', 0.015, 0,    0.05, 0.0065, 0.03, NOW()::text),
  ('service_cleaning',     0.01,  0.11, 0.05, 0.0065, 0.03, NOW()::text),
  ('service_construction', 0.015, 0.11, 0.05, 0.0065, 0.03, NOW()::text),
  ('goods',                0,     0,    0,    0,      0,    NOW()::text),
  ('rent',                 0.015, 0,    0,    0,      0,    NOW()::text),
  ('other',                0,     0,    0,    0,      0,    NOW()::text)
ON CONFLICT (supplier_type) DO NOTHING;
