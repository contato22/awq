-- ─── JACQES CRM — Schema completo ────────────────────────────────────────────
-- 9 tabelas: jacqes_crm_leads, jacqes_crm_opportunities, jacqes_crm_proposals,
--            jacqes_crm_clients, jacqes_crm_interactions, jacqes_crm_tasks,
--            jacqes_crm_visits, jacqes_crm_expansion, jacqes_crm_health_snapshot
-- Idempotente — seguro rodar múltiplas vezes.

-- ─── 1. jacqes_crm_leads ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_leads (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome              TEXT        NOT NULL,
  empresa           TEXT        NOT NULL DEFAULT '',
  contato_principal TEXT        NOT NULL DEFAULT '',
  telefone          TEXT        NOT NULL DEFAULT '',
  email             TEXT        NOT NULL DEFAULT '',
  origem            TEXT        NOT NULL DEFAULT 'Indicação',
  segmento          TEXT        NOT NULL DEFAULT '',
  canal             TEXT        NOT NULL DEFAULT '',
  interesse         TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'Novo',
  owner             TEXT        NOT NULL DEFAULT '',
  data_entrada      DATE        NOT NULL DEFAULT CURRENT_DATE,
  observacoes       TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_leads_status ON jacqes_crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_jacqes_leads_owner  ON jacqes_crm_leads(owner);

-- ─── 2. jacqes_crm_opportunities ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_opportunities (
  id                       TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id                  TEXT        REFERENCES jacqes_crm_leads(id) ON DELETE SET NULL,
  cliente_id               TEXT,
  nome_oportunidade        TEXT        NOT NULL,
  empresa                  TEXT        NOT NULL DEFAULT '',
  segmento                 TEXT        NOT NULL DEFAULT '',
  produto                  TEXT        NOT NULL DEFAULT '',
  ticket_estimado          NUMERIC     NOT NULL DEFAULT 0,
  valor_potencial          NUMERIC     NOT NULL DEFAULT 0,
  stage                    TEXT        NOT NULL DEFAULT 'Novo Lead',
  probabilidade            INTEGER     NOT NULL DEFAULT 20,
  owner                    TEXT        NOT NULL DEFAULT '',
  data_abertura            DATE        NOT NULL DEFAULT CURRENT_DATE,
  proxima_acao             TEXT        NOT NULL DEFAULT '',
  data_proxima_acao        DATE,
  risco                    TEXT        NOT NULL DEFAULT 'Baixo',
  motivo_perda             TEXT        NOT NULL DEFAULT '',
  data_fechamento_prevista DATE,
  observacoes              TEXT        NOT NULL DEFAULT '',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_opp_stage    ON jacqes_crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_jacqes_opp_owner    ON jacqes_crm_opportunities(owner);
CREATE INDEX IF NOT EXISTS idx_jacqes_opp_lead_id  ON jacqes_crm_opportunities(lead_id);

-- ─── 3. jacqes_crm_proposals ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_proposals (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  opportunity_id TEXT        REFERENCES jacqes_crm_opportunities(id) ON DELETE SET NULL,
  versao         INTEGER     NOT NULL DEFAULT 1,
  valor_proposto NUMERIC     NOT NULL DEFAULT 0,
  escopo         TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'Rascunho',
  data_envio     DATE,
  data_resposta  DATE,
  contraproposta NUMERIC,
  observacoes    TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_prop_opp ON jacqes_crm_proposals(opportunity_id);

-- ─── 4. jacqes_crm_clients ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_clients (
  id                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome               TEXT        NOT NULL,
  razao_social       TEXT        NOT NULL DEFAULT '',
  cnpj               TEXT        NOT NULL DEFAULT '',
  segmento           TEXT        NOT NULL DEFAULT '',
  produto_ativo      TEXT        NOT NULL DEFAULT '',
  ticket_mensal      NUMERIC     NOT NULL DEFAULT 0,
  inicio_relacao     DATE,
  owner              TEXT        NOT NULL DEFAULT '',
  status_conta       TEXT        NOT NULL DEFAULT 'Ativo',
  health_score       INTEGER     NOT NULL DEFAULT 80,
  churn_risk         TEXT        NOT NULL DEFAULT 'Baixo',
  potencial_expansao NUMERIC     NOT NULL DEFAULT 0,
  observacoes        TEXT        NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_cli_status ON jacqes_crm_clients(status_conta);
CREATE INDEX IF NOT EXISTS idx_jacqes_cli_owner  ON jacqes_crm_clients(owner);

-- ─── 5. jacqes_crm_interactions ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_interactions (
  id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id           TEXT        REFERENCES jacqes_crm_clients(id) ON DELETE SET NULL,
  opportunity_id       TEXT        REFERENCES jacqes_crm_opportunities(id) ON DELETE SET NULL,
  lead_id              TEXT        REFERENCES jacqes_crm_leads(id) ON DELETE SET NULL,
  tipo                 TEXT        NOT NULL DEFAULT 'Ligação',
  canal                TEXT        NOT NULL DEFAULT '',
  data                 DATE        NOT NULL DEFAULT CURRENT_DATE,
  resumo               TEXT        NOT NULL DEFAULT '',
  proximo_passo        TEXT        NOT NULL DEFAULT '',
  responsavel          TEXT        NOT NULL DEFAULT '',
  satisfacao_percebida TEXT        NOT NULL DEFAULT 'Neutro',
  risco_percebido      TEXT        NOT NULL DEFAULT 'Baixo',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_int_cliente ON jacqes_crm_interactions(cliente_id);
CREATE INDEX IF NOT EXISTS idx_jacqes_int_lead    ON jacqes_crm_interactions(lead_id);

-- ─── 6. jacqes_crm_tasks ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_tasks (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id     TEXT        REFERENCES jacqes_crm_clients(id) ON DELETE SET NULL,
  opportunity_id TEXT        REFERENCES jacqes_crm_opportunities(id) ON DELETE SET NULL,
  lead_id        TEXT        REFERENCES jacqes_crm_leads(id) ON DELETE SET NULL,
  titulo         TEXT        NOT NULL,
  categoria      TEXT        NOT NULL DEFAULT 'Follow-up',
  prioridade     TEXT        NOT NULL DEFAULT 'Média',
  status         TEXT        NOT NULL DEFAULT 'Aberta',
  responsavel    TEXT        NOT NULL DEFAULT '',
  data_criacao   DATE        NOT NULL DEFAULT CURRENT_DATE,
  prazo          DATE,
  sla_horas      INTEGER     NOT NULL DEFAULT 24,
  data_conclusao DATE,
  bloqueio       TEXT        NOT NULL DEFAULT '',
  retrabalho     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_tasks_status    ON jacqes_crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_jacqes_tasks_cliente   ON jacqes_crm_tasks(cliente_id);
CREATE INDEX IF NOT EXISTS idx_jacqes_tasks_prazo     ON jacqes_crm_tasks(prazo);

-- ─── 7. jacqes_crm_visits ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_visits (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id    TEXT        REFERENCES jacqes_crm_clients(id) ON DELETE SET NULL,
  data          DATE        NOT NULL DEFAULT CURRENT_DATE,
  objetivo      TEXT        NOT NULL DEFAULT '',
  resultado     TEXT        NOT NULL DEFAULT '',
  proximo_passo TEXT        NOT NULL DEFAULT '',
  responsavel   TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_visits_cliente ON jacqes_crm_visits(cliente_id);

-- ─── 8. jacqes_crm_expansion ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_expansion (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id      TEXT        REFERENCES jacqes_crm_clients(id) ON DELETE SET NULL,
  tipo            TEXT        NOT NULL DEFAULT 'Upsell',
  valor_potencial NUMERIC     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'Identificada',
  owner           TEXT        NOT NULL DEFAULT '',
  proxima_acao    TEXT        NOT NULL DEFAULT '',
  observacoes     TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_exp_cliente ON jacqes_crm_expansion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_jacqes_exp_status  ON jacqes_crm_expansion(status);

-- ─── 9. jacqes_crm_health_snapshot ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jacqes_crm_health_snapshot (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id       TEXT        REFERENCES jacqes_crm_clients(id) ON DELETE SET NULL,
  periodo          TEXT        NOT NULL DEFAULT '',
  health_score     INTEGER     NOT NULL DEFAULT 80,
  churn_risk       TEXT        NOT NULL DEFAULT 'Baixo',
  ultima_interacao DATE,
  followups_em_dia BOOLEAN     NOT NULL DEFAULT TRUE,
  pendencias       INTEGER     NOT NULL DEFAULT 0,
  expansao_aberta  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jacqes_health_cliente ON jacqes_crm_health_snapshot(cliente_id);
CREATE INDEX IF NOT EXISTS idx_jacqes_health_periodo ON jacqes_crm_health_snapshot(periodo);
