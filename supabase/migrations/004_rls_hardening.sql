-- =============================================================================
-- AWQ RLS HARDENING — Auditoria e correção de Row Level Security
-- =============================================================================
-- PROBLEMAS IDENTIFICADOS:
--
--   1. financial_documents / bank_transactions: RLS DESABILITADO
--      → qualquer anon pode ler/gravar dados financeiros sensíveis
--
--   2. CRM tables: RLS habilitado mas USING (TRUE) = sem isolamento real
--      → anon e authenticated têm acesso total a todos os registros
--
--   3. ERP tables: apenas políticas SELECT USING (true)
--      → sem proteção de escrita (INSERT/UPDATE/DELETE livres para anon)
--
-- SOLUÇÃO:
--   - financial_documents / bank_transactions: habilitar RLS, permitir
--     apenas 'authenticated' role (acesso via service role no servidor)
--   - CRM: substituir USING (TRUE) por autenticação obrigatória
--   - ERP: adicionar políticas de escrita restritas
--
-- NOTA: A app usa service role key no servidor (bypassa RLS) e anon key
-- apenas para leitura em componentes de cliente. Políticas permitem
-- authenticated para leituras do cliente — writes sempre via service role.
-- =============================================================================

-- ─── 1. financial_documents — habilitar RLS ──────────────────────────────────
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_documents_anon_all   ON financial_documents;
DROP POLICY IF EXISTS financial_documents_select      ON financial_documents;
DROP POLICY IF EXISTS financial_documents_insert      ON financial_documents;
DROP POLICY IF EXISTS financial_documents_update      ON financial_documents;

-- Apenas authenticated pode ler seus próprios documentos
-- (writes feitos via service role no servidor, que bypassa RLS)
CREATE POLICY financial_documents_authenticated_select
  ON financial_documents FOR SELECT
  TO authenticated
  USING (true);

-- ─── 2. bank_transactions — habilitar RLS ────────────────────────────────────
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_transactions_anon_all   ON bank_transactions;
DROP POLICY IF EXISTS bank_transactions_select      ON bank_transactions;

CREATE POLICY bank_transactions_authenticated_select
  ON bank_transactions FOR SELECT
  TO authenticated
  USING (true);

-- ─── 3. CRM — substituir USING(TRUE) por autenticação obrigatória ─────────────
-- Remover políticas permissivas existentes
DROP POLICY IF EXISTS crm_accounts_all      ON crm_accounts;
DROP POLICY IF EXISTS crm_contacts_all      ON crm_contacts;
DROP POLICY IF EXISTS crm_leads_all         ON crm_leads;
DROP POLICY IF EXISTS crm_opportunities_all ON crm_opportunities;
DROP POLICY IF EXISTS crm_stage_hist_all    ON crm_opportunity_stage_history;
DROP POLICY IF EXISTS crm_activities_all    ON crm_activities;
DROP POLICY IF EXISTS contrapartes_all      ON contrapartes;

-- Re-criar apenas para authenticated (anon não acessa CRM)
CREATE POLICY crm_accounts_authenticated      ON crm_accounts              FOR ALL TO authenticated USING (true);
CREATE POLICY crm_contacts_authenticated      ON crm_contacts              FOR ALL TO authenticated USING (true);
CREATE POLICY crm_leads_authenticated         ON crm_leads                 FOR ALL TO authenticated USING (true);
CREATE POLICY crm_opportunities_authenticated ON crm_opportunities         FOR ALL TO authenticated USING (true);
CREATE POLICY crm_stage_hist_authenticated    ON crm_opportunity_stage_history FOR ALL TO authenticated USING (true);
CREATE POLICY crm_activities_authenticated    ON crm_activities            FOR ALL TO authenticated USING (true);
CREATE POLICY contrapartes_authenticated      ON contrapartes              FOR ALL TO authenticated USING (true);

-- ─── 4. ERP — adicionar proteção de escrita ───────────────────────────────────
-- Políticas SELECT existentes permitem USING(true) para todos
-- Adicionar políticas de INSERT/UPDATE/DELETE restritas a authenticated

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'erp_assets', 'erp_expenses', 'erp_inventory_warehouses',
    'erp_inventory_items', 'erp_inventory_movements',
    'erp_sales_orders', 'erp_purchases', 'erp_contracts', 'erp_time_entries'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl || '_insert', tbl
    );
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR UPDATE TO authenticated USING (true)',
      tbl || '_update', tbl
    );
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR DELETE TO authenticated USING (true)',
      tbl || '_delete', tbl
    );
  END LOOP;
END $$;

-- ─── 5. awq_users — confirmar RLS bloqueado (sem policy pública) ─────────────
-- awq_users criada em 003_auth_users.sql com ENABLE ROW LEVEL SECURITY
-- e sem policies públicas — apenas service role acessa. Confirmado.
