-- =============================================================================
-- Migration 004 — Conciliação Inteligente: RLS hardening + source 'legacy'
-- =============================================================================
-- Endurece a segurança das tabelas recon_* / bank_transaction:
--   • REVOKE de todos os privilégios do role `anon` (a anon key NÃO deve ler
--     dados financeiros). O backend usa service role (erpAdmin), que faz BYPASS
--     RLS — não é afetado.
--   • RLS fail-closed: sem contexto de BU (GUC app.current_bu vazio) → NENHUMA
--     linha visível (antes era permissivo). service_role continua bypassando.
--   • bank_transaction.source passa a aceitar 'legacy' (backfill do schema antigo).
--
-- Idempotente. Execute UMA VEZ no Supabase SQL Editor (após a migration 003).
-- =============================================================================

-- 1) source 'legacy' para o backfill ------------------------------------------
ALTER TABLE bank_transaction DROP CONSTRAINT IF EXISTS bank_transaction_source_check;
ALTER TABLE bank_transaction ADD  CONSTRAINT bank_transaction_source_check
  CHECK (source IN ('cora_api','ofx','csv','legacy'));

-- 2) REVOKE anon — fail-closed no nível de privilégio --------------------------
-- A anon key (role `anon`) não pode tocar nas tabelas recon_*. PostgREST passa a
-- responder 401/permission denied — exatamente o que a sonda de RLS espera.
REVOKE ALL ON
  accounting_period, bank_transaction, ledger_entry, recon_group,
  recon_match, recon_rule, recon_payee_memory
  FROM anon;
REVOKE ALL ON v_saldo_conciliado, v_consolidado_grupo FROM anon;

-- 3) RLS fail-closed para a role `authenticated` -------------------------------
-- (service_role faz BYPASS RLS por padrão; o backend continua lendo tudo.)
-- Sem app.current_bu setado, current_setting(...,true) = NULL → bu = NULL = NULL
-- → não-verdadeiro → linha negada. Fail-closed.
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounting_period','bank_transaction','ledger_entry','recon_group','recon_payee_memory'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS bu_isolation ON %I', tbl);
    EXECUTE format($f$
      CREATE POLICY bu_isolation ON %I FOR ALL TO authenticated
      USING      (bu = current_setting('app.current_bu', true))
      WITH CHECK (bu = current_setting('app.current_bu', true))
    $f$, tbl);
  END LOOP;
END $$;

-- recon_rule: bu pode ser NULL (vale p/ ambas) — fail-closed exige contexto.
DROP POLICY IF EXISTS bu_isolation ON recon_rule;
CREATE POLICY bu_isolation ON recon_rule FOR ALL TO authenticated
  USING (
    current_setting('app.current_bu', true) IS NOT NULL
    AND current_setting('app.current_bu', true) <> ''
    AND (bu IS NULL OR bu = current_setting('app.current_bu', true))
  )
  WITH CHECK (
    current_setting('app.current_bu', true) IS NOT NULL
    AND current_setting('app.current_bu', true) <> ''
    AND (bu IS NULL OR bu = current_setting('app.current_bu', true))
  );

-- recon_match: deriva a BU do grupo pai — fail-closed.
DROP POLICY IF EXISTS bu_isolation ON recon_match;
CREATE POLICY bu_isolation ON recon_match FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recon_group g
      WHERE g.id = recon_match.group_id
        AND g.bu = current_setting('app.current_bu', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recon_group g
      WHERE g.id = recon_match.group_id
        AND g.bu = current_setting('app.current_bu', true)
    )
  );

-- =============================================================================
-- FIM — Migration 004
-- =============================================================================
