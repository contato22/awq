// ─── AWQ CRM — Database Layer (Neon Postgres) ────────────────────────────────
// Mirrors pattern of jacqes-crm-db.ts.
// Uses sql from lib/db.ts — falls back to seed arrays when DATABASE_URL unset.

import { sql } from "@/lib/db";
import type {
  CrmAccount, CrmContact, CrmLead, CrmOpportunity,
  CrmActivity, CrmDashboardMetrics, CrmPipelineMetrics,
} from "@/lib/crm-types";

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────
export async function initCrmDB(): Promise<void> {
  if (!sql) return;

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  // ── Tables ────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS crm_accounts (
      account_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      account_code             TEXT        UNIQUE,
      account_name             TEXT        NOT NULL,
      trade_name               TEXT,
      document_number          TEXT        UNIQUE,
      industry                 TEXT        CHECK (industry IN ('tech','finance','education','health','media','retail','other')),
      company_size             TEXT        CHECK (company_size IN ('1-10','11-50','51-200','201-500','500+')),
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
      epm_customer_id          UUID,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by               TEXT
    )
  `;

  await sql`
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
    )
  `;

  await sql`
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
      converted_to_opportunity_id  UUID,
      converted_at                 TIMESTAMPTZ,
      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by                   TEXT
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS crm_opportunity_stage_history (
      history_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      opportunity_id  UUID        NOT NULL REFERENCES crm_opportunities(opportunity_id) ON DELETE CASCADE,
      from_stage      TEXT,
      to_stage        TEXT        NOT NULL,
      changed_by      TEXT,
      changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS crm_pipeline_snapshot (
      snapshot_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
      stage               TEXT          NOT NULL,
      bu                  TEXT          NOT NULL,
      total_opportunities INTEGER       NOT NULL DEFAULT 0,
      total_value         NUMERIC(15,2) NOT NULL DEFAULT 0,
      weighted_value      NUMERIC(15,2) NOT NULL DEFAULT 0
    )
  `;

  // ── Indexes ───────────────────────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_accounts_type   ON crm_accounts(account_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_accounts_owner  ON crm_accounts(owner)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_status    ON crm_leads(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_bu        ON crm_leads(bu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned  ON crm_leads(assigned_to)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_opp_stage       ON crm_opportunities(stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_opp_bu          ON crm_opportunities(bu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_opp_owner       ON crm_opportunities(owner)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_opp_account     ON crm_opportunities(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_stage_hist_opp  ON crm_opportunity_stage_history(opportunity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_act_related     ON crm_activities(related_to_type, related_to_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_act_status      ON crm_activities(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_act_creator     ON crm_activities(created_by)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_snap_date       ON crm_pipeline_snapshot(snapshot_date)`;

  // ── Trigger: auto-set probability by stage ────────────────────────────────
  await sql`
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
    $$
  `;
  await sql`DROP TRIGGER IF EXISTS trg_crm_opp_probability ON crm_opportunities`;
  await sql`
    CREATE TRIGGER trg_crm_opp_probability
      BEFORE INSERT OR UPDATE OF stage ON crm_opportunities
      FOR EACH ROW EXECUTE FUNCTION fn_crm_opp_set_probability()
  `;

  // ── Trigger: auto-log stage changes ──────────────────────────────────────
  await sql`
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
    $$
  `;
  await sql`DROP TRIGGER IF EXISTS trg_crm_opp_stage_history ON crm_opportunities`;
  await sql`
    CREATE TRIGGER trg_crm_opp_stage_history
      BEFORE UPDATE ON crm_opportunities
      FOR EACH ROW EXECUTE FUNCTION fn_crm_opp_log_stage()
  `;

  // ── Trigger: auto-generate opportunity_code ───────────────────────────────
  await sql`
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
    $$
  `;
  await sql`DROP TRIGGER IF EXISTS trg_crm_opp_code ON crm_opportunities`;
  await sql`
    CREATE TRIGGER trg_crm_opp_code
      BEFORE INSERT ON crm_opportunities
      FOR EACH ROW EXECUTE FUNCTION fn_crm_opp_code()
  `;

  // ── Trigger: auto-generate account_code ──────────────────────────────────
  await sql`
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
    $$
  `;
  await sql`DROP TRIGGER IF EXISTS trg_crm_account_code ON crm_accounts`;
  await sql`
    CREATE TRIGGER trg_crm_account_code
      BEFORE INSERT ON crm_accounts
      FOR EACH ROW EXECUTE FUNCTION fn_crm_account_code()
  `;

  // ── Views ─────────────────────────────────────────────────────────────────
  await sql`
    CREATE OR REPLACE VIEW v_crm_pipeline_overview AS
    SELECT stage, bu,
      COUNT(*)                                  AS deal_count,
      SUM(deal_value)                           AS total_value,
      SUM(deal_value * probability / 100.0)     AS weighted_value
    FROM crm_opportunities
    WHERE stage NOT IN ('closed_won','closed_lost')
    GROUP BY stage, bu
  `;

  await sql`
    CREATE OR REPLACE VIEW v_crm_sales_forecast AS
    SELECT bu, owner,
      TO_CHAR(expected_close_date, 'YYYY-MM')   AS forecast_month,
      COUNT(*)                                   AS deal_count,
      SUM(deal_value)                            AS pipeline_value,
      SUM(deal_value * probability / 100.0)      AS weighted_forecast
    FROM crm_opportunities
    WHERE stage NOT IN ('closed_won','closed_lost')
      AND expected_close_date IS NOT NULL
    GROUP BY bu, owner, TO_CHAR(expected_close_date, 'YYYY-MM')
    ORDER BY forecast_month, bu
  `;

  await sql`
    CREATE OR REPLACE VIEW v_crm_account_health AS
    SELECT a.account_id, a.account_code, a.account_name, a.account_type,
      a.owner, a.health_score, a.churn_risk, a.renewal_date,
      COUNT(DISTINCT o.opportunity_id) FILTER (WHERE o.stage NOT IN ('closed_won','closed_lost'))
                                                AS open_opportunities,
      MAX(act.created_at)                       AS last_activity_at,
      EXTRACT(DAY FROM NOW() - MAX(act.created_at)) AS days_since_activity
    FROM crm_accounts a
    LEFT JOIN crm_opportunities o   ON o.account_id = a.account_id
    LEFT JOIN crm_activities    act ON act.related_to_type = 'account'
                                   AND act.related_to_id = a.account_id
    GROUP BY a.account_id, a.account_code, a.account_name, a.account_type,
             a.owner, a.health_score, a.churn_risk, a.renewal_date
  `;
}

