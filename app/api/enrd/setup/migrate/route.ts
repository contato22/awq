// GET /api/enrd/setup/migrate
// Devolve o SQL combinado das migrações 006 (Controle de Montagem) + 007
// (Pós-venda/O&M) — nenhuma das duas tinha sido rodada em produção: a anon key
// não tem permissão de DDL, então não dá pra criar as tabelas via API, só
// copiando o SQL abaixo no SQL Editor (projeto kkhxxsrgsewjfvnnssyf), uma vez.
// Mesmo padrão de /api/setup/migrate (financeiro).
//
// Sintomas que isso resolve:
//  - /enrd/montagem: "Sincronizar do gestão" falhava com
//    "upsert enrd_montagem_installation: Could not find the table" (404 PostgREST)
//  - /enrd/posvenda: qualquer edição salva no painel de parâmetros era perdida
//    silenciosamente — enrd_posvenda_config não existe, getConfig() cai no
//    catch e sempre serve o DEFAULT_POSVENDA_CONFIG hardcoded do código.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_SQL = `-- ENRD — Migrações 006 (Montagem) + 007 (Pós-venda/O&M)
-- Rodar uma vez no SQL Editor do projeto kkhxxsrgsewjfvnnssyf. Idempotente.

-- ── 006: Controle de Montagem (espelho do portal gestão.enerdy) ─────────────
CREATE TABLE IF NOT EXISTS enrd_montagem_installation (
  id                          text PRIMARY KEY,
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
  raw                         jsonb,
  synced_at                   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_status   ON enrd_montagem_installation (status);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_montador ON enrd_montagem_installation (montador);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_cliente  ON enrd_montagem_installation (cliente_id);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_inst_data_int ON enrd_montagem_installation (data_int);

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

CREATE TABLE IF NOT EXISTS enrd_montagem_cleaning_report (
  id                 text PRIMARY KEY,
  installation_id    text,
  cliente_id         text,
  cliente_nome       text,
  local_instalacao   text,
  data_limpeza       date,
  proxima_limpeza    date,
  equipe             text,
  capacidade_kwp     numeric,
  nivel_sujeira      text,
  tem_anomalias      boolean,
  raw                jsonb,
  synced_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrd_mont_clean_proxima ON enrd_montagem_cleaning_report (proxima_limpeza);

CREATE TABLE IF NOT EXISTS enrd_montagem_sync_log (
  id            bigserial PRIMARY KEY,
  ran_at        timestamptz NOT NULL DEFAULT now(),
  ran_by        text,
  installations integer NOT NULL DEFAULT 0,
  clientes      integer NOT NULL DEFAULT 0,
  ok            boolean NOT NULL DEFAULT true,
  detail        text
);

-- ── 007: Pós-venda/O&M — receita por OS (Tamara) + config ───────────────────
CREATE TABLE IF NOT EXISTS enrd_posvenda_os (
  id             text PRIMARY KEY,
  data           date,
  cliente        text,
  cidade         text,
  tipo_servico   text,
  valor          numeric NOT NULL DEFAULT 0,
  custo_material numeric NOT NULL DEFAULT 0,
  tecnico        text,
  cliente_match  text,
  conciliacao    text NOT NULL DEFAULT 'REVISAR' CHECK (conciliacao IN ('OK','REVISAR')),
  fonte          text NOT NULL DEFAULT 'tamara',
  raw            jsonb,
  imported_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_data    ON enrd_posvenda_os (data);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_cidade  ON enrd_posvenda_os (cidade);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_tecnico ON enrd_posvenda_os (tecnico);
CREATE INDEX IF NOT EXISTS idx_enrd_pv_os_concil  ON enrd_posvenda_os (conciliacao);

CREATE TABLE IF NOT EXISTS enrd_posvenda_config (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS enrd_posvenda_import_log (
  id          bigserial PRIMARY KEY,
  ran_at      timestamptz NOT NULL DEFAULT now(),
  ran_by      text,
  linhas      integer NOT NULL DEFAULT 0,
  descartadas integer NOT NULL DEFAULT 0,
  ok          boolean NOT NULL DEFAULT true,
  detail      text
);

-- ── M&A · Vesting (AWQ ↔ Enerdy / BU ENRD) — nova, config JSONB única ────────
CREATE TABLE IF NOT EXISTS awq_ma_vesting_config (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

-- RLS desabilitado (convenção do projeto — anon key opera nessas tabelas).
ALTER TABLE enrd_montagem_installation     DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_montagem_cliente          DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_montagem_cleaning_report  DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_montagem_sync_log         DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_posvenda_os               DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_posvenda_config           DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrd_posvenda_import_log       DISABLE ROW LEVEL SECURITY;
ALTER TABLE awq_ma_vesting_config          DISABLE ROW LEVEL SECURITY;
`;

export async function GET(): Promise<NextResponse> {
  return new NextResponse(MIGRATION_SQL, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
