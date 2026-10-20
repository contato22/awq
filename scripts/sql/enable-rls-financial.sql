-- =============================================================================
-- RLS nas tabelas financeiras legadas — RODAR MANUALMENTE, UMA VEZ
-- =============================================================================
-- Projeto: ERP Supabase `kkhxxsrgsewjfvnnssyf` (awq-tower-crm), SQL Editor.
-- Não faz parte do deploy. Este arquivo não é aplicado automaticamente.
--
-- Antes de executar, confirme na Vercel:
--   ERP_SUPABASE_SERVICE_ROLE_KEY  (ou SUPABASE_SERVICE_ROLE_KEY)
-- O service_role ignora RLS. O fallback da anon key em lib/financial-db.ts
-- deixa de ler/escrever estas tabelas — é o efeito desejado.
--
-- Não há policy para o role `authenticated`. O app autentica com NextAuth,
-- não com Supabase Auth. Uma policy SELECT ampla reabriria os dados para
-- qualquer usuário futuro do Supabase Auth sem ajudar o servidor.
--
-- Tabelas recon_* já foram endurecidas em supabase/migrations/004_recon_rls_hardening.sql.
-- =============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'financial_documents',
    'bank_transactions',
    'daily_balance_snapshots'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
      RAISE NOTICE 'RLS enabled and anon/authenticated revoked on %', t;
    ELSE
      RAISE NOTICE 'skip % (table not found)', t;
    END IF;
  END LOOP;
END $$;
