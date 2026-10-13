-- ─── 013 — RLS lockdown (ERP kkhxxsrgsewjfvnnssyf) ────────────────────────────
--
-- A anon key do ERP é pública (hardcoded em lib/supabase.ts e no bundle do
-- GitHub Pages). Com RLS desligado, qualquer pessoa lia/escrevia
-- bank_transactions, financial_documents, leads da Patrícia Canto etc.
--
-- Esta migração liga RLS em TODA tabela do schema public que ainda está sem RLS.
-- Nenhuma policy nova é criada → anon fica bloqueado nessas tabelas.
-- A plataforma não é afetada: em produção todo acesso server-side usa
-- erpAdmin (service role), que ignora RLS. Tabelas que já tinham RLS + policy
-- (ex.: contrapartes, usada pelo ContraparteAutocomplete no browser) ficam como estão.
--
-- Views em public rodam com o dono (bypass de RLS), então o acesso de anon a
-- elas é revogado.
--
-- Idempotente. Roda depois de 006/007 (que dão DISABLE RLS em tabelas ENRD)
-- porque migrate-erp-schema.yml aplica os arquivos em ordem a cada push.
--
-- Rollback: scripts/rls-lockdown-rollback.sql (lê _rls_lockdown_log).

CREATE TABLE IF NOT EXISTS _rls_lockdown_log (
  object_name text PRIMARY KEY,
  object_type text NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE _rls_lockdown_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
      INSERT INTO _rls_lockdown_log (object_name, object_type)
      VALUES (r.relname, 'table') ON CONFLICT (object_name) DO NOTHING;
      RAISE NOTICE 'RLS enabled: %', r.relname;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'RLS skipped: % (%)', r.relname, SQLERRM;
    END;
  END LOOP;

  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND has_table_privilege('anon', c.oid, 'SELECT')
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
      INSERT INTO _rls_lockdown_log (object_name, object_type)
      VALUES (r.relname, 'view') ON CONFLICT (object_name) DO NOTHING;
      RAISE NOTICE 'anon revoked on view: %', r.relname;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'view skipped: % (%)', r.relname, SQLERRM;
    END;
  END LOOP;
END $$;
