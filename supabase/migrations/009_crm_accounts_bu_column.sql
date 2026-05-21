-- Add bu column to crm_accounts and fix crm_opportunities FK columns
-- Idempotente — seguro rodar múltiplas vezes.

-- ─── 1. crm_accounts: adiciona coluna bu ─────────────────────────────────────
ALTER TABLE crm_accounts
  ADD COLUMN IF NOT EXISTS bu TEXT NOT NULL DEFAULT 'JACQES'
    CHECK (bu IN ('JACQES','CAZA','ADVISOR','VENTURE','ENRD'));

CREATE INDEX IF NOT EXISTS idx_crm_accounts_bu ON crm_accounts(bu);

-- ─── 2. crm_accounts: view de account_health (complementa migration 007) ─────
DROP VIEW IF EXISTS v_crm_account_health CASCADE;
CREATE OR REPLACE VIEW v_crm_account_health AS
SELECT
  a.account_id,
  a.account_code,
  a.account_name,
  a.bu,
  a.owner,
  a.account_type,
  a.health_score,
  a.churn_risk,
  a.renewal_date,
  COUNT(DISTINCT o.opportunity_id) FILTER (WHERE o.stage NOT IN ('closed_won','closed_lost')) AS open_opps,
  COUNT(DISTINCT act.activity_id)                                                              AS total_activities,
  MAX(act.completed_at)                                                                        AS last_activity_at
FROM crm_accounts a
LEFT JOIN crm_opportunities o   ON o.account_id = a.account_id
LEFT JOIN crm_activities    act ON act.related_to_type = 'account'
                                AND act.related_to_id  = a.account_id
GROUP BY a.account_id, a.account_code, a.account_name, a.bu, a.owner,
         a.account_type, a.health_score, a.churn_risk, a.renewal_date;
