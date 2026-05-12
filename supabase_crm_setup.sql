-- =============================================================================
-- AWQ CRM — Supabase Setup Script
-- =============================================================================
-- Execute este arquivo no SQL Editor do Supabase (supabase.com → SQL Editor).
-- Inclui: todas as tabelas CRM + políticas RLS para acesso com anon key.
-- =============================================================================

-- ─── Tabelas AWQ CRM (unified) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_accounts (
  account_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name            TEXT NOT NULL,
  trade_name              TEXT,
  document_number         TEXT,
  industry                TEXT,
  company_size            TEXT,
  annual_revenue_estimate NUMERIC,
  website                 TEXT,
  linkedin_url            TEXT,
  address_street          TEXT,
  address_city            TEXT,
  address_state           TEXT,
  address_zip             TEXT,
  account_type            TEXT NOT NULL DEFAULT 'prospect',
  owner                   TEXT NOT NULL DEFAULT 'Miguel',
  health_score            INTEGER DEFAULT 70,
  churn_risk              TEXT DEFAULT 'low',
  renewal_date            DATE,
  created_by              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  contact_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID REFERENCES crm_accounts(account_id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  mobile              TEXT,
  job_title           TEXT,
  department          TEXT,
  seniority           TEXT DEFAULT 'manager',
  linkedin_url        TEXT,
  is_primary_contact  BOOLEAN DEFAULT FALSE,
  contact_preferences TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_leads (
  lead_id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_source                 TEXT DEFAULT 'manual',
  company_name                TEXT NOT NULL,
  contact_name                TEXT NOT NULL,
  email                       TEXT,
  phone                       TEXT,
  job_title                   TEXT,
  bu                          TEXT NOT NULL DEFAULT 'JACQES',
  lead_score                  INTEGER DEFAULT 0,
  status                      TEXT NOT NULL DEFAULT 'new',
  qualification_notes         TEXT,
  bant_budget                 NUMERIC,
  bant_authority              BOOLEAN DEFAULT FALSE,
  bant_need                   TEXT,
  bant_timeline               DATE,
  assigned_to                 TEXT DEFAULT 'Miguel',
  converted_to_opportunity_id UUID,
  converted_at                TIMESTAMPTZ,
  created_by                  TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_opportunities (
  opportunity_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_code    TEXT UNIQUE GENERATED ALWAYS AS ('OPP-' || LPAD(CAST(nextval('crm_opp_seq') AS TEXT), 4, '0')) STORED,
  opportunity_name    TEXT NOT NULL,
  account_id          UUID REFERENCES crm_accounts(account_id) ON DELETE SET NULL,
  contact_id          UUID REFERENCES crm_contacts(contact_id) ON DELETE SET NULL,
  bu                  TEXT NOT NULL DEFAULT 'JACQES',
  stage               TEXT NOT NULL DEFAULT 'discovery',
  deal_value          NUMERIC NOT NULL DEFAULT 0,
  probability         INTEGER DEFAULT 25,
  expected_close_date DATE,
  actual_close_date   DATE,
  lost_reason         TEXT,
  lost_to_competitor  TEXT,
  win_reason          TEXT,
  owner               TEXT NOT NULL DEFAULT 'Miguel',
  proposal_sent_date  DATE,
  proposal_viewed     BOOLEAN DEFAULT FALSE,
  proposal_accepted   BOOLEAN DEFAULT FALSE,
  synced_to_epm       BOOLEAN DEFAULT FALSE,
  epm_customer_id     TEXT,
  epm_ar_id           TEXT,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequência para opportunity_code (cria se não existir)
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS crm_opp_seq START 1;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recria a coluna gerada sem a sequência (compatível com Supabase)
ALTER TABLE crm_opportunities
  DROP COLUMN IF EXISTS opportunity_code;
ALTER TABLE crm_opportunities
  ADD COLUMN IF NOT EXISTS opportunity_code TEXT;

CREATE TABLE IF NOT EXISTS crm_activities (
  activity_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type    TEXT NOT NULL,
  related_to_type  TEXT NOT NULL,
  related_to_id    UUID,
  subject          TEXT NOT NULL,
  description      TEXT,
  outcome          TEXT,
  duration_minutes INTEGER,
  scheduled_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  created_by       TEXT NOT NULL DEFAULT 'Miguel',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabelas JACQES CRM ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_leads (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome              TEXT NOT NULL,
  empresa           TEXT DEFAULT '',
  contato_principal TEXT DEFAULT '',
  telefone          TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  origem            TEXT DEFAULT 'Indicação',
  segmento          TEXT DEFAULT '',
  canal             TEXT DEFAULT '',
  interesse         TEXT DEFAULT '',
  status            TEXT DEFAULT 'Novo',
  owner             TEXT DEFAULT '',
  data_entrada      DATE DEFAULT CURRENT_DATE,
  observacoes       TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_opportunities (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id                  TEXT,
  cliente_id               TEXT,
  nome_oportunidade        TEXT NOT NULL,
  empresa                  TEXT DEFAULT '',
  segmento                 TEXT DEFAULT '',
  produto                  TEXT DEFAULT '',
  ticket_estimado          NUMERIC DEFAULT 0,
  valor_potencial          NUMERIC DEFAULT 0,
  stage                    TEXT DEFAULT 'Novo Lead',
  probabilidade            INTEGER DEFAULT 20,
  owner                    TEXT DEFAULT '',
  data_abertura            DATE DEFAULT CURRENT_DATE,
  proxima_acao             TEXT DEFAULT '',
  data_proxima_acao        DATE,
  risco                    TEXT DEFAULT 'Baixo',
  motivo_perda             TEXT DEFAULT '',
  data_fechamento_prevista DATE,
  observacoes              TEXT DEFAULT '',
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_proposals (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  opportunity_id TEXT,
  versao         INTEGER DEFAULT 1,
  valor_proposto NUMERIC DEFAULT 0,
  escopo         TEXT DEFAULT '',
  status         TEXT DEFAULT 'Rascunho',
  data_envio     DATE,
  data_resposta  DATE,
  contraproposta NUMERIC,
  observacoes    TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_clients (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome               TEXT NOT NULL,
  razao_social       TEXT DEFAULT '',
  cnpj               TEXT DEFAULT '',
  segmento           TEXT DEFAULT '',
  produto_ativo      TEXT DEFAULT '',
  ticket_mensal      NUMERIC DEFAULT 0,
  inicio_relacao     DATE,
  owner              TEXT DEFAULT '',
  status_conta       TEXT DEFAULT 'Ativo',
  health_score       INTEGER DEFAULT 80,
  churn_risk         TEXT DEFAULT 'Baixo',
  potencial_expansao NUMERIC DEFAULT 0,
  observacoes        TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_interactions (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id           TEXT,
  opportunity_id       TEXT,
  lead_id              TEXT,
  tipo                 TEXT DEFAULT 'Ligação',
  canal                TEXT DEFAULT '',
  data                 DATE DEFAULT CURRENT_DATE,
  resumo               TEXT DEFAULT '',
  proximo_passo        TEXT DEFAULT '',
  responsavel          TEXT DEFAULT '',
  satisfacao_percebida TEXT DEFAULT 'Neutro',
  risco_percebido      TEXT DEFAULT 'Baixo',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_tasks (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id     TEXT,
  opportunity_id TEXT,
  lead_id        TEXT,
  titulo         TEXT NOT NULL,
  categoria      TEXT DEFAULT 'Follow-up',
  prioridade     TEXT DEFAULT 'Média',
  status         TEXT DEFAULT 'Aberta',
  responsavel    TEXT DEFAULT '',
  data_criacao   DATE DEFAULT CURRENT_DATE,
  prazo          DATE,
  sla_horas      INTEGER DEFAULT 24,
  data_conclusao DATE,
  bloqueio       TEXT DEFAULT '',
  retrabalho     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_visits (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id    TEXT,
  data          DATE DEFAULT CURRENT_DATE,
  objetivo      TEXT DEFAULT '',
  resultado     TEXT DEFAULT '',
  proximo_passo TEXT DEFAULT '',
  responsavel   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_expansion (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id      TEXT,
  tipo            TEXT DEFAULT 'Upsell',
  valor_potencial NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'Identificada',
  owner           TEXT DEFAULT '',
  proxima_acao    TEXT DEFAULT '',
  observacoes     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jacqes_crm_health_snapshot (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id        TEXT,
  periodo           TEXT DEFAULT '',
  health_score      INTEGER DEFAULT 80,
  churn_risk        TEXT DEFAULT 'Baixo',
  ultima_interacao  DATE,
  followups_em_dia  BOOLEAN DEFAULT TRUE,
  pendencias        INTEGER DEFAULT 0,
  expansao_aberta   BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabelas CAZA CRM ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_crm_leads (
  id                TEXT PRIMARY KEY,
  nome              TEXT NOT NULL DEFAULT '',
  cargo             TEXT NOT NULL DEFAULT '',
  empresa           TEXT NOT NULL DEFAULT '',
  cnpj              TEXT NOT NULL DEFAULT '',
  contato_principal TEXT NOT NULL DEFAULT '',
  telefone          TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  origem            TEXT NOT NULL DEFAULT '',
  tipo_servico      TEXT NOT NULL DEFAULT '',
  interesse         TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'Novo',
  owner             TEXT NOT NULL DEFAULT '',
  data_entrada      TEXT NOT NULL DEFAULT '',
  observacoes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caza_crm_opportunities (
  id                TEXT PRIMARY KEY,
  lead_id           TEXT,
  nome_oportunidade TEXT NOT NULL DEFAULT '',
  empresa           TEXT NOT NULL DEFAULT '',
  tipo_servico      TEXT NOT NULL DEFAULT '',
  valor_estimado    NUMERIC NOT NULL DEFAULT 0,
  stage             TEXT NOT NULL DEFAULT 'Lead Captado',
  probabilidade     NUMERIC NOT NULL DEFAULT 0,
  owner             TEXT NOT NULL DEFAULT '',
  data_abertura     TEXT NOT NULL DEFAULT '',
  prazo_estimado    TEXT,
  proxima_acao      TEXT NOT NULL DEFAULT '',
  data_proxima_acao TEXT,
  risco             TEXT NOT NULL DEFAULT 'Baixo',
  motivo_perda      TEXT NOT NULL DEFAULT '',
  observacoes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caza_crm_proposals (
  id              TEXT PRIMARY KEY,
  opportunity_id  TEXT NOT NULL DEFAULT '',
  versao          INTEGER NOT NULL DEFAULT 1,
  valor_proposto  NUMERIC NOT NULL DEFAULT 0,
  escopo          TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'Em Elaboração',
  data_envio      TEXT,
  data_resposta   TEXT,
  observacoes     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caza_crm_interactions (
  id            TEXT PRIMARY KEY,
  entidade_tipo TEXT NOT NULL DEFAULT '',
  entidade_id   TEXT NOT NULL DEFAULT '',
  tipo          TEXT NOT NULL DEFAULT '',
  descricao     TEXT NOT NULL DEFAULT '',
  owner         TEXT NOT NULL DEFAULT '',
  data          TEXT NOT NULL DEFAULT '',
  observacoes   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_crm_leads_bu         ON crm_leads(bu);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status     ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created    ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_opps_stage       ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opps_bu          ON crm_opportunities(bu);
CREATE INDEX IF NOT EXISTS idx_crm_opps_created     ON crm_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_rel   ON crm_activities(related_to_id);
CREATE INDEX IF NOT EXISTS idx_caza_leads_status    ON caza_crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_caza_opps_stage      ON caza_crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_jacqes_leads_status  ON jacqes_crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_jacqes_tasks_prazo   ON jacqes_crm_tasks(prazo);

-- ─── Row Level Security (RLS) ────────────────────────────────────────────────
-- Habilita leitura e escrita para a chave anon (uso interno).
-- Para produção com múltiplos usuários, substitua por políticas baseadas em auth.uid().

ALTER TABLE crm_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_proposals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_expansion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_health_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_proposals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas: anon pode fazer SELECT, INSERT, UPDATE, DELETE em todas as tabelas CRM
DO $$ DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'crm_accounts','crm_contacts','crm_leads','crm_opportunities','crm_activities',
    'jacqes_crm_leads','jacqes_crm_opportunities','jacqes_crm_proposals',
    'jacqes_crm_clients','jacqes_crm_interactions','jacqes_crm_tasks',
    'jacqes_crm_visits','jacqes_crm_expansion','jacqes_crm_health_snapshot',
    'caza_crm_leads','caza_crm_opportunities','caza_crm_proposals','caza_crm_interactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS crm_anon_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS crm_anon_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS crm_anon_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS crm_anon_delete ON %I', tbl);
    EXECUTE format('CREATE POLICY crm_anon_select ON %I FOR SELECT TO anon USING (true)', tbl);
    EXECUTE format('CREATE POLICY crm_anon_insert ON %I FOR INSERT TO anon WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY crm_anon_update ON %I FOR UPDATE TO anon USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY crm_anon_delete ON %I FOR DELETE TO anon USING (true)', tbl);
  END LOOP;
END $$;

-- =============================================================================
-- Setup concluído. Copie as variáveis de ambiente do projeto Supabase:
--   Project Settings → API → URL e anon public key
-- =============================================================================
