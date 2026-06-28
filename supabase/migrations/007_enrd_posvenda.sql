-- =============================================================================
-- Migration 007 — ENRD · Pós-venda/O&M — receita por OS (Tamara) + config
-- =============================================================================
-- Receita/OS vem da planilha da Tamara (import CSV). Custos fixos NÃO ficam aqui
-- (são parâmetros de config, nível operação). Enriquecimento (gestão) usa as
-- tabelas enrd_montagem_* (migration 006).
--
-- Convenção do projeto: RLS desabilitado. Idempotente. Rodar no SQL Editor do ERP.
-- =============================================================================

-- ── OS de pós-venda (fonte: planilha Tamara, import em lote) ──────────────────
CREATE TABLE IF NOT EXISTS enrd_posvenda_os (
  id             text PRIMARY KEY,     -- estável por lançamento (hash data+cliente+valor ou id da planilha)
  data           date,                 -- AAAA-MM-DD (normalizada na importação)
  cliente        text,
  cidade         text,
  tipo_servico   text,
  valor          numeric NOT NULL DEFAULT 0,
  custo_material numeric NOT NULL DEFAULT 0,
  tecnico        text,
  -- Conciliação com gestão (preenchida no import/sync)
  cliente_match  text,                 -- id do cliente no gestão (enrd_montagem_cliente) ou null
  conciliacao    text NOT NULL DEFAULT 'REVISAR'  -- 'OK' | 'REVISAR'
                 CHECK (conciliacao IN ('OK','REVISAR')),
  fonte          text NOT NULL DEFAULT 'tamara',
  raw            jsonb,
  imported_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_data    ON enrd_posvenda_os (data);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_cidade  ON enrd_posvenda_os (cidade);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_tecnico ON enrd_posvenda_os (tecnico);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_concil  ON enrd_posvenda_os (conciliacao);

-- ── Config de custeio (linha única, JSON) ────────────────────────────────────
-- Defaults vivem no código (lib/enrd-posvenda-config.ts). Esta tabela guarda os
-- overrides editados no painel. id=1 sempre.
CREATE TABLE IF NOT EXISTS enrd_posvenda_config (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

-- ── Log de importação (auditável) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrd_posvenda_import_log (
  id          bigserial PRIMARY KEY,
  ran_at      timestamptz NOT NULL DEFAULT now(),
  ran_by      text,
  linhas      integer NOT NULL DEFAULT 0,
  descartadas integer NOT NULL DEFAULT 0,
  ok          boolean NOT NULL DEFAULT true,
  detail      text
);

-- ── Relatórios de limpeza (gestão) — para a AGENDA DE REATIVAÇÃO ──────────────
-- proxima_limpeza é o pipeline de receita recorrente (Seção 3).
CREATE TABLE IF NOT EXISTS enrd_montagem_cleaning_report (
  id               text PRIMARY KEY,
  installation_id  text,
  cliente_id       text,
  cliente_nome     text,
  local_instalacao text,
  data_limpeza     date,
  proxima_limpeza  date,
  equipe           text,
  capacidade_kwp   numeric,
  nivel_sujeira    text,
  tem_anomalias    boolean,
  raw              jsonb,
  synced_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrd_clean_proxima ON enrd_montagem_cleaning_report (proxima_limpeza);

ALTER TABLE enrd_posvenda_os              DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_posvenda_config          DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_posvenda_import_log      DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_montagem_cleaning_report DISABLE ROW LEVEL SECURITY;
