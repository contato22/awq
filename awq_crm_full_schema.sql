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
CREATE POLICY IF NOT EXISTS crm_accounts_all        ON crm_accounts              FOR ALL USING (TRUE);
CREATE POLICY IF NOT EXISTS crm_contacts_all        ON crm_contacts              FOR ALL USING (TRUE);
CREATE POLICY IF NOT EXISTS crm_leads_all           ON crm_leads                 FOR ALL USING (TRUE);
CREATE POLICY IF NOT EXISTS crm_opportunities_all   ON crm_opportunities         FOR ALL USING (TRUE);
CREATE POLICY IF NOT EXISTS crm_stage_hist_all      ON crm_opportunity_stage_history FOR ALL USING (TRUE);
CREATE POLICY IF NOT EXISTS crm_activities_all      ON crm_activities            FOR ALL USING (TRUE);

-- =============================================================================
-- 8. SEED DATA
-- =============================================================================

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
