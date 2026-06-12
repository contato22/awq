-- =============================================================================
-- Migration 005 — Conciliação Inteligente: bu_bank_account + legado ENERDY
-- =============================================================================
-- Fix 1: mapeamento BU↔conta vira TABELA auditável (não mais parâmetro de body).
-- Fix 2: legado rotulado 'ENERDY' é SINALIZADO para classificação (não decidido).
--
-- Idempotente. Aplicar após 003 e 004. Não regride nada.
-- =============================================================================

-- ── Fix 1: bu_bank_account ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bu_bank_account (
  account_id text PRIMARY KEY,        -- id da conta (o mesmo account_id gravado em bank_transaction)
  bu         text NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  label      text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed das entidades LEGADAS conhecidas (não-sensível — já são constantes do app,
-- todas AWQ-side). Contas Cora reais NÃO são commitadas: o operador preenche o
-- placeholder abaixo no SQL Editor. Entidades fora desta lista (Intercompany,
-- Socio_PF, Unknown) ficam DE FORA de propósito → fail-closed no backfill.
INSERT INTO bu_bank_account (account_id, bu, label) VALUES
  ('AWQ_Holding', 'AWQ', 'AWQ Holding (legado)'),
  ('JACQES',      'AWQ', 'JACQES (legado)'),
  ('ENERDY',      'AWQ', 'ENERDY (legado — sujeito a reclassificação)'),
  ('Caza_Vision', 'AWQ', 'Caza Vision (legado)')
ON CONFLICT (account_id) DO NOTHING;

-- 🔧 INPUT do operador (rodar no SQL Editor, NÃO commitar IDs reais):
--   insert into bu_bank_account (account_id, bu, label) values
--     ('<CORA_ACCOUNT_AWQ>',  'AWQ',  'Cora AWQ')
--    ,('<CORA_ACCOUNT_ENRD>', 'ENRD', 'Cora Enerdy')   -- quando a conta da Enerdy entrar
--   on conflict (account_id) do nothing;

-- ── Fix 2: marcação do legado ENERDY em ledger_entry ─────────────────────────
ALTER TABLE ledger_entry ADD COLUMN IF NOT EXISTS legacy_label         text;
ALTER TABLE ledger_entry ADD COLUMN IF NOT EXISTS needs_classification boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_ledger_needs_classif ON ledger_entry (bu, needs_classification)
  WHERE needs_classification = true;

-- View de revisão: lançamentos legado ENERDY aguardando decisão contábil.
CREATE OR REPLACE VIEW v_legado_enerdy_revisao AS
SELECT le.id, le.bu, le.amount, le.due_date, le.counterparty, le.doc_ref,
       le.categoria, le.is_intercompany, le.needs_classification
FROM ledger_entry le
WHERE le.legacy_label = 'ENERDY' AND le.needs_classification = true
ORDER BY le.due_date;

-- RLS + grants coerentes com 003/004 (bu_bank_account é referência por BU).
ALTER TABLE bu_bank_account ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bu_bank_account FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON bu_bank_account TO authenticated;
GRANT SELECT ON v_legado_enerdy_revisao TO authenticated;
REVOKE ALL ON v_legado_enerdy_revisao FROM anon;

DROP POLICY IF EXISTS bu_isolation ON bu_bank_account;
CREATE POLICY bu_isolation ON bu_bank_account FOR ALL TO authenticated
  USING      (bu = current_setting('app.current_bu', true))
  WITH CHECK (bu = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 005
-- =============================================================================
