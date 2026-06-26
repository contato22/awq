-- =============================================================================
-- Migration 006 — ENRD · Controle de Montagem (espelho do portal gestão.enerdy)
-- =============================================================================
-- A BU ENRD passa a ter um espelho LOCAL (no banco da AWQ) dos dados de montagem
-- que vivem no portal externo gestão.enerdy.com.br (Supabase próprio do app).
--
-- Fonte de leitura: gxgvucnkldzcktdzkkdv.supabase.co (tabelas installations,
-- clientes). Aqui guardamos uma cópia consultável pelo app da AWQ, sincronizada
-- via POST /api/enrd/montagem/sync.
--
-- Convenção do projeto: RLS desabilitado nessas tabelas (anon key lê/escreve).
-- Idempotente. Rodar uma vez no SQL Editor do ERP (kkhxxsrgsewjfvnnssyf).
-- =============================================================================

-- ── Instalações (tabela de montagem) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrd_montagem_installation (
  id                          text PRIMARY KEY,    -- id de origem (gestão)
  nome                        text,
  localizacao                 text,
  status                      text,
  situacao                    text,
  tipo                        text,
  prioridade                  text,
  montador                    text,
  cliente_id                  text,
  qnt_placas                  numeric,
  valor_por_placa             numeric,
  expectativa_geracao_kwh_ano numeric,
  distancia_km                numeric,
  data_int                    date,
  data_max_inst               date,
  source_created_at           timestamptz,
  source_updated_at           timestamptz,
  raw                         jsonb,               -- linha completa de origem
  synced_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_status     ON enrd_montagem_installation (status);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_montador   ON enrd_montagem_installation (montador);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_cliente    ON enrd_montagem_installation (cliente_id);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_data_int   ON enrd_montagem_installation (data_int);

-- ── Clientes do app de montagem ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrd_montagem_cliente (
  id                text PRIMARY KEY,
  nome              text,
  telefone          text,
  email             text,
  endereco          text,
  source_created_at timestamptz,
  raw               jsonb,
  synced_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Log de sincronização (auditável) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrd_montagem_sync_log (
  id            bigserial PRIMARY KEY,
  ran_at        timestamptz NOT NULL DEFAULT now(),
  ran_by        text,
  installations integer NOT NULL DEFAULT 0,
  clientes      integer NOT NULL DEFAULT 0,
  ok            boolean NOT NULL DEFAULT true,
  detail        text
);

-- RLS desabilitado (convenção do projeto — anon key opera nessas tabelas).
ALTER TABLE enrd_montagem_installation DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_montagem_cliente      DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_montagem_sync_log     DISABLE ROW LEVEL SECURITY;
