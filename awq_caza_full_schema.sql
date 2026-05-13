-- ─── Caza Vision — Full Schema ───────────────────────────────────────────────
-- Standalone schema: no FK references to other modules.

SET client_min_messages = WARNING;

-- ─── caza_projects ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_projects (
  id                    TEXT PRIMARY KEY,
  titulo                TEXT NOT NULL DEFAULT '',
  cliente               TEXT NOT NULL DEFAULT '',
  tipo                  TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'Em Produção',
  prioridade            TEXT NOT NULL DEFAULT '',
  diretor               TEXT NOT NULL DEFAULT '',
  prazo                 TEXT NOT NULL DEFAULT '',
  inicio                TEXT NOT NULL DEFAULT '',
  valor                 NUMERIC NOT NULL DEFAULT 0,
  alimentacao           NUMERIC NOT NULL DEFAULT 0,
  gasolina              NUMERIC NOT NULL DEFAULT 0,
  despesas              NUMERIC NOT NULL DEFAULT 0,
  lucro                 NUMERIC NOT NULL DEFAULT 0,
  recebido              BOOLEAN NOT NULL DEFAULT FALSE,
  recebimento           TEXT,
  imported_from_notion  BOOLEAN,
  notion_page_id        TEXT,
  imported_at           TEXT,
  last_internal_update  TEXT,
  sync_status           TEXT NOT NULL DEFAULT 'internal'
);

CREATE INDEX IF NOT EXISTS idx_caza_proj_recebido ON caza_projects(recebido);
CREATE INDEX IF NOT EXISTS idx_caza_proj_prazo ON caza_projects(prazo);

-- ─── caza_clients ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS caza_clients (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL DEFAULT '',
  email                 TEXT NOT NULL DEFAULT '',
  phone                 TEXT NOT NULL DEFAULT '',
  type                  TEXT NOT NULL DEFAULT 'Marca',
  budget_anual          NUMERIC NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'Ativo',
  segmento              TEXT NOT NULL DEFAULT '',
  since                 TEXT NOT NULL DEFAULT '',
  cnpj                  TEXT NOT NULL DEFAULT '',
  contato_nome          TEXT NOT NULL DEFAULT '',
  contato_cargo         TEXT NOT NULL DEFAULT '',
  modelo_contrato       TEXT NOT NULL DEFAULT '',
  owner                 TEXT NOT NULL DEFAULT '',
  health_score          NUMERIC NOT NULL DEFAULT 80,
  nps                   NUMERIC,
  observacoes           TEXT,
  imported_from_notion  BOOLEAN,
  notion_page_id        TEXT,
  imported_at           TEXT,
  last_internal_update  TEXT,
  sync_status           TEXT NOT NULL DEFAULT 'internal'
);

CREATE INDEX IF NOT EXISTS idx_caza_cli_status ON caza_clients(status);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE caza_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE caza_clients  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_caza_projects" ON caza_projects;
CREATE POLICY "allow_all_caza_projects" ON caza_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_caza_clients" ON caza_clients;
CREATE POLICY "allow_all_caza_clients" ON caza_clients FOR ALL USING (true) WITH CHECK (true);
