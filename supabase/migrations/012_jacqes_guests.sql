-- =============================================================================
-- Migration 012 — JACQES: convidados (gerenciador de acessos)
-- =============================================================================
-- Login individual para acesso à área /jacqes (role 'jacqes-guest'). NÃO são
-- usuários da Plataforma. Senha em bcrypt. Acesso só via service role (NextAuth
-- authorize + API do owner). RLS fail-closed. Idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS jacqes_guest (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,        -- login (usuário OU email), normalizado (lower)
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jacqes_guest_email ON jacqes_guest (email);

-- RLS fail-closed. anon SEM acesso (hash de senha nunca exposto). O backend usa
-- service role (bypass RLS) no NextAuth/API; authenticated via REST não lê nada.
ALTER TABLE jacqes_guest ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jacqes_guest FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jacqes_guest TO authenticated;
DROP POLICY IF EXISTS jacqes_guest_closed ON jacqes_guest;
CREATE POLICY jacqes_guest_closed ON jacqes_guest FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- =============================================================================
-- FIM — Migration 012
-- =============================================================================
