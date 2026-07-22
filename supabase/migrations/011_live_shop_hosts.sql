-- =============================================================================
-- Migration 011 — Live Shop: hosts + gamificação (ls_host)
-- =============================================================================
-- Hosts (apresentadores) das lives; XP/nível/badges são DERIVADOS em runtime
-- (lib/live-shop/gamification.ts). Atribuição via ls_live_session.host_id.
-- RLS por BU fail-closed. Idempotente. Aplicar após a 010.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ls_host (
  id         TEXT PRIMARY KEY,
  bu_id      TEXT NOT NULL DEFAULT 'LIVE',
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ls_live_session ADD COLUMN IF NOT EXISTS host_id TEXT REFERENCES ls_host(id) ON DELETE SET NULL;

INSERT INTO ls_host (id, name) VALUES ('host-bless', 'Host Bless Rio (a definir)')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE ls_host ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ls_host FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ls_host TO authenticated;
DROP POLICY IF EXISTS bu_isolation ON ls_host;
CREATE POLICY bu_isolation ON ls_host FOR ALL TO authenticated
  USING      (bu_id = current_setting('app.current_bu', true))
  WITH CHECK (bu_id = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 011
-- =============================================================================
