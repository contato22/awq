-- ─── Caza Vision CRM — Full Schema ───────────────────────────────────────────
-- Standalone schema: no FK references to other modules.

SET client_min_messages = WARNING;

-- ─── caza_crm_leads ───────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_caza_crm_leads_status  ON caza_crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_caza_crm_leads_created ON caza_crm_leads(created_at DESC);

-- ─── caza_crm_opportunities ───────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_caza_crm_opps_stage   ON caza_crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_caza_crm_opps_created ON caza_crm_opportunities(created_at DESC);

-- ─── caza_crm_proposals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_crm_proposals (
  id             TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL DEFAULT '',
  versao         INTEGER NOT NULL DEFAULT 1,
  valor_proposto NUMERIC NOT NULL DEFAULT 0,
  escopo         TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Em Elaboração',
  data_envio     TEXT,
  data_resposta  TEXT,
  observacoes    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caza_crm_props_opp ON caza_crm_proposals(opportunity_id);

-- ─── caza_crm_interactions ────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_caza_crm_int_entidade ON caza_crm_interactions(entidade_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE caza_crm_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_proposals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_crm_interactions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_caza_crm_leads"         ON caza_crm_leads;
CREATE POLICY "allow_all_caza_crm_leads"         ON caza_crm_leads         FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_caza_crm_opps"          ON caza_crm_opportunities;
CREATE POLICY "allow_all_caza_crm_opps"          ON caza_crm_opportunities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_caza_crm_proposals"     ON caza_crm_proposals;
CREATE POLICY "allow_all_caza_crm_proposals"     ON caza_crm_proposals     FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_caza_crm_interactions"  ON caza_crm_interactions;
CREATE POLICY "allow_all_caza_crm_interactions"  ON caza_crm_interactions  FOR ALL USING (true) WITH CHECK (true);
