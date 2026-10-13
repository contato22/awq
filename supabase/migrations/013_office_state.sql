-- =============================================================================
-- Migration 013 — Office: estado durável do simulador (Head de CS, missões, eventos, políticas)
-- =============================================================================
-- Documento JSON por chave, com versão para concorrência otimista. NÃO guarda conversas,
-- relatórios nem conteúdo de entregas de clientes (isso fica só no navegador).
-- Acesso só via service role (API /api/office/state, restrita a owner/admin). RLS fail-closed.
-- Idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS office_state (
  key         TEXT PRIMARY KEY CHECK (key IN ('head', 'missions', 'events', 'policies')),
  value       JSONB NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

ALTER TABLE office_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON office_state FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON office_state TO authenticated;
DROP POLICY IF EXISTS office_state_closed ON office_state;
CREATE POLICY office_state_closed ON office_state FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- =============================================================================
-- FIM — Migration 013
-- =============================================================================
