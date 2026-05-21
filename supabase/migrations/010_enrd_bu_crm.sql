-- Add ENRD to bu CHECK constraints across all Generic CRM tables
-- Idempotente — DROP CONSTRAINT + ADD CONSTRAINT é seguro em tabelas vazias ou com dados.

-- ─── crm_leads.bu ────────────────────────────────────────────────────────────
ALTER TABLE crm_leads
  DROP CONSTRAINT IF EXISTS crm_leads_bu_check;
ALTER TABLE crm_leads
  ADD CONSTRAINT crm_leads_bu_check
    CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));

-- ─── crm_opportunities.bu ────────────────────────────────────────────────────
ALTER TABLE crm_opportunities
  DROP CONSTRAINT IF EXISTS crm_opportunities_bu_check;
ALTER TABLE crm_opportunities
  ADD CONSTRAINT crm_opportunities_bu_check
    CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));

-- ─── crm_accounts.bu (added in migration 009) ────────────────────────────────
ALTER TABLE crm_accounts
  DROP CONSTRAINT IF EXISTS crm_accounts_bu_check;
ALTER TABLE crm_accounts
  ADD CONSTRAINT crm_accounts_bu_check
    CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));

-- ─── crm_pipeline_snapshot.bu ────────────────────────────────────────────────
-- No CHECK constraint on this table — only informational, so no change needed.
