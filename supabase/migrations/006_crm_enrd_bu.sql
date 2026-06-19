-- Migration 006: habilita a BU ENRD no CRM compartilhado
-- Contexto: o CRM é compartilhado entre todas as BUs do grupo (cada linha é
-- carimbada com `bu`). As tabelas crm_leads / crm_opportunities tinham um
-- CHECK que não incluía 'ENRD', e crm_accounts não possuía coluna `bu` —
-- embora lib/crm-db.ts já insira/filtre por `bu`. Isso impedia que a ENRD
-- (e qualquer BU) funcionasse individualmente no CRM.
-- Triggered: 2026-06-19
--
-- Idempotente: pode rodar mais de uma vez no SQL Editor sem efeito colateral.

-- ─── 1. Lista canônica de BUs do CRM ────────────────────────────────────────
-- Mantém em sincronia com BU_OPTIONS em lib/crm-types.ts.
--   JACQES, CAZA, ADVISOR, VENTURE, ENRD

-- ─── 2. crm_accounts: garantir coluna `bu` ──────────────────────────────────
ALTER TABLE crm_accounts
  ADD COLUMN IF NOT EXISTS bu TEXT;

CREATE INDEX IF NOT EXISTS idx_crm_accounts_bu ON crm_accounts(bu);

-- ─── 3. Atualizar os CHECK de `bu` para incluir ENRD ────────────────────────
-- Constraints inline de coluna recebem o nome <tabela>_<coluna>_check no PG.

-- crm_leads
ALTER TABLE crm_leads  DROP CONSTRAINT IF EXISTS crm_leads_bu_check;
ALTER TABLE crm_leads
  ADD  CONSTRAINT crm_leads_bu_check
  CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));

-- crm_opportunities
ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS crm_opportunities_bu_check;
ALTER TABLE crm_opportunities
  ADD  CONSTRAINT crm_opportunities_bu_check
  CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));

-- crm_accounts (a coluna pode ter acabado de ser criada; aplica o mesmo domínio)
ALTER TABLE crm_accounts DROP CONSTRAINT IF EXISTS crm_accounts_bu_check;
ALTER TABLE crm_accounts
  ADD  CONSTRAINT crm_accounts_bu_check
  CHECK (bu IS NULL OR bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));
