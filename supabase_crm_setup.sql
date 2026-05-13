-- ─── AWQ CRM — Supabase Schema ───────────────────────────────────────────────
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Project: kkhxxsrgsewjfvnnssyf

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Accounts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_accounts (
  account_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code             TEXT GENERATED ALWAYS AS ('ACC-' || UPPER(SUBSTRING(account_id::text, 1, 6))) STORED,
  account_name             TEXT NOT NULL,
  trade_name               TEXT,
  document_number          TEXT,
  industry                 TEXT,
  company_size             TEXT,
  annual_revenue_estimate  NUMERIC,
  website                  TEXT,
  linkedin_url             TEXT,
  address_street           TEXT,
  address_city             TEXT,
  address_state            TEXT,
  address_zip              TEXT,
  account_type             TEXT NOT NULL DEFAULT 'prospect' CHECK (account_type IN ('prospect','customer','partner','former_customer')),
  bu                       TEXT NOT NULL DEFAULT 'JACQES',
  owner                    TEXT NOT NULL DEFAULT 'Miguel',
  health_score             INTEGER NOT NULL DEFAULT 70,
  churn_risk               TEXT NOT NULL DEFAULT 'low' CHECK (churn_risk IN ('low','medium','high')),
  renewal_date             DATE,
  epm_customer_id          TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               TEXT
);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contacts (
  contact_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id           UUID REFERENCES crm_accounts(account_id) ON DELETE SET NULL,
  full_name            TEXT NOT NULL,
  email                TEXT,
  phone                TEXT,
  mobile               TEXT,
  job_title            TEXT,
  department           TEXT,
  seniority            TEXT NOT NULL DEFAULT 'manager' CHECK (seniority IN ('c_level','director','manager','ic')),
  linkedin_url         TEXT,
  is_primary_contact   BOOLEAN NOT NULL DEFAULT false,
  contact_preferences  TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_leads (
  lead_id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_source                  TEXT NOT NULL DEFAULT 'manual',
  company_name                 TEXT NOT NULL,
  contact_name                 TEXT NOT NULL,
  email                        TEXT,
  phone                        TEXT,
  job_title                    TEXT,
  bu                           TEXT NOT NULL DEFAULT 'JACQES',
  lead_score                   INTEGER NOT NULL DEFAULT 0,
  status                       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','unqualified','converted')),
  qualification_notes          TEXT,
  bant_budget                  NUMERIC,
  bant_authority               BOOLEAN NOT NULL DEFAULT false,
  bant_need                    TEXT CHECK (bant_need IN ('low','medium','high')),
  bant_timeline                DATE,
  assigned_to                  TEXT NOT NULL DEFAULT 'Miguel',
  converted_to_opportunity_id  UUID,
  converted_at                 TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                   TEXT
);

-- ─── Opportunities ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_opportunities (
  opportunity_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_code    TEXT GENERATED ALWAYS AS ('OPP-' || UPPER(SUBSTRING(opportunity_id::text, 1, 6))) STORED,
  opportunity_name    TEXT NOT NULL,
  account_id          UUID REFERENCES crm_accounts(account_id) ON DELETE SET NULL,
  contact_id          UUID REFERENCES crm_contacts(contact_id) ON DELETE SET NULL,
  bu                  TEXT NOT NULL DEFAULT 'JACQES',
  stage               TEXT NOT NULL DEFAULT 'discovery' CHECK (stage IN ('discovery','qualification','proposal','negotiation','closed_won','closed_lost')),
  deal_value          NUMERIC NOT NULL DEFAULT 0,
  probability         INTEGER NOT NULL DEFAULT 25,
  expected_close_date DATE,
  actual_close_date   DATE,
  lost_reason         TEXT,
  lost_to_competitor  TEXT,
  win_reason          TEXT,
  owner               TEXT NOT NULL DEFAULT 'Miguel',
  proposal_sent_date  DATE,
  proposal_viewed     BOOLEAN NOT NULL DEFAULT false,
  proposal_accepted   BOOLEAN NOT NULL DEFAULT false,
  synced_to_epm       BOOLEAN NOT NULL DEFAULT false,
  epm_customer_id     TEXT,
  epm_ar_id           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT
);

-- ─── Activities ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_activities (
  activity_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type     TEXT NOT NULL CHECK (activity_type IN ('call','email','meeting','task','note')),
  related_to_type   TEXT NOT NULL CHECK (related_to_type IN ('lead','opportunity','account','contact')),
  related_to_id     UUID NOT NULL,
  subject           TEXT NOT NULL,
  description       TEXT,
  outcome           TEXT CHECK (outcome IN ('successful','unsuccessful','no_answer')),
  duration_minutes  INTEGER,
  scheduled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_by        TEXT NOT NULL DEFAULT 'Miguel',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_leads_status      ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_bu          ON crm_leads(bu);
CREATE INDEX IF NOT EXISTS idx_crm_opps_stage        ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opps_bu           ON crm_opportunities(bu);
CREATE INDEX IF NOT EXISTS idx_crm_acts_related      ON crm_activities(related_to_type, related_to_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account  ON crm_contacts(account_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_accounts_updated_at    BEFORE UPDATE ON crm_accounts    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER trg_contacts_updated_at    BEFORE UPDATE ON crm_contacts    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER trg_leads_updated_at       BEFORE UPDATE ON crm_leads       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER trg_activities_updated_at  BEFORE UPDATE ON crm_activities  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Row Level Security (RLS) ────────────────────────────────────────────────
-- Allows full access with the anon key (for GitHub Pages).
-- Restrict further if you add user authentication later.

ALTER TABLE crm_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities   ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated roles to do everything
DO $$ DECLARE tbl TEXT;
BEGIN FOR tbl IN SELECT unnest(ARRAY['crm_accounts','crm_contacts','crm_leads','crm_opportunities','crm_activities'])
LOOP
  EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', tbl);
  EXECUTE format('CREATE POLICY allow_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
END LOOP; END $$;