// ─── Seed Data (static/no-DB fallback) ───────────────────────────────────────
export const SEED_ACCOUNTS: CrmAccount[] = [
  { account_id:"a1", account_code:"ACC-001", account_name:"XP Investimentos S.A.", trade_name:"XP Investimentos", document_number:"02.332.886/0001-04", industry:"finance", company_size:"500+", annual_revenue_estimate:null, website:"https://xpi.com.br", linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"CAZA", owner:"Miguel", health_score:88, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-01-01T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Miguel", open_opportunities:2, last_activity_at:"2026-04-25T00:00:00Z" },
  { account_id:"a2", account_code:"ACC-002", account_name:"Nu Pagamentos S.A.", trade_name:"Nubank", document_number:"18.236.120/0001-58", industry:"finance", company_size:"500+", annual_revenue_estimate:null, website:"https://nubank.com.br", linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"CAZA", owner:"Danilo", health_score:82, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-01-15T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Danilo", open_opportunities:1, last_activity_at:"2026-04-23T00:00:00Z" },
  { account_id:"a3", account_code:"ACC-003", account_name:"Colégio CEM", trade_name:"Colégio CEM", document_number:"60.621.457/0001-99", industry:"education", company_size:"51-200", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"CAZA", owner:"Miguel", health_score:75, churn_risk:"medium", renewal_date:"2026-12-31", epm_customer_id:null, created_at:"2026-02-01T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Miguel", open_opportunities:1, last_activity_at:"2026-04-20T00:00:00Z" },
  { account_id:"a4", account_code:"ACC-004", account_name:"Reabilicor Clínica Cardíaca", trade_name:"Reabilicor", document_number:"12.345.678/0001-00", industry:"health", company_size:"11-50", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"Rio de Janeiro", address_state:"RJ", address_zip:null, account_type:"prospect", bu:"ADVISOR", owner:"Danilo", health_score:60, churn_risk:"medium", renewal_date:null, epm_customer_id:null, created_at:"2026-03-01T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Danilo", open_opportunities:1, last_activity_at:"2026-04-22T00:00:00Z" },
  { account_id:"a5", account_code:"ACC-005", account_name:"Clínica Teresópolis", trade_name:"Clínica Teresópolis", document_number:"98.765.432/0001-11", industry:"health", company_size:"11-50", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"Teresópolis", address_state:"RJ", address_zip:null, account_type:"customer", bu:"ADVISOR", owner:"Danilo", health_score:72, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-02-15T00:00:00Z", updated_at:"2026-04-01T00:00:00Z", created_by:"Danilo", open_opportunities:0, last_activity_at:null },
  { account_id:"a6", account_code:"ACC-006", account_name:"Carol Bertolini", trade_name:"Carol Bertolini", document_number:"11.111.111/0001-22", industry:"media", company_size:"1-10", annual_revenue_estimate:null, website:null, linkedin_url:null, address_street:null, address_city:"São Paulo", address_state:"SP", address_zip:null, account_type:"customer", bu:"JACQES", owner:"Miguel", health_score:91, churn_risk:"low", renewal_date:null, epm_customer_id:null, created_at:"2026-01-10T00:00:00Z", updated_at:"2026-04-15T00:00:00Z", created_by:"Miguel", open_opportunities:0, last_activity_at:"2026-04-15T00:00:00Z" },
];

export const SEED_CONTACTS: CrmContact[] = [
  { contact_id:"c1", account_id:"a1", account_name:"XP Investimentos", full_name:"João Silva", email:"joao.silva@xpi.com.br", phone:"11 3456-7890", mobile:null, job_title:"Head of Marketing", department:"Marketing", seniority:"director", linkedin_url:null, is_primary_contact:true, contact_preferences:["email","phone"], created_at:"2026-01-01T00:00:00Z", updated_at:"2026-01-01T00:00:00Z" },
  { contact_id:"c2", account_id:"a2", account_name:"Nubank", full_name:"Carlos Mendes", email:"carlos.mendes@nubank.com.br", phone:"11 4567-8901", mobile:null, job_title:"VP Marketing", department:"Marketing", seniority:"director", linkedin_url:null, is_primary_contact:true, contact_preferences:["email"], created_at:"2026-01-15T00:00:00Z", updated_at:"2026-01-15T00:00:00Z" },
  { contact_id:"c3", account_id:"a3", account_name:"Colégio CEM", full_name:"Fernanda Costa", email:"fernanda@colegiocm.com.br", phone:"11 5678-9012", mobile:null, job_title:"Diretora Pedagógica", department:"Diretoria", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["phone","whatsapp"], created_at:"2026-02-01T00:00:00Z", updated_at:"2026-02-01T00:00:00Z" },
  { contact_id:"c4", account_id:"a4", account_name:"Reabilicor", full_name:"Dr. Roberto Silva", email:"roberto@reabilicor.com.br", phone:"21 6789-0123", mobile:null, job_title:"Diretor Médico", department:"Diretoria", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["phone"], created_at:"2026-03-01T00:00:00Z", updated_at:"2026-03-01T00:00:00Z" },
  { contact_id:"c5", account_id:"a5", account_name:"Clínica Teresópolis", full_name:"Dra. Aline Duarte", email:"aline@clinicateresopolis.com.br", phone:"24 7890-1234", mobile:null, job_title:"Sócia Fundadora", department:"Diretoria", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["whatsapp"], created_at:"2026-02-15T00:00:00Z", updated_at:"2026-02-15T00:00:00Z" },
  { contact_id:"c6", account_id:"a6", account_name:"Carol Bertolini", full_name:"Carol Bertolini", email:"carol@carolbertolini.com.br", phone:"11 9999-0000", mobile:null, job_title:"Artista", department:"Pessoal", seniority:"c_level", linkedin_url:null, is_primary_contact:true, contact_preferences:["whatsapp","email"], created_at:"2026-01-10T00:00:00Z", updated_at:"2026-01-10T00:00:00Z" },
];

export const SEED_LEADS: CrmLead[] = [
  { lead_id:"l1", lead_source:"inbound", company_name:"Tech Solutions BR", contact_name:"Rafael Moura", email:"rafael@techsolutions.com.br", phone:"11 9999-0001", job_title:"CEO", bu:"JACQES", lead_score:75, status:"qualified", qualification_notes:"Grande interesse em gestão de mídias sociais", bant_budget:25000, bant_authority:true, bant_need:"high", bant_timeline:"2026-05-30", assigned_to:"Miguel", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-01T10:00:00Z", updated_at:"2026-04-10T10:00:00Z", created_by:"Miguel" },
  { lead_id:"l2", lead_source:"referral", company_name:"HealthFirst Clínicas", contact_name:"Dra. Sandra Lima", email:"sandra@healthfirst.com.br", phone:"21 9888-0002", job_title:"Sócia", bu:"ADVISOR", lead_score:60, status:"contacted", qualification_notes:"Interesse em consultoria estratégica", bant_budget:40000, bant_authority:true, bant_need:"medium", bant_timeline:"2026-06-15", assigned_to:"Danilo", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-05T10:00:00Z", updated_at:"2026-04-12T10:00:00Z", created_by:"Danilo" },
  { lead_id:"l3", lead_source:"organic", company_name:"Esporte Clube Nacional", contact_name:"Lucas Ferreira", email:"lucas@ecnacional.com.br", phone:"11 9777-0003", job_title:"Dir. de Marketing", bu:"CAZA", lead_score:40, status:"new", qualification_notes:null, bant_budget:15000, bant_authority:false, bant_need:"low", bant_timeline:null, assigned_to:"Miguel", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-15T10:00:00Z", updated_at:"2026-04-15T10:00:00Z", created_by:"Miguel" },
  { lead_id:"l4", lead_source:"manual", company_name:"Fintechx", contact_name:"Ana Rocha", email:"ana@fintechx.io", phone:"11 9666-0004", job_title:"CMO", bu:"JACQES", lead_score:85, status:"qualified", qualification_notes:"Quer escalar social media para campanha de lançamento", bant_budget:60000, bant_authority:true, bant_need:"high", bant_timeline:"2026-05-15", assigned_to:"Miguel", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-18T10:00:00Z", updated_at:"2026-04-20T10:00:00Z", created_by:"Miguel" },
  { lead_id:"l5", lead_source:"paid", company_name:"Construtora Viva", contact_name:"Pedro Andrade", email:"pedro@construtoraviva.com.br", phone:"31 9555-0005", job_title:"Gerente", bu:"CAZA", lead_score:30, status:"unqualified", qualification_notes:"Orçamento muito abaixo do escopo", bant_budget:5000, bant_authority:false, bant_need:"low", bant_timeline:null, assigned_to:"Danilo", converted_to_opportunity_id:null, converted_at:null, created_at:"2026-04-10T10:00:00Z", updated_at:"2026-04-14T10:00:00Z", created_by:"Danilo" },
];

export const SEED_OPPORTUNITIES: CrmOpportunity[] = [
  { opportunity_id:"o1", opportunity_code:"OPP-001", opportunity_name:"XP Q2 — Campanha Performance", account_id:"a1", account_name:"XP Investimentos", contact_id:"c1", contact_name:"João Silva", bu:"CAZA", stage:"discovery", deal_value:120000, probability:25, expected_close_date:"2026-06-30", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-01T10:00:00Z", updated_at:"2026-04-10T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o2", opportunity_code:"OPP-002", opportunity_name:"Nubank — Vídeo Institucional", account_id:"a2", account_name:"Nubank", contact_id:"c2", contact_name:"Carlos Mendes", bu:"CAZA", stage:"qualification", deal_value:85000, probability:40, expected_close_date:"2026-05-31", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Danilo", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-03T10:00:00Z", updated_at:"2026-04-12T10:00:00Z", created_by:"Danilo" },
  { opportunity_id:"o3", opportunity_code:"OPP-003", opportunity_name:"CEM — Produção Anual 2026", account_id:"a3", account_name:"Colégio CEM", contact_id:"c3", contact_name:"Fernanda Costa", bu:"CAZA", stage:"proposal", deal_value:35000, probability:60, expected_close_date:"2026-05-15", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:"2026-04-20", proposal_viewed:true, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-05T10:00:00Z", updated_at:"2026-04-20T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o4", opportunity_code:"OPP-004", opportunity_name:"Reabilicor — Consultoria Estratégica", account_id:"a4", account_name:"Reabilicor", contact_id:"c4", contact_name:"Dr. Roberto Silva", bu:"ADVISOR", stage:"negotiation", deal_value:95000, probability:75, expected_close_date:"2026-05-10", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Danilo", proposal_sent_date:"2026-04-10", proposal_viewed:true, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-02T10:00:00Z", updated_at:"2026-04-22T10:00:00Z", created_by:"Danilo" },
  { opportunity_id:"o5", opportunity_code:"OPP-005", opportunity_name:"Carol Bertolini — Pacote Social", account_id:"a6", account_name:"Carol Bertolini", contact_id:"c6", contact_name:"Carol Bertolini", bu:"JACQES", stage:"closed_won", deal_value:18000, probability:100, expected_close_date:"2026-04-15", actual_close_date:"2026-04-15", lost_reason:null, lost_to_competitor:null, win_reason:"Relationship,Price competitive", owner:"Miguel", proposal_sent_date:"2026-04-08", proposal_viewed:true, proposal_accepted:true, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-03-25T10:00:00Z", updated_at:"2026-04-15T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o6", opportunity_code:"OPP-006", opportunity_name:"Clínica Teresópolis — Estratégia Digital", account_id:"a5", account_name:"Clínica Teresópolis", contact_id:"c5", contact_name:"Dra. Aline Duarte", bu:"ADVISOR", stage:"closed_lost", deal_value:50000, probability:0, expected_close_date:"2026-04-20", actual_close_date:"2026-04-20", lost_reason:"Preço elevado", lost_to_competitor:null, win_reason:null, owner:"Danilo", proposal_sent_date:"2026-04-05", proposal_viewed:true, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-03-20T10:00:00Z", updated_at:"2026-04-20T10:00:00Z", created_by:"Danilo" },
  { opportunity_id:"o7", opportunity_code:"OPP-007", opportunity_name:"Fintechx — Social Media Growth", account_id:null, account_name:"Fintechx (Prospect)", contact_id:null, contact_name:null, bu:"JACQES", stage:"discovery", deal_value:60000, probability:25, expected_close_date:"2026-06-15", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-21T10:00:00Z", updated_at:"2026-04-21T10:00:00Z", created_by:"Miguel" },
  { opportunity_id:"o8", opportunity_code:"OPP-008", opportunity_name:"XP — Brand Refresh Q3", account_id:"a1", account_name:"XP Investimentos", contact_id:"c1", contact_name:"João Silva", bu:"CAZA", stage:"qualification", deal_value:45000, probability:40, expected_close_date:"2026-07-31", actual_close_date:null, lost_reason:null, lost_to_competitor:null, win_reason:null, owner:"Miguel", proposal_sent_date:null, proposal_viewed:false, proposal_accepted:false, synced_to_epm:false, epm_customer_id:null, epm_ar_id:null, created_at:"2026-04-22T10:00:00Z", updated_at:"2026-04-22T10:00:00Z", created_by:"Miguel" },
];

export const SEED_ACTIVITIES: CrmActivity[] = [
  { activity_id:"act1", activity_type:"call", related_to_type:"opportunity", related_to_id:"o1", related_name:"XP Q2 — Campanha Performance", subject:"Discovery call — XP Q2", description:"Entendimento inicial do escopo da campanha Q2", outcome:"successful", duration_minutes:45, scheduled_at:"2026-04-25T10:00:00Z", completed_at:"2026-04-25T10:45:00Z", status:"completed", created_by:"Miguel", created_at:"2026-04-25T10:00:00Z", updated_at:"2026-04-25T10:45:00Z" },
  { activity_id:"act2", activity_type:"meeting", related_to_type:"opportunity", related_to_id:"o2", related_name:"Nubank — Vídeo Institucional", subject:"Reunião de qualificação Nubank", description:"Demo do portfólio de produção audiovisual", outcome:"successful", duration_minutes:90, scheduled_at:"2026-04-27T14:00:00Z", completed_at:"2026-04-27T15:30:00Z", status:"completed", created_by:"Danilo", created_at:"2026-04-27T14:00:00Z", updated_at:"2026-04-27T15:30:00Z" },
  { activity_id:"act3", activity_type:"email", related_to_type:"opportunity", related_to_id:"o3", related_name:"CEM — Produção Anual 2026", subject:"Proposta enviada — CEM Produção Anual", description:"Proposta completa com cronograma e valores enviada por e-mail", outcome:"successful", duration_minutes:null, scheduled_at:"2026-04-20T09:00:00Z", completed_at:"2026-04-20T09:00:00Z", status:"completed", created_by:"Miguel", created_at:"2026-04-20T09:00:00Z", updated_at:"2026-04-20T09:00:00Z" },
  { activity_id:"act4", activity_type:"call", related_to_type:"opportunity", related_to_id:"o4", related_name:"Reabilicor — Consultoria Estratégica", subject:"Negociação comercial Reabilicor", description:"Discussão de condições de pagamento e detalhamento do escopo", outcome:"successful", duration_minutes:60, scheduled_at:"2026-04-29T11:00:00Z", completed_at:"2026-04-29T12:00:00Z", status:"completed", created_by:"Danilo", created_at:"2026-04-29T11:00:00Z", updated_at:"2026-04-29T12:00:00Z" },
  { activity_id:"act5", activity_type:"task", related_to_type:"lead", related_to_id:"l4", related_name:"Fintechx — Ana Rocha", subject:"Follow-up Fintechx — enviar cases JACQES", description:"Enviar material de cases e portfólio do JACQES para Ana Rocha", outcome:null, duration_minutes:null, scheduled_at:"2026-05-02T14:00:00Z", completed_at:null, status:"scheduled", created_by:"Miguel", created_at:"2026-04-28T10:00:00Z", updated_at:"2026-04-28T10:00:00Z" },
  { activity_id:"act6", activity_type:"task", related_to_type:"opportunity", related_to_id:"o2", related_name:"Nubank — Vídeo Institucional", subject:"Preparar proposta Nubank — prazo 3 dias", description:"Elaborar proposta detalhada incluindo cronograma de produção e orçamento", outcome:null, duration_minutes:null, scheduled_at:"2026-05-03T09:00:00Z", completed_at:null, status:"scheduled", created_by:"Danilo", created_at:"2026-04-28T08:00:00Z", updated_at:"2026-04-28T08:00:00Z" },
];

// ─── Account CRUD ─────────────────────────────────────────────────────────────

export async function listAccounts(filters?: { search?: string; account_type?: string; bu?: string; owner?: string }): Promise<CrmAccount[]> {
  if (!sql) {
    let rows = [...SEED_ACCOUNTS];
    if (filters?.account_type) rows = rows.filter(r => r.account_type === filters.account_type);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.account_name.toLowerCase().includes(s) || (r.trade_name ?? "").toLowerCase().includes(s));
    }
    return rows;
  }
  const rows = await sql`
    SELECT a.*,
      COUNT(DISTINCT o.opportunity_id) FILTER (WHERE o.stage NOT IN ('closed_won','closed_lost')) AS open_opportunities,
      MAX(act.created_at) AS last_activity_at
    FROM crm_accounts a
    LEFT JOIN crm_opportunities o   ON o.account_id = a.account_id
    LEFT JOIN crm_activities   act  ON act.related_to_type = 'account' AND act.related_to_id = a.account_id
    WHERE (${filters?.account_type ?? null}::text IS NULL OR a.account_type = ${filters?.account_type ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR a.bu = ${filters?.bu ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR a.owner = ${filters?.owner ?? null})
      AND (${filters?.search ?? null}::text IS NULL
           OR a.account_name ILIKE ${'%' + (filters?.search ?? '') + '%'}
           OR a.trade_name   ILIKE ${'%' + (filters?.search ?? '') + '%'})
    GROUP BY a.account_id
    ORDER BY a.account_name
  `;
  return rows as CrmAccount[];
}

export async function getAccount(id: string): Promise<CrmAccount | null> {
  if (!sql) return SEED_ACCOUNTS.find(a => a.account_id === id) ?? null;
  const rows = await sql`SELECT * FROM crm_accounts WHERE account_id = ${id}`;
  return (rows[0] as CrmAccount) ?? null;
}

export async function createAccount(data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_accounts (account_name, trade_name, document_number, industry, company_size,
      annual_revenue_estimate, website, linkedin_url, address_street, address_city, address_state,
      address_zip, account_type, owner, health_score, churn_risk, renewal_date, created_by)
    VALUES (${data.account_name!}, ${data.trade_name ?? null}, ${data.document_number ?? null},
      ${data.industry ?? null}, ${data.company_size ?? null}, ${data.annual_revenue_estimate ?? null},
      ${data.website ?? null}, ${data.linkedin_url ?? null}, ${data.address_street ?? null},
      ${data.address_city ?? null}, ${data.address_state ?? null}, ${data.address_zip ?? null},
      ${data.account_type ?? 'prospect'}, ${data.owner ?? 'Miguel'},
      ${data.health_score ?? 70}, ${data.churn_risk ?? 'low'}, ${data.renewal_date ?? null},
      ${data.created_by ?? null})
    RETURNING *
  `;
  return rows[0] as CrmAccount;
}

export async function updateAccount(id: string, data: Partial<CrmAccount>): Promise<CrmAccount> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_accounts SET
      account_name = COALESCE(${data.account_name ?? null}, account_name),
      trade_name   = COALESCE(${data.trade_name ?? null}, trade_name),
      industry     = COALESCE(${data.industry ?? null}, industry),
      company_size = COALESCE(${data.company_size ?? null}, company_size),
      account_type = COALESCE(${data.account_type ?? null}, account_type),
      owner        = COALESCE(${data.owner ?? null}, owner),
      health_score = COALESCE(${data.health_score ?? null}, health_score),
      churn_risk   = COALESCE(${data.churn_risk ?? null}, churn_risk),
      website      = COALESCE(${data.website ?? null}, website),
      address_city = COALESCE(${data.address_city ?? null}, address_city),
      address_state= COALESCE(${data.address_state ?? null}, address_state),
      renewal_date = COALESCE(${data.renewal_date ?? null}, renewal_date),
      updated_at   = NOW()
    WHERE account_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_accounts WHERE account_id = ${id}`;
}

// ─── Contact CRUD ─────────────────────────────────────────────────────────────

export async function listContacts(filters?: { account_id?: string; search?: string }): Promise<CrmContact[]> {
  if (!sql) {
    let rows = [...SEED_CONTACTS];
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.full_name.toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s));
    }
    return rows;
  }
  const rows = await sql`
    SELECT c.*, a.account_name FROM crm_contacts c
    LEFT JOIN crm_accounts a ON a.account_id = c.account_id
    WHERE (${filters?.account_id ?? null}::uuid IS NULL OR c.account_id = ${filters?.account_id ?? null}::uuid)
      AND (${filters?.search ?? null}::text IS NULL
           OR c.full_name ILIKE ${'%' + (filters?.search ?? '') + '%'}
           OR c.email     ILIKE ${'%' + (filters?.search ?? '') + '%'})
    ORDER BY c.full_name
  `;
  return rows as CrmContact[];
}

export async function createContact(data: Partial<CrmContact>): Promise<CrmContact> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_contacts (account_id, full_name, email, phone, mobile, job_title, department,
      seniority, linkedin_url, is_primary_contact, contact_preferences)
    VALUES (${data.account_id ?? null}, ${data.full_name!}, ${data.email ?? null},
      ${data.phone ?? null}, ${data.mobile ?? null}, ${data.job_title ?? null},
      ${data.department ?? null}, ${data.seniority ?? 'manager'}, ${data.linkedin_url ?? null},
      ${data.is_primary_contact ?? false}, ${data.contact_preferences ?? []})
    RETURNING *
  `;
  return rows[0] as CrmContact;
}

export async function deleteContact(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_contacts WHERE contact_id = ${id}`;
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

export async function listLeads(filters?: { status?: string; bu?: string; assigned_to?: string }): Promise<CrmLead[]> {
  if (!sql) {
    let rows = [...SEED_LEADS];
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.assigned_to) rows = rows.filter(r => r.assigned_to === filters.assigned_to);
    return rows;
  }
  const rows = await sql`
    SELECT * FROM crm_leads
    WHERE (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR bu = ${filters?.bu ?? null})
      AND (${filters?.assigned_to ?? null}::text IS NULL OR assigned_to = ${filters?.assigned_to ?? null})
    ORDER BY created_at DESC
  `;
  return rows as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  if (!sql) return SEED_LEADS.find(l => l.lead_id === id) ?? null;
  const rows = await sql`SELECT * FROM crm_leads WHERE lead_id = ${id}`;
  return (rows[0] as CrmLead) ?? null;
}

export async function createLead(data: Partial<CrmLead>): Promise<CrmLead> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_leads (lead_source, company_name, contact_name, email, phone, job_title,
      bu, lead_score, status, qualification_notes, bant_budget, bant_authority, bant_need,
      bant_timeline, assigned_to, created_by)
    VALUES (${data.lead_source ?? 'manual'}, ${data.company_name!}, ${data.contact_name!},
      ${data.email ?? null}, ${data.phone ?? null}, ${data.job_title ?? null},
      ${data.bu ?? 'JACQES'}, ${data.lead_score ?? 0}, ${data.status ?? 'new'},
      ${data.qualification_notes ?? null}, ${data.bant_budget ?? null},
      ${data.bant_authority ?? false}, ${data.bant_need ?? null}, ${data.bant_timeline ?? null},
      ${data.assigned_to ?? 'Miguel'}, ${data.created_by ?? null})
    RETURNING *
  `;
  return rows[0] as CrmLead;
}

export async function updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_leads SET
      status              = COALESCE(${data.status ?? null}, status),
      lead_score          = COALESCE(${data.lead_score ?? null}, lead_score),
      qualification_notes = COALESCE(${data.qualification_notes ?? null}, qualification_notes),
      bant_budget         = COALESCE(${data.bant_budget ?? null}, bant_budget),
      bant_authority      = COALESCE(${data.bant_authority ?? null}, bant_authority),
      bant_need           = COALESCE(${data.bant_need ?? null}, bant_need),
      bant_timeline       = COALESCE(${data.bant_timeline ?? null}, bant_timeline),
      assigned_to         = COALESCE(${data.assigned_to ?? null}, assigned_to),
      updated_at          = NOW()
    WHERE lead_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmLead;
}

export async function deleteLead(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_leads WHERE lead_id = ${id}`;
}

export async function getContact(id: string): Promise<CrmContact | null> {
  if (!sql) return SEED_CONTACTS.find(c => c.contact_id === id) ?? null;
  const rows = await sql`
    SELECT c.*, a.account_name FROM crm_contacts c
    LEFT JOIN crm_accounts a ON a.account_id = c.account_id
    WHERE c.contact_id = ${id}
  `;
  return (rows[0] as CrmContact) ?? null;
}

export async function convertLead(leadId: string, oppData: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) {
    const newOpp: CrmOpportunity = {
      opportunity_id: `opp-${leadId}-${Date.now()}`,
      opportunity_code: `OPP-${String(SEED_OPPORTUNITIES.length + 1).padStart(3, "0")}`,
      opportunity_name: oppData.opportunity_name ?? "Nova Oportunidade",
      account_id: null, account_name: undefined, contact_id: null, contact_name: null,
      bu: oppData.bu ?? "JACQES",
      stage: "discovery", deal_value: oppData.deal_value ?? 0, probability: 25,
      expected_close_date: null, actual_close_date: null,
      lost_reason: null, lost_to_competitor: null, win_reason: null,
      owner: oppData.owner ?? "Miguel",
      proposal_sent_date: null, proposal_viewed: false, proposal_accepted: false,
      synced_to_epm: false, epm_customer_id: null, epm_ar_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      created_by: oppData.owner ?? "Miguel",
    };
    return newOpp;
  }
  const opp = await sql`
    INSERT INTO crm_opportunities (opportunity_name, bu, stage, deal_value, probability,
      expected_close_date, owner, created_by)
    VALUES (${oppData.opportunity_name!}, ${oppData.bu ?? 'JACQES'}, 'discovery',
      ${oppData.deal_value ?? 0}, 25, ${oppData.expected_close_date ?? null},
      ${oppData.owner ?? 'Miguel'}, ${oppData.owner ?? 'Miguel'})
    RETURNING *
  `;
  await sql`
    UPDATE crm_leads SET
      status = 'converted',
      converted_to_opportunity_id = ${opp[0].opportunity_id},
      converted_at = NOW(),
      updated_at   = NOW()
    WHERE lead_id = ${leadId}
  `;
  return opp[0] as CrmOpportunity;
}

// ─── Opportunity CRUD ─────────────────────────────────────────────────────────

export async function listOpportunities(filters?: { stage?: string; bu?: string; owner?: string; account_id?: string }): Promise<CrmOpportunity[]> {
  if (!sql) {
    let rows = [...SEED_OPPORTUNITIES];
    if (filters?.stage) rows = rows.filter(r => r.stage === filters.stage);
    if (filters?.bu) rows = rows.filter(r => r.bu === filters.bu);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    if (filters?.account_id) rows = rows.filter(r => r.account_id === filters.account_id);
    return rows;
  }
  const rows = await sql`
    SELECT o.*, a.account_name,
      CONCAT(c.full_name) AS contact_name
    FROM crm_opportunities o
    LEFT JOIN crm_accounts a ON a.account_id = o.account_id
    LEFT JOIN crm_contacts c ON c.contact_id = o.contact_id
    WHERE (${filters?.stage ?? null}::text IS NULL OR o.stage = ${filters?.stage ?? null})
      AND (${filters?.bu ?? null}::text IS NULL OR o.bu = ${filters?.bu ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR o.owner = ${filters?.owner ?? null})
      AND (${filters?.account_id ?? null}::uuid IS NULL OR o.account_id = ${filters?.account_id ?? null}::uuid)
    ORDER BY o.created_at DESC
  `;
  return rows as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  if (!sql) return SEED_OPPORTUNITIES.find(o => o.opportunity_id === id) ?? null;
  const rows = await sql`
    SELECT o.*, a.account_name, c.full_name AS contact_name
    FROM crm_opportunities o
    LEFT JOIN crm_accounts a ON a.account_id = o.account_id
    LEFT JOIN crm_contacts c ON c.contact_id = o.contact_id
    WHERE o.opportunity_id = ${id}
  `;
  return (rows[0] as CrmOpportunity) ?? null;
}

export async function createOpportunity(data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_opportunities (opportunity_name, account_id, contact_id, bu, stage,
      deal_value, expected_close_date, owner, proposal_sent_date, created_by)
    VALUES (${data.opportunity_name!}, ${data.account_id ?? null}, ${data.contact_id ?? null},
      ${data.bu!}, ${data.stage ?? 'discovery'}, ${data.deal_value ?? 0},
      ${data.expected_close_date ?? null}, ${data.owner ?? 'Miguel'},
      ${data.proposal_sent_date ?? null}, ${data.owner ?? 'Miguel'})
    RETURNING *
  `;
  return rows[0] as CrmOpportunity;
}

export async function updateOpportunity(id: string, data: Partial<CrmOpportunity>): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    UPDATE crm_opportunities SET
      stage               = COALESCE(${data.stage ?? null}, stage),
      deal_value          = COALESCE(${data.deal_value ?? null}, deal_value),
      expected_close_date = COALESCE(${data.expected_close_date ?? null}, expected_close_date),
      lost_reason         = COALESCE(${data.lost_reason ?? null}, lost_reason),
      win_reason          = COALESCE(${data.win_reason ?? null}, win_reason),
      owner               = COALESCE(${data.owner ?? null}, owner),
      proposal_sent_date  = COALESCE(${data.proposal_sent_date ?? null}, proposal_sent_date),
      synced_to_epm       = COALESCE(${data.synced_to_epm ?? null}, synced_to_epm),
      updated_at          = NOW()
    WHERE opportunity_id = ${id}
    RETURNING *
  `;
  return rows[0] as CrmOpportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM crm_opportunities WHERE opportunity_id = ${id}`;
}

// ─── Activity CRUD ────────────────────────────────────────────────────────────

export async function listActivities(filters?: { related_to_type?: string; related_to_id?: string; created_by?: string }): Promise<CrmActivity[]> {
  if (!sql) {
    let rows = [...SEED_ACTIVITIES];
    if (filters?.related_to_type) rows = rows.filter(r => r.related_to_type === filters.related_to_type);
    if (filters?.related_to_id)   rows = rows.filter(r => r.related_to_id === filters.related_to_id);
    if (filters?.created_by)      rows = rows.filter(r => r.created_by === filters.created_by);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const rows = await sql`
    SELECT * FROM crm_activities
    WHERE (${filters?.related_to_type ?? null}::text IS NULL OR related_to_type = ${filters?.related_to_type ?? null})
      AND (${filters?.related_to_id ?? null}::uuid IS NULL OR related_to_id = ${filters?.related_to_id ?? null}::uuid)
      AND (${filters?.created_by ?? null}::text IS NULL OR created_by = ${filters?.created_by ?? null})
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows as CrmActivity[];
}

export async function createActivity(data: Partial<CrmActivity>): Promise<CrmActivity> {
  if (!sql) throw new Error("DB not available");
  const rows = await sql`
    INSERT INTO crm_activities (activity_type, related_to_type, related_to_id, subject,
      description, outcome, duration_minutes, scheduled_at, status, created_by)
    VALUES (${data.activity_type!}, ${data.related_to_type!}, ${data.related_to_id!},
      ${data.subject!}, ${data.description ?? null}, ${data.outcome ?? null},
      ${data.duration_minutes ?? null}, ${data.scheduled_at ?? null},
      ${data.status ?? 'scheduled'}, ${data.created_by ?? 'Miguel'})
    RETURNING *
  `;
  return rows[0] as CrmActivity;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPipelineMetrics(): Promise<CrmPipelineMetrics> {
  const opps = await listOpportunities();
  const open = opps.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
  const stages = ['discovery','qualification','proposal','negotiation'];
  const byStage: CrmPipelineMetrics['byStage'] = {};
  for (const stage of stages) {
    const s = open.filter(o => o.stage === stage);
    byStage[stage] = {
      count: s.length,
      value: s.reduce((sum, o) => sum + o.deal_value, 0),
      weighted: s.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    };
  }
  return {
    byStage,
    totalPipeline: open.reduce((sum, o) => sum + o.deal_value, 0),
    weightedForecast: open.reduce((sum, o) => sum + o.deal_value * o.probability / 100, 0),
    openDeals: open.length,
  };
}

export async function getDashboardMetrics(): Promise<CrmDashboardMetrics> {
  const [leads, opps, activities] = await Promise.all([
    listLeads(),
    listOpportunities(),
    listActivities(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const open = opps.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
  const wonThisMonth = opps.filter(o => o.stage === 'closed_won' && (o.actual_close_date ?? '') >= monthStart);
  const closedAll = opps.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost');
  const tasksToday = activities.filter(a => a.status === 'scheduled' && a.scheduled_at && a.scheduled_at.slice(0, 10) === today);
  return {
    leadsNew: leads.filter(l => l.status === 'new').length,
    openOpportunities: open.length,
    pipelineValue: open.reduce((s, o) => s + o.deal_value, 0),
    weightedForecast: open.reduce((s, o) => s + o.deal_value * o.probability / 100, 0),
    closedWonThisMonth: wonThisMonth.length,
    revenueThisMonth: wonThisMonth.reduce((s, o) => s + o.deal_value, 0),
    winRate: closedAll.length > 0 ? Math.round(opps.filter(o => o.stage === 'closed_won').length / closedAll.length * 100) : 0,
    tasksToday,
  };
}
