-- =============================================================================
-- Migration 010 — Live Shop: convidados da área da marca (ls_guest)
-- =============================================================================
-- Login individual da área da marca (role 'live-guest'), liberado por marca.
-- NÃO são usuários da Plataforma. Senha em bcrypt. Acesso só via service role
-- (NextAuth authorize + API do owner). RLS fail-closed. Idempotente. Após 009.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ls_guest (
  id            TEXT PRIMARY KEY,
  bu_id         TEXT NOT NULL DEFAULT 'LIVE',
  email         TEXT NOT NULL UNIQUE,        -- normalizado (lower) na aplicação
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  brand_ids     TEXT[] NOT NULL DEFAULT '{}',-- marcas liberadas
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_guest_email ON ls_guest (email);

-- RLS fail-closed. anon SEM acesso (hash de senha nunca exposto). authenticated
-- só com contexto de BU; o backend usa service role (bypass) no NextAuth/API.
ALTER TABLE ls_guest ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ls_guest FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ls_guest TO authenticated;
DROP POLICY IF EXISTS bu_isolation ON ls_guest;
CREATE POLICY bu_isolation ON ls_guest FOR ALL TO authenticated
  USING      (bu_id = current_setting('app.current_bu', true))
  WITH CHECK (bu_id = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 010
-- =============================================================================
