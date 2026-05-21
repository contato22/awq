-- ─── CRM Genérico + Advisor — Schema completo ────────────────────────────────
-- Tabelas:
--   advisor_clients (cadastro de clientes Advisor)
--   crm_accounts, crm_contacts, crm_leads, crm_opportunities,
--   crm_opportunity_stage_history, crm_activities, crm_pipeline_snapshot
-- Triggers: probability auto-set, stage history, opportunity_code, account_code
-- Views: pipeline_overview, sales_forecast, account_health, conversion_funnel
--
-- FKs para tabelas ERP legado (customers, accounts_receivable) removidas —
-- campos mantidos como UUID simples sem constraint.
-- Idempotente — seguro rodar múltiplas vezes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. advisor_clients ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_clients (
  id                   TEXT        PRIMARY KEY,
  name                 TEXT        NOT NULL DEFAULT '',
  segmento             TEXT        NOT NULL DEFAULT '',
  tipo_servico         TEXT        NOT NULL DEFAULT '',
  aum                  NUMERIC     NOT NULL DEFAULT 0,
  fee_mensal           NUMERIC     NOT NULL DEFAULT 0,
  status               TEXT        NOT NULL DEFAULT 'Ativo',
  since                TEXT        NOT NULL DEFAULT '',
  responsavel          TEXT        NOT NULL DEFAULT '',
  contato_email        TEXT        NOT NULL DEFAULT '',
  contato_phone        TEXT        NOT NULL DEFAULT '',
  nps                  NUMERIC,
  imported_from_notion BOOLEAN     NOT NULL DEFAULT false,
  notion_page_id       TEXT,
  imported_at          TEXT,
  last_internal_update TEXT        NOT NULL DEFAULT '',
  sync_status          TEXT        NOT NULL DEFAULT 'internal'
);

CREATE INDEX IF NOT EXISTS idx_advisor_cli_status ON advisor_clients(status);
CREATE INDEX IF NOT EXISTS idx_advisor_cli_since  ON advisor_clients(since);

