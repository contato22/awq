-- =============================================================================
-- AWQ AUTH USERS — Migração de senhas do source code para banco de dados
-- =============================================================================
-- Cria tabela centralizada de usuários com bcrypt hashes.
-- Após executar, remover os hashes de lib/auth-users.ts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS awq_users (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('owner','admin','analyst','cs-ops','caza','enrd')),
  home_route   TEXT NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed — hashes idênticos aos que estavam em lib/auth-users.ts
INSERT INTO awq_users (id, name, email, password_hash, role, home_route) VALUES
  ('1', 'Alex Whitmore',    'alex@awqgroup.com',            '$2b$10$3DCcHvoCK2b5jFkXLX1hvuE0b98RPVQjR8fUYa4z7A..AwbjW5YFC', 'owner',   '/awq'),
  ('2', 'Sam Chen',         's.chen@jacqes.com',            '$2b$10$cPH8UGnkUGbDt84IeHvqTuLE.5ilSjFTjK8NZnHENQXEEMGLgD/M.', 'admin',   '/awq'),
  ('3', 'Priya Nair',       'p.nair@jacqes.com',            '$2b$10$iDy4eveRpiC7Zdl0.wYL6eh976tMUW8ii1S9s.vWGbw7T5GkKfOS6', 'analyst', '/jacqes'),
  ('4', 'Danilo',           'danilo@jacqes.com',            '$2b$10$tb9af2CBLLhGzv4FzCiDKe9TKMAIDeiyrUPI9ornKfUCNsFh8cmfO', 'cs-ops',  '/jacqes/csops'),
  ('5', 'Miguel',           'contato@awq.com.br',           '$2b$10$2FbtWd3diTZ8Hp5BV5QqbONApQ7VcRBmwbN.JQKrjQNNaORBmwKOm', 'owner',   '/awq'),
  ('6', 'Daniel Chiappetta','danielcchiappetta@live.com',   '$2b$10$Y9gcPY4r6AbbIi5fz131GeSCmuu5nTiL7gZ4wTjJJQeb3KsdKsO92', 'caza',    '/caza-vision'),
  ('7', 'Kazadem',          'Kazadem2@gmail.com',           '$2b$10$GsdHM8of19be3dKaFRNU4umIXN6fMANar/wNKzWwEKywoZMPz7zxi', 'enrd',    '/enrd')
ON CONFLICT (id) DO NOTHING;

-- Impedir leitura pública — apenas service role pode ler
ALTER TABLE awq_users ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy de SELECT para anon/authenticated — acesso apenas via service role
-- O lookup de autenticação usa SUPABASE_SERVICE_ROLE_KEY (server-side only)

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION awq_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS awq_users_updated_at ON awq_users;
CREATE TRIGGER awq_users_updated_at
  BEFORE UPDATE ON awq_users
  FOR EACH ROW EXECUTE FUNCTION awq_set_updated_at();
