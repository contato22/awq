-- ─── Caza Vision CRM — Schema completo ───────────────────────────────────────
-- 4 tabelas: caza_crm_leads, caza_crm_opportunities, caza_crm_proposals,
--            caza_crm_interactions
-- Idempotente — seguro rodar múltiplas vezes.

-- ─── 1. caza_crm_leads ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_crm_leads (
  id                TEXT PRIMARY KEY,
  nome              TEXT NOT NULL DEFAULT '',
  cargo             TEXT NOT NULL DEFAULT '',
  empresa           TEXT NOT NULL DEFAULT '',
  cnpj              TEXT NOT NULL DEFAULT '',
  contato_principal TEXT NOT NULL DEFAULT '',
  telefone          TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  origem            TEXT NOT NULL DEFAULT 'Indicação',
  tipo_servico      TEXT NOT NULL DEFAULT '',
  interesse         TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'Novo',
  owner             TEXT NOT NULL DEFAULT '',
  data_entrada      TEXT NOT NULL DEFAULT CURRENT_DATE::text,
  observacoes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caza_leads_status ON caza_crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_caza_leads_owner  ON caza_crm_leads(owner);

-- ─── 2. caza_crm_opportunities ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_crm_opportunities (
  id                  TEXT PRIMARY KEY,
  lead_id             TEXT REFERENCES caza_crm_leads(id) ON DELETE SET NULL,
  nome_oportunidade   TEXT NOT NULL DEFAULT '',
  empresa             TEXT NOT NULL DEFAULT '',
  tipo_servico        TEXT NOT NULL DEFAULT '',
  valor_estimado      NUMERIC NOT NULL DEFAULT 0,
  stage               TEXT NOT NULL DEFAULT 'Lead Captado',
  probabilidade       INTEGER NOT NULL DEFAULT 20,
  owner               TEXT NOT NULL DEFAULT '',
  data_abertura       TEXT NOT NULL DEFAULT CURRENT_DATE::text,
  prazo_estimado      TEXT,
  proxima_acao        TEXT NOT NULL DEFAULT '',
  data_proxima_acao   TEXT,
  risco               TEXT NOT NULL DEFAULT 'Baixo',
  motivo_perda        TEXT NOT NULL DEFAULT '',
  observacoes         TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caza_opp_stage   ON caza_crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_caza_opp_owner   ON caza_crm_opportunities(owner);
CREATE INDEX IF NOT EXISTS idx_caza_opp_lead_id ON caza_crm_opportunities(lead_id);

-- ─── 3. caza_crm_proposals ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_crm_proposals (
  id              TEXT PRIMARY KEY,
  opportunity_id  TEXT NOT NULL REFERENCES caza_crm_opportunities(id) ON DELETE CASCADE,
  versao          INTEGER NOT NULL DEFAULT 1,
  valor_proposto  NUMERIC NOT NULL DEFAULT 0,
  escopo          TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'Em Elaboração',
  data_envio      TEXT,
  data_resposta   TEXT,
  observacoes     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caza_prop_opp ON caza_crm_proposals(opportunity_id);

-- ─── 4. caza_crm_interactions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_crm_interactions (
  id            TEXT PRIMARY KEY,
  entidade_tipo TEXT NOT NULL DEFAULT '',
  entidade_id   TEXT NOT NULL DEFAULT '',
  tipo          TEXT NOT NULL DEFAULT 'Ligação',
  descricao     TEXT NOT NULL DEFAULT '',
  owner         TEXT NOT NULL DEFAULT '',
  data          TEXT NOT NULL DEFAULT CURRENT_DATE::text,
  observacoes   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caza_int_entidade ON caza_crm_interactions(entidade_id);