-- ─── 2. crm_accounts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_accounts (
  account_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code            TEXT        UNIQUE,
  account_name            TEXT        NOT NULL,
  trade_name              TEXT,
  document_number         TEXT        UNIQUE,
  industry                TEXT        CHECK (industry IN
                            ('tech','finance','education','health','media','retail','other')),
  company_size            TEXT        CHECK (company_size IN
                            ('1-10','11-50','51-200','201-500','500+')),
  annual_revenue_estimate NUMERIC(15,2),
  website                 TEXT,
  linkedin_url            TEXT,
  address_street          TEXT,
  address_city            TEXT,
  address_state           TEXT,
  address_zip             TEXT,
  account_type            TEXT        NOT NULL DEFAULT 'prospect'
                            CHECK (account_type IN ('prospect','customer','partner','former_customer')),
  owner                   TEXT        NOT NULL DEFAULT 'Miguel',
  health_score            SMALLINT    NOT NULL DEFAULT 70
                            CHECK (health_score BETWEEN 0 AND 100),
  churn_risk              TEXT        NOT NULL DEFAULT 'low'
                            CHECK (churn_risk IN ('low','medium','high')),
  renewal_date            DATE,
  epm_customer_id         UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_type  ON crm_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_owner ON crm_accounts(owner);

-- ─── 3. crm_contacts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_contacts (
  contact_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         UUID        REFERENCES crm_accounts(account_id) ON DELETE CASCADE,
  full_name          TEXT        NOT NULL,
  email              TEXT,
  phone              TEXT,
  mobile             TEXT,
  job_title          TEXT,
  department         TEXT,
  seniority          TEXT        NOT NULL DEFAULT 'manager'
                       CHECK (seniority IN ('c_level','director','manager','ic')),
  linkedin_url       TEXT,
  is_primary_contact BOOLEAN     NOT NULL DEFAULT FALSE,
  contact_preferences TEXT[]     NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts(account_id);

-- ─── 4. crm_leads ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_leads (
  lead_id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_source                 TEXT        NOT NULL DEFAULT 'manual'
                                CHECK (lead_source IN ('organic','paid','referral','inbound','manual')),
  company_name                TEXT        NOT NULL,
  contact_name                TEXT        NOT NULL,
  email                       TEXT,
  phone                       TEXT,
  job_title                   TEXT,
  bu                          TEXT        NOT NULL DEFAULT 'JACQES'
                                CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE')),
  lead_score                  SMALLINT    NOT NULL DEFAULT 0
                                CHECK (lead_score BETWEEN 0 AND 100),
  status                      TEXT        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new','contacted','qualified','unqualified','converted')),
  qualification_notes         TEXT,
  bant_budget                 NUMERIC(15,2),
  bant_authority              BOOLEAN     NOT NULL DEFAULT FALSE,
  bant_need                   TEXT        CHECK (bant_need IN ('low','medium','high')),
  bant_timeline               DATE,
  assigned_to                 TEXT        NOT NULL DEFAULT 'Miguel',
  converted_to_opportunity_id UUID,
  converted_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_status   ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_bu       ON crm_leads(bu);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads(assigned_to);

-- ─── 5. crm_opportunities ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_opportunities (
  opportunity_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_code    TEXT        UNIQUE,
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
  win_reason          TEXT,
  owner               TEXT        NOT NULL DEFAULT 'Miguel',
  proposal_sent_date  DATE,
  proposal_viewed     BOOLEAN     NOT NULL DEFAULT FALSE,
  proposal_accepted   BOOLEAN     NOT NULL DEFAULT FALSE,
  synced_to_epm       BOOLEAN     NOT NULL DEFAULT FALSE,
  epm_customer_id     UUID,
  epm_ar_id           UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_stage   ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opp_bu      ON crm_opportunities(bu);
CREATE INDEX IF NOT EXISTS idx_crm_opp_owner   ON crm_opportunities(owner);
CREATE INDEX IF NOT EXISTS idx_crm_opp_account ON crm_opportunities(account_id);

-- ─── 6. crm_opportunity_stage_history ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_opportunity_stage_history (
  history_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID        NOT NULL REFERENCES crm_opportunities(opportunity_id) ON DELETE CASCADE,
  from_stage     TEXT,
  to_stage       TEXT        NOT NULL,
  changed_by     TEXT,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_stage_hist_opp ON crm_opportunity_stage_history(opportunity_id);

-- ─── 7. crm_activities ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_activities (
  activity_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type    TEXT        NOT NULL
                     CHECK (activity_type IN ('call','email','meeting','task','note')),
  related_to_type  TEXT        NOT NULL
                     CHECK (related_to_type IN ('lead','opportunity','account','contact')),
  related_to_id    UUID        NOT NULL,
  subject          TEXT        NOT NULL,
  description      TEXT,
  outcome          TEXT        CHECK (outcome IN ('successful','unsuccessful','no_answer')),
  duration_minutes INTEGER,
  scheduled_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','completed','cancelled')),
  created_by       TEXT        NOT NULL DEFAULT 'Miguel',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_act_related ON crm_activities(related_to_type, related_to_id);
CREATE INDEX IF NOT EXISTS idx_crm_act_status  ON crm_activities(status);
CREATE INDEX IF NOT EXISTS idx_crm_act_creator ON crm_activities(created_by);

-- ─── 8. crm_pipeline_snapshot ────────────────────────────────────────────────

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

-- ─── Triggers ────────────────────────────────────────────────────────────────

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

CREATE OR REPLACE FUNCTION fn_crm_opp_log_stage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO crm_opportunity_stage_history (opportunity_id, from_stage, to_stage, changed_by)
    VALUES (NEW.opportunity_id, OLD.stage, NEW.stage, NEW.created_by);
    IF NEW.stage IN ('closed_won','closed_lost') AND OLD.actual_close_date IS NULL THEN
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

-- ─── Views ────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS v_crm_pipeline_overview CASCADE;
CREATE OR REPLACE VIEW v_crm_pipeline_overview AS
SELECT
  o.stage, o.bu,
  COUNT(*)                                        AS deal_count,
  SUM(o.deal_value)                               AS total_value,
  SUM(o.deal_value * o.probability / 100.0)       AS weighted_value
FROM crm_opportunities o
WHERE o.stage NOT IN ('closed_won','closed_lost')
GROUP BY o.stage, o.bu;

DROP VIEW IF EXISTS v_crm_sales_forecast CASCADE;
CREATE OR REPLACE VIEW v_crm_sales_forecast AS
SELECT
  o.bu, o.owner,
  TO_CHAR(o.expected_close_date, 'YYYY-MM') AS forecast_month,
  COUNT(*)                                   AS deal_count,
  SUM(o.deal_value)                          AS pipeline_value,
  SUM(o.deal_value * o.probability / 100.0)  AS weighted_forecast
FROM crm_opportunities o
WHERE o.stage NOT IN ('closed_won','closed_lost')
  AND o.expected_close_date IS NOT NULL
GROUP BY o.bu, o.owner, TO_CHAR(o.expected_close_date, 'YYYY-MM')
ORDER BY forecast_month, bu;
