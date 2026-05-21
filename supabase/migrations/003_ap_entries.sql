-- =============================================================================
-- Migration 003: ap_entries — Cadastro de Contas a Pagar (AP)
-- Execute no Supabase SQL Editor do projeto kkhxxsrgsewjfvnnssyf (awq-tower-crm)
-- Seguro rodar múltiplas vezes (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ap_entries (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- Plano de Contas
  account_code         TEXT NOT NULL,
  account_description  TEXT NOT NULL,
  managerial_category  TEXT NOT NULL,
  -- Fornecedor
  supplier_name        TEXT NOT NULL,
  supplier_document    TEXT,
  -- Entidade / BU
  entity               TEXT NOT NULL DEFAULT 'AWQ_Holding',
  -- Financeiro
  amount               NUMERIC NOT NULL CHECK (amount > 0),
  currency             TEXT NOT NULL DEFAULT 'BRL',
  -- Datas
  issue_date           TEXT NOT NULL,
  due_date             TEXT NOT NULL,
  payment_date         TEXT,
  -- Status: pendente | aprovado | pago | vencido | cancelado
  status               TEXT NOT NULL DEFAULT 'pendente',
  -- Referências
  invoice_number       TEXT,
  description          TEXT,
  notes                TEXT,
  -- Vínculo com transação bancária (pós-conciliação)
  bank_transaction_id  TEXT,
  -- Auditoria
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT,
  approved_by          TEXT,
  approved_at          TEXT
);

CREATE INDEX IF NOT EXISTS idx_ap_entity        ON ap_entries(entity);
CREATE INDEX IF NOT EXISTS idx_ap_status        ON ap_entries(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date      ON ap_entries(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_account_code  ON ap_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_ap_bank_tx       ON ap_entries(bank_transaction_id);

-- RLS desabilitado (consistente com bank_transactions / financial_documents)
ALTER TABLE ap_entries DISABLE ROW LEVEL SECURITY;

-- Permissão anon (consistente com demais tabelas financeiras)
GRANT ALL ON ap_entries TO anon;
GRANT ALL ON ap_entries TO authenticated;
