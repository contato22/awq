-- ─── AWQ — Habilitar Row Level Security em tabelas financeiras ───────────────
--
-- ROD AR UMA VEZ no Supabase SQL Editor (projeto ERP).
--
-- Contexto:
--   A migração original (scripts via /api/setup/migrate) desabilitou RLS pra
--   permitir que a anon key escrevesse direto. Isso significa que qualquer um
--   com a anon key (que é pública no client) lê e escreve tudo.
--
--   Em produção a app só lê via service_role (server-side), então podemos
--   reativar RLS e bloquear a anon key. Service role bypassa RLS por design.
--
-- Pós-execução: verifique no Dashboard → Authentication → Policies que as
-- tabelas abaixo aparecem com RLS = ON.
--
-- Em caso de regressão (página vazia em produção), rever as policies — talvez
-- algum endpoint esteja usando anon. Procure por `createClient` com
-- NEXT_PUBLIC_SUPABASE_ANON_KEY no código.

BEGIN;

-- 1. Habilitar RLS nas três tabelas financeiras
ALTER TABLE financial_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_balance_snapshots  ENABLE ROW LEVEL SECURITY;

-- 2. Revogar GRANT amplo concedido na migração original
REVOKE ALL ON financial_documents      FROM anon;
REVOKE ALL ON bank_transactions        FROM anon;
REVOKE ALL ON daily_balance_snapshots  FROM anon;

-- 3. Policies pra `authenticated` (usuários com JWT válido da app)
--
-- Por enquanto: leitura total pra qualquer usuário autenticado (mantém o
-- comportamento atual da UI, que filtra por BU server-side via apiGuard).
-- Próxima iteração: policies por entity/BU baseadas em auth.jwt() ->> 'role'.

CREATE POLICY IF NOT EXISTS "auth_read_financial_documents"
  ON financial_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "auth_read_bank_transactions"
  ON bank_transactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "auth_read_daily_balance_snapshots"
  ON daily_balance_snapshots FOR SELECT TO authenticated
  USING (true);

-- 4. Escrita: nada via anon/authenticated. Service role bypassa RLS, então
--    a sync da Cora (server-side) continua funcionando. Bloqueia escrita
--    direta via anon key (ex: tentativa de tampering vindo do client).
--
-- (Sem CREATE POLICY pra INSERT/UPDATE/DELETE → bloqueia por padrão.)

COMMIT;

-- ─── Verificação ─────────────────────────────────────────────────────────────
-- SELECT relname, relrowsecurity
--   FROM pg_class
--  WHERE relname IN ('financial_documents','bank_transactions','daily_balance_snapshots');
-- relrowsecurity deve ser `t` (true) nas três.
