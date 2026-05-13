-- ─── JACQES CRM — Full Schema ─────────────────────────────────────────────────
-- Standalone schema: no FK references to other modules.

SET client_min_messages = WARNING;

-- ─── jacqes_crm_leads ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_leads (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome              TEXT NOT NULL,
  empresa           TEXT NOT NULL DEFAULT '',
  contato_principal TEXT NOT NULL DEFAULT '',
  telefone          TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  origem            TEXT NOT NULL DEFAULT 'Indicação',
  segmento          TEXT NOT NULL DEFAULT '',
  canal             TEXT NOT NULL DEFAULT '',
  interesse         TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'Novo',
  owner             TEXT NOT NULL DEFAULT '',
  data_entrada      DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_leads_status  ON jacqes_crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_jcrm_leads_created ON jacqes_crm_leads(created_at DESC);

-- ─── jacqes_crm_opportunities ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_opportunities (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id                  TEXT,
  cliente_id               TEXT,
  nome_oportunidade        TEXT NOT NULL,
  empresa                  TEXT NOT NULL DEFAULT '',
  segmento                 TEXT NOT NULL DEFAULT '',
  produto                  TEXT NOT NULL DEFAULT '',
  ticket_estimado          NUMERIC NOT NULL DEFAULT 0,
  valor_potencial          NUMERIC NOT NULL DEFAULT 0,
  stage                    TEXT NOT NULL DEFAULT 'Novo Lead',
  probabilidade            INTEGER NOT NULL DEFAULT 20,
  owner                    TEXT NOT NULL DEFAULT '',
  data_abertura            DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima_acao             TEXT NOT NULL DEFAULT '',
  data_proxima_acao        DATE,
  risco                    TEXT NOT NULL DEFAULT 'Baixo',
  motivo_perda             TEXT NOT NULL DEFAULT '',
  data_fechamento_prevista DATE,
  observacoes              TEXT NOT NULL DEFAULT '',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_opps_stage   ON jacqes_crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_jcrm_opps_created ON jacqes_crm_opportunities(created_at DESC);

-- ─── jacqes_crm_proposals ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_proposals (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  opportunity_id TEXT,
  versao         INTEGER NOT NULL DEFAULT 1,
  valor_proposto NUMERIC NOT NULL DEFAULT 0,
  escopo         TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Rascunho',
  data_envio     DATE,
  data_resposta  DATE,
  contraproposta NUMERIC,
  observacoes    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_props_opp ON jacqes_crm_proposals(opportunity_id);

-- ─── jacqes_crm_clients ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_clients (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome               TEXT NOT NULL,
  razao_social       TEXT NOT NULL DEFAULT '',
  cnpj               TEXT NOT NULL DEFAULT '',
  segmento           TEXT NOT NULL DEFAULT '',
  produto_ativo      TEXT NOT NULL DEFAULT '',
  ticket_mensal      NUMERIC NOT NULL DEFAULT 0,
  inicio_relacao     DATE,
  owner              TEXT NOT NULL DEFAULT '',
  status_conta       TEXT NOT NULL DEFAULT 'Ativo',
  health_score       INTEGER NOT NULL DEFAULT 80,
  churn_risk         TEXT NOT NULL DEFAULT 'Baixo',
  potencial_expansao NUMERIC NOT NULL DEFAULT 0,
  observacoes        TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_clients_status ON jacqes_crm_clients(status_conta);

-- ─── jacqes_crm_interactions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_interactions (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id           TEXT,
  opportunity_id       TEXT,
  lead_id              TEXT,
  tipo                 TEXT NOT NULL DEFAULT 'Ligação',
  canal                TEXT NOT NULL DEFAULT '',
  data                 DATE NOT NULL DEFAULT CURRENT_DATE,
  resumo               TEXT NOT NULL DEFAULT '',
  proximo_passo        TEXT NOT NULL DEFAULT '',
  responsavel          TEXT NOT NULL DEFAULT '',
  satisfacao_percebida TEXT NOT NULL DEFAULT 'Neutro',
  risco_percebido      TEXT NOT NULL DEFAULT 'Baixo',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_int_cliente   ON jacqes_crm_interactions(cliente_id);
CREATE INDEX IF NOT EXISTS idx_jcrm_int_data      ON jacqes_crm_interactions(data DESC);

-- ─── jacqes_crm_tasks ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_tasks (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id     TEXT,
  opportunity_id TEXT,
  lead_id        TEXT,
  titulo         TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT 'Follow-up',
  prioridade     TEXT NOT NULL DEFAULT 'Média',
  status         TEXT NOT NULL DEFAULT 'Aberta',
  responsavel    TEXT NOT NULL DEFAULT '',
  data_criacao   DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo          DATE,
  sla_horas      INTEGER NOT NULL DEFAULT 24,
  data_conclusao DATE,
  bloqueio       TEXT NOT NULL DEFAULT '',
  retrabalho     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_tasks_status ON jacqes_crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_jcrm_tasks_prazo  ON jacqes_crm_tasks(prazo ASC NULLS LAST);

-- ─── jacqes_crm_visits ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_visits (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id    TEXT,
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  objetivo      TEXT NOT NULL DEFAULT '',
  resultado     TEXT NOT NULL DEFAULT '',
  proximo_passo TEXT NOT NULL DEFAULT '',
  responsavel   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_visits_cliente ON jacqes_crm_visits(cliente_id);

-- ─── jacqes_crm_expansion ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_expansion (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id      TEXT,
  tipo            TEXT NOT NULL DEFAULT 'Upsell',
  valor_potencial NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'Identificada',
  owner           TEXT NOT NULL DEFAULT '',
  proxima_acao    TEXT NOT NULL DEFAULT '',
  observacoes     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_expansion_cliente ON jacqes_crm_expansion(cliente_id);

-- ─── jacqes_crm_health_snapshot ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_health_snapshot (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id       TEXT,
  periodo          TEXT NOT NULL DEFAULT '',
  health_score     INTEGER NOT NULL DEFAULT 80,
  churn_risk       TEXT NOT NULL DEFAULT 'Baixo',
  ultima_interacao DATE,
  followups_em_dia BOOLEAN NOT NULL DEFAULT TRUE,
  pendencias       INTEGER NOT NULL DEFAULT 0,
  expansao_aberta  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcrm_health_cliente ON jacqes_crm_health_snapshot(cliente_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE jacqes_crm_leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_opportunities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_proposals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_interactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_visits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_expansion       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jacqes_crm_health_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_jcrm_leads"           ON jacqes_crm_leads;
CREATE POLICY "allow_all_jcrm_leads"           ON jacqes_crm_leads           FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_opps"            ON jacqes_crm_opportunities;
CREATE POLICY "allow_all_jcrm_opps"            ON jacqes_crm_opportunities   FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_proposals"       ON jacqes_crm_proposals;
CREATE POLICY "allow_all_jcrm_proposals"       ON jacqes_crm_proposals       FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_clients"         ON jacqes_crm_clients;
CREATE POLICY "allow_all_jcrm_clients"         ON jacqes_crm_clients         FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_interactions"    ON jacqes_crm_interactions;
CREATE POLICY "allow_all_jcrm_interactions"    ON jacqes_crm_interactions    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_tasks"           ON jacqes_crm_tasks;
CREATE POLICY "allow_all_jcrm_tasks"           ON jacqes_crm_tasks           FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_visits"          ON jacqes_crm_visits;
CREATE POLICY "allow_all_jcrm_visits"          ON jacqes_crm_visits          FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_expansion"       ON jacqes_crm_expansion;
CREATE POLICY "allow_all_jcrm_expansion"       ON jacqes_crm_expansion       FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_jcrm_health"          ON jacqes_crm_health_snapshot;
CREATE POLICY "allow_all_jcrm_health"          ON jacqes_crm_health_snapshot FOR ALL USING (true) WITH CHECK (true);
