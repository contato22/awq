-- Rollback de emergência da migração 013_rls_lockdown.sql.
-- Rodar manualmente no SQL Editor do Supabase ERP SÓ se algo parar de funcionar.
-- (Fica fora de supabase/migrations/ para não ser aplicado pelo CI.)
-- Atenção: a 013 roda de novo a cada push na main que toque migrations —
-- para manter o rollback, defina a variável SKIP_ERP_MIGRATE=true no repo.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT object_name, object_type FROM _rls_lockdown_log LOOP
    IF r.object_type = 'table' THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.object_name);
    ELSE
      EXECUTE format('GRANT SELECT ON public.%I TO anon', r.object_name);
    END IF;
  END LOOP;
END $$;
