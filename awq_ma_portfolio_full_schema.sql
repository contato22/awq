-- =============================================================================
-- AWQ GROUP — M&A & Portfolio Management Full Schema (PostgreSQL / Neon)
-- =============================================================================
-- Module: Holding-Level M&A & Portfolio Management
-- Extends: EPM (general_ledger, business_units, accounts)
--          CRM (accounts)
--          PPM (projects)
-- Principle: EXTEND, not REPLACE. Zero breaking changes on existing tables.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. DEALS (M&A Deal Pipeline)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_deals (
  deal_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_code             TEXT        NOT NULL UNIQUE,                -- "DEAL-2026-001"
  deal_name             TEXT        NOT NULL,
  company_name          TEXT        NOT NULL,
  company_website       TEXT,
  industry              TEXT,
  company_stage         TEXT,                                       -- pre_seed, seed, series_a, growth
  deal_type             TEXT        NOT NULL DEFAULT 'm4e',         -- m4e, equity_investment, acquisition

  -- Pipeline
  pipeline_stage        TEXT        NOT NULL DEFAULT 'sourcing',    -- sourcing, screening, due_diligence, structuring, ic_review, closed_won, closed_lost
  lead_source           TEXT,                                       -- inbound, outbound, referral, event
  lead_source_detail    TEXT,

  -- Screening scores (0-25 each, total 0-100)
  market_score          NUMERIC(5,2) DEFAULT 0,
  team_score            NUMERIC(5,2) DEFAULT 0,
  product_score         NUMERIC(5,2) DEFAULT 0,
  traction_score        NUMERIC(5,2) DEFAULT 0,
  total_score           NUMERIC(5,2) DEFAULT 0,
  screening_decision    TEXT,                                       -- pass, no_go, pending
  screening_notes       TEXT,

  -- Due Diligence
  dd_status             TEXT        DEFAULT 'not_started',          -- not_started, in_progress, completed
  dd_completion_pct     NUMERIC(5,2) DEFAULT 0,
  dd_start_date         DATE,
  dd_end_date           DATE,

  -- Deal Terms
  proposed_valuation          NUMERIC(15,2),
  proposed_investment_amount  NUMERIC(15,2),
  proposed_equity_pct         NUMERIC(5,2),
  media_commitment_value      NUMERIC(15,2),
  media_delivery_period_months INTEGER,
  board_seat                  BOOLEAN DEFAULT FALSE,
  observer_rights             BOOLEAN DEFAULT FALSE,
  vesting_period_years        INTEGER,
  vesting_cliff_months        INTEGER,

  -- IC
  ic_memo_url           TEXT,
  ic_presentation_url   TEXT,
  ic_meeting_date       DATE,
  ic_decision           TEXT,                                       -- approved, rejected, deferred
  ic_decision_date      DATE,
  ic_decision_notes     TEXT,

  -- Closing
  expected_close_date   DATE,
  actual_close_date     DATE,
  close_reason          TEXT,
  close_notes           TEXT,

  -- Link to portco (if closed_won)
  portco_id             UUID,                                       -- FK → ma_portfolio_companies.portco_id (added below)

  -- Ownership
  deal_lead             TEXT,                                       -- "Miguel"

  tags                  JSONB,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT
);

CREATE INDEX IF NOT EXISTS idx_ma_deals_stage   ON ma_deals(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_ma_deals_type    ON ma_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_ma_deals_portco  ON ma_deals(portco_id);

CREATE OR REPLACE FUNCTION calculate_ma_deal_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_score = COALESCE(NEW.market_score,0) + COALESCE(NEW.team_score,0)
                  + COALESCE(NEW.product_score,0) + COALESCE(NEW.traction_score,0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_deal_score ON ma_deals;
CREATE TRIGGER trg_ma_deal_score
  BEFORE INSERT OR UPDATE ON ma_deals
  FOR EACH ROW EXECUTE FUNCTION calculate_ma_deal_score();

DROP TRIGGER IF EXISTS trg_ma_deals_updated_at ON ma_deals;
CREATE TRIGGER trg_ma_deals_updated_at
  BEFORE UPDATE ON ma_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. PORTFOLIO COMPANIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_portfolio_companies (
  portco_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_code           TEXT        NOT NULL UNIQUE,                -- "PORTCO-2026-001"
  legal_name            TEXT        NOT NULL,
  trade_name            TEXT,
  document_number       TEXT,                                       -- CNPJ

  -- Deal link
  deal_id               UUID        REFERENCES ma_deals(deal_id),
  deal_type             TEXT        DEFAULT 'm4e',

  -- Investment
  investment_date       DATE        NOT NULL,
  awq_ownership_pct     NUMERIC(5,2),
  awq_shares_held       BIGINT,
  total_shares_outstanding BIGINT,

  -- Valuation
  entry_valuation       NUMERIC(15,2),
  current_valuation     NUMERIC(15,2),
  valuation_date        DATE,

  -- M4E media commitment
  media_commitment_value    NUMERIC(15,2),
  media_delivered_value     NUMERIC(15,2) DEFAULT 0,
  media_remaining_value     NUMERIC(15,2),
  media_delivery_start_date DATE,
  media_delivery_end_date   DATE,

  -- Governance
  board_seat            BOOLEAN DEFAULT FALSE,
  observer_rights       BOOLEAN DEFAULT FALSE,
  board_meeting_frequency TEXT,                                     -- monthly, quarterly

  -- Company info
  company_stage         TEXT,
  ceo_name              TEXT,
  ceo_email             TEXT,
  ceo_phone             TEXT,
  website               TEXT,
  industry              TEXT,
  sector                TEXT,

  -- Status
  status                TEXT        NOT NULL DEFAULT 'active',      -- active, exited, written_off

  -- Exit
  exit_date             DATE,
  exit_type             TEXT,                                       -- acquisition, ipo, secondary_sale
  exit_valuation        NUMERIC(15,2),
  exit_proceeds         NUMERIC(15,2),

  tags                  JSONB,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT
);

CREATE INDEX IF NOT EXISTS idx_ma_portco_status ON ma_portfolio_companies(status);
CREATE INDEX IF NOT EXISTS idx_ma_portco_deal   ON ma_portfolio_companies(deal_id);

-- Auto-calc media_remaining_value
CREATE OR REPLACE FUNCTION update_ma_media_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.media_remaining_value = COALESCE(NEW.media_commitment_value,0) - COALESCE(NEW.media_delivered_value,0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_media_remaining ON ma_portfolio_companies;
CREATE TRIGGER trg_ma_media_remaining
  BEFORE INSERT OR UPDATE ON ma_portfolio_companies
  FOR EACH ROW EXECUTE FUNCTION update_ma_media_remaining();

DROP TRIGGER IF EXISTS trg_ma_portco_updated_at ON ma_portfolio_companies;
CREATE TRIGGER trg_ma_portco_updated_at
  BEFORE UPDATE ON ma_portfolio_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK from ma_deals.portco_id
ALTER TABLE ma_deals
  ADD CONSTRAINT fk_ma_deals_portco
  FOREIGN KEY (portco_id) REFERENCES ma_portfolio_companies(portco_id)
  DEFERRABLE INITIALLY DEFERRED;

-- =============================================================================
-- 3. DUE DILIGENCE ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_due_diligence_items (
  dd_item_id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID  NOT NULL REFERENCES ma_deals(deal_id) ON DELETE CASCADE,

  dd_category   TEXT  NOT NULL,                                     -- financial, legal, commercial, technical, esg
  item_name     TEXT  NOT NULL,
  item_description TEXT,

  status        TEXT  DEFAULT 'pending',                            -- pending, in_progress, completed, not_applicable
  completion_pct NUMERIC(5,2) DEFAULT 0,

  finding       TEXT,                                               -- clear, minor_issue, major_issue, red_flag
  finding_notes TEXT,
  risk_level    TEXT,                                               -- low, medium, high, critical

  documents     JSONB,                                              -- [{name, url}]
  assigned_to   TEXT,
  due_date      DATE,
  completed_date DATE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_dd_deal     ON ma_due_diligence_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_ma_dd_category ON ma_due_diligence_items(dd_category);
CREATE INDEX IF NOT EXISTS idx_ma_dd_status   ON ma_due_diligence_items(status);

DROP TRIGGER IF EXISTS trg_ma_dd_updated_at ON ma_due_diligence_items;
CREATE TRIGGER trg_ma_dd_updated_at
  BEFORE UPDATE ON ma_due_diligence_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. CAP TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_cap_table (
  cap_table_id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id       UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  shareholder_name   TEXT NOT NULL,
  shareholder_type   TEXT,                                          -- founder, investor, employee, advisor
  shareholder_entity TEXT,

  share_class     TEXT DEFAULT 'common',                            -- common, preferred, options
  shares_held     BIGINT NOT NULL,
  ownership_pct   NUMERIC(5,2),

  -- Vesting
  vesting_schedule    TEXT,
  vesting_start_date  DATE,
  vesting_cliff_date  DATE,
  vesting_end_date    DATE,
  shares_vested       BIGINT DEFAULT 0,
  shares_unvested     BIGINT,

  cost_per_share    NUMERIC(15,6),
  total_cost_basis  NUMERIC(15,2),
  acquisition_date  DATE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_cap_table_portco ON ma_cap_table(portco_id);

-- Auto-calc ownership_pct & unvested
CREATE OR REPLACE FUNCTION update_ma_ownership_pct()
RETURNS TRIGGER AS $$
DECLARE
  total_shares BIGINT;
BEGIN
  SELECT total_shares_outstanding INTO total_shares
  FROM ma_portfolio_companies WHERE portco_id = NEW.portco_id;

  IF total_shares IS NOT NULL AND total_shares > 0 THEN
    NEW.ownership_pct = ROUND((NEW.shares_held::NUMERIC / total_shares::NUMERIC) * 100, 2);
  END IF;
  NEW.shares_unvested = NEW.shares_held - COALESCE(NEW.shares_vested, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_ownership_pct ON ma_cap_table;
CREATE TRIGGER trg_ma_ownership_pct
  BEFORE INSERT OR UPDATE ON ma_cap_table
  FOR EACH ROW EXECUTE FUNCTION update_ma_ownership_pct();

DROP TRIGGER IF EXISTS trg_ma_cap_table_updated_at ON ma_cap_table;
CREATE TRIGGER trg_ma_cap_table_updated_at
  BEFORE UPDATE ON ma_cap_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. PORTCO KPIs (Monthly Reporting)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_portco_kpis (
  kpi_id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id       UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  reporting_date  DATE  NOT NULL,
  year_month      TEXT,                                             -- "2026-03"

  -- Financial
  mrr             NUMERIC(15,2),
  arr             NUMERIC(15,2),
  total_revenue   NUMERIC(15,2),
  gross_margin_pct NUMERIC(5,2),
  burn_rate       NUMERIC(15,2),
  cash_balance    NUMERIC(15,2),
  runway_months   NUMERIC(5,1),

  -- Growth
  mom_growth_pct  NUMERIC(5,2),
  yoy_growth_pct  NUMERIC(5,2),
  cac             NUMERIC(15,2),
  ltv             NUMERIC(15,2),
  ltv_cac_ratio   NUMERIC(5,2),

  -- Operational
  gmv             NUMERIC(15,2),
  active_users    INTEGER,
  new_users       INTEGER,
  churn_rate_pct  NUMERIC(5,2),
  nps             NUMERIC(5,2),
  headcount       INTEGER,

  -- Milestones
  product_launched        BOOLEAN DEFAULT FALSE,
  funding_round_closed    BOOLEAN DEFAULT FALSE,

  notes           TEXT,
  submitted_by    TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(portco_id, reporting_date)
);

CREATE INDEX IF NOT EXISTS idx_ma_kpis_portco ON ma_portco_kpis(portco_id);
CREATE INDEX IF NOT EXISTS idx_ma_kpis_date   ON ma_portco_kpis(reporting_date);
CREATE INDEX IF NOT EXISTS idx_ma_kpis_month  ON ma_portco_kpis(year_month);

-- Auto-set year_month, ARR, runway, LTV:CAC
CREATE OR REPLACE FUNCTION ma_kpi_derived()
RETURNS TRIGGER AS $$
BEGIN
  NEW.year_month = TO_CHAR(NEW.reporting_date, 'YYYY-MM');
  IF NEW.mrr IS NOT NULL THEN NEW.arr = NEW.mrr * 12; END IF;
  IF NEW.cash_balance IS NOT NULL AND NEW.burn_rate IS NOT NULL AND NEW.burn_rate < 0 THEN
    NEW.runway_months = ROUND(NEW.cash_balance / ABS(NEW.burn_rate), 1);
  END IF;
  IF NEW.ltv IS NOT NULL AND NEW.cac IS NOT NULL AND NEW.cac > 0 THEN
    NEW.ltv_cac_ratio = ROUND(NEW.ltv / NEW.cac, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_kpi_derived ON ma_portco_kpis;
CREATE TRIGGER trg_ma_kpi_derived
  BEFORE INSERT OR UPDATE ON ma_portco_kpis
  FOR EACH ROW EXECUTE FUNCTION ma_kpi_derived();

DROP TRIGGER IF EXISTS trg_ma_kpis_updated_at ON ma_portco_kpis;
CREATE TRIGGER trg_ma_kpis_updated_at
  BEFORE UPDATE ON ma_portco_kpis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. BOARD MEETINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_board_meetings (
  meeting_id      UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id       UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  meeting_date    DATE  NOT NULL,
  meeting_type    TEXT  DEFAULT 'regular',                          -- regular, special, annual
  agenda          TEXT,

  board_deck_url          TEXT,
  financial_report_url    TEXT,
  other_materials         JSONB,

  attendees               JSONB,
  awq_representative      TEXT,

  minutes_url     TEXT,
  resolutions     JSONB,
  action_items    JSONB,

  status          TEXT  DEFAULT 'scheduled',                        -- scheduled, completed, cancelled
  notes           TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_board_portco ON ma_board_meetings(portco_id);
CREATE INDEX IF NOT EXISTS idx_ma_board_date   ON ma_board_meetings(meeting_date);

DROP TRIGGER IF EXISTS trg_ma_board_updated_at ON ma_board_meetings;
CREATE TRIGGER trg_ma_board_updated_at
  BEFORE UPDATE ON ma_board_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. MEDIA DELIVERABLES (M4E Tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_media_deliverables (
  deliverable_id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id         UUID  NOT NULL REFERENCES ma_portfolio_companies(portco_id) ON DELETE CASCADE,

  deliverable_type  TEXT  NOT NULL,                                 -- social_media, video_production, branding, campaign, event
  description       TEXT,
  agreed_value      NUMERIC(15,2),

  executing_bu      TEXT,                                           -- JACQES, CAZA, STUDIO
  project_ref       TEXT,                                           -- project reference from PPM

  scheduled_delivery_date DATE,
  actual_delivery_date    DATE,

  status            TEXT  DEFAULT 'planned',                        -- planned, in_progress, delivered, approved

  approved_by_portco BOOLEAN DEFAULT FALSE,
  approval_date      DATE,
  approval_notes     TEXT,
  deliverable_url    TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_media_portco ON ma_media_deliverables(portco_id);
CREATE INDEX IF NOT EXISTS idx_ma_media_bu     ON ma_media_deliverables(executing_bu);

-- Auto-update portco.media_delivered_value when deliverable approved
CREATE OR REPLACE FUNCTION update_ma_portco_media_delivered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_by_portco = TRUE THEN
    UPDATE ma_portfolio_companies
    SET media_delivered_value = (
      SELECT COALESCE(SUM(agreed_value), 0)
      FROM ma_media_deliverables
      WHERE portco_id = NEW.portco_id
        AND status = 'approved' AND approved_by_portco = TRUE
    )
    WHERE portco_id = NEW.portco_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ma_media_delivered ON ma_media_deliverables;
CREATE TRIGGER trg_ma_media_delivered
  AFTER INSERT OR UPDATE ON ma_media_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_ma_portco_media_delivered();

DROP TRIGGER IF EXISTS trg_ma_media_updated_at ON ma_media_deliverables;
CREATE TRIGGER trg_ma_media_updated_at
  BEFORE UPDATE ON ma_media_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. INTERCOMPANY TRANSACTIONS (Consolidation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_intercompany_transactions (
  ic_transaction_id UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  transaction_date  DATE  NOT NULL,
  transaction_type  TEXT,                                           -- sale, loan, shared_service_allocation, dividend, media_delivery

  from_entity_type  TEXT,                                           -- bu, portco, holding
  from_entity_id    TEXT,
  from_entity_name  TEXT,

  to_entity_type    TEXT,
  to_entity_id      TEXT,
  to_entity_name    TEXT,

  amount            NUMERIC(15,2) NOT NULL,
  debit_account_code  TEXT,                                         -- GL account codes for elimination
  credit_account_code TEXT,

  description       TEXT,
  source_system     TEXT,                                           -- epm, ppm, ma

  elimination_status TEXT DEFAULT 'pending',                        -- pending, eliminated, excluded
  elimination_date   DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_ic_date         ON ma_intercompany_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ma_ic_from_entity  ON ma_intercompany_transactions(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_ma_ic_to_entity    ON ma_intercompany_transactions(to_entity_id);

-- =============================================================================
-- 9. SYNERGY OPPORTUNITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_synergy_opportunities (
  synergy_id        UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  synergy_type      TEXT,                                           -- cross_selling, shared_resource, knowledge_sharing, cost_reduction
  opportunity_name  TEXT,
  description       TEXT,

  source_bu         TEXT,
  target_bu         TEXT,
  portco_id         UUID  REFERENCES ma_portfolio_companies(portco_id),

  estimated_revenue_impact  NUMERIC(15,2),
  estimated_cost_savings    NUMERIC(15,2),

  status            TEXT  DEFAULT 'identified',                     -- identified, in_progress, realized, abandoned

  identified_date   DATE  DEFAULT CURRENT_DATE,
  realization_date  DATE,

  actual_revenue_impact  NUMERIC(15,2),
  actual_cost_savings    NUMERIC(15,2),

  owner             TEXT,
  notes             TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_synergy_portco ON ma_synergy_opportunities(portco_id);

DROP TRIGGER IF EXISTS trg_ma_synergy_updated_at ON ma_synergy_opportunities;
CREATE TRIGGER trg_ma_synergy_updated_at
  BEFORE UPDATE ON ma_synergy_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 10. INVESTMENT COMMITTEE MEETINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ma_ic_meetings (
  ic_meeting_id   UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  meeting_date    DATE  NOT NULL,
  meeting_type    TEXT  DEFAULT 'regular',
  attendees       JSONB,
  deals_reviewed  JSONB,                                            -- [deal_id, ...]
  minutes_url     TEXT,
  status          TEXT  DEFAULT 'scheduled',                        -- scheduled, completed, cancelled

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_ic_meetings_date ON ma_ic_meetings(meeting_date);

CREATE TABLE IF NOT EXISTS ma_ic_decisions (
  ic_decision_id  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),

  ic_meeting_id   UUID  REFERENCES ma_ic_meetings(ic_meeting_id),
  deal_id         UUID  NOT NULL REFERENCES ma_deals(deal_id),

  decision        TEXT  NOT NULL,                                   -- approved, rejected, deferred
  decision_date   DATE  NOT NULL,
  votes           JSONB,                                            -- [{member, vote}]
  vote_result     TEXT,                                             -- unanimous, majority, split
  decision_rationale TEXT,
  conditions      TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_ic_decisions_deal    ON ma_ic_decisions(deal_id);
CREATE INDEX IF NOT EXISTS idx_ma_ic_decisions_meeting ON ma_ic_decisions(ic_meeting_id);

-- =============================================================================
-- 11. CONSOLIDATED VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_ma_portfolio_dashboard AS
SELECT
  pc.portco_id,
  pc.portco_code,
  pc.legal_name,
  pc.trade_name,
  pc.awq_ownership_pct,
  pc.entry_valuation,
  pc.current_valuation,
  pc.current_valuation - pc.entry_valuation                                           AS unrealized_gain,
  CASE WHEN pc.entry_valuation > 0
    THEN ROUND(pc.current_valuation / pc.entry_valuation, 2) ELSE NULL END            AS valuation_multiple,
  pc.media_commitment_value,
  pc.media_delivered_value,
  pc.media_remaining_value,
  CASE WHEN pc.media_commitment_value > 0
    THEN ROUND((pc.media_delivered_value / pc.media_commitment_value) * 100, 1)
    ELSE 0 END                                                                        AS media_delivery_pct,
  k.mrr            AS latest_mrr,
  k.arr            AS latest_arr,
  k.burn_rate      AS latest_burn,
  k.runway_months  AS latest_runway,
  k.mom_growth_pct AS latest_mom_growth,
  k.headcount      AS latest_headcount,
  k.reporting_date AS kpi_as_of,
  pc.company_stage,
  pc.status,
  pc.investment_date,
  pc.industry,
  pc.ceo_name,
  pc.board_seat,
  pc.deal_type
FROM ma_portfolio_companies pc
LEFT JOIN LATERAL (
  SELECT * FROM ma_portco_kpis
  WHERE portco_id = pc.portco_id
  ORDER BY reporting_date DESC LIMIT 1
) k ON TRUE
ORDER BY pc.current_valuation DESC;

CREATE OR REPLACE VIEW v_ma_deal_pipeline AS
SELECT
  d.*,
  COUNT(dd.dd_item_id)                                              AS dd_total_items,
  COUNT(dd.dd_item_id) FILTER (WHERE dd.status = 'completed')      AS dd_completed_items
FROM ma_deals d
LEFT JOIN ma_due_diligence_items dd ON dd.deal_id = d.deal_id
GROUP BY d.deal_id;

CREATE OR REPLACE VIEW v_ma_pipeline_funnel AS
SELECT
  pipeline_stage,
  COUNT(*)                               AS deal_count,
  SUM(proposed_investment_amount)        AS total_investment,
  AVG(total_score)                       AS avg_score
FROM ma_deals
WHERE pipeline_stage NOT IN ('closed_won', 'closed_lost')
GROUP BY pipeline_stage
ORDER BY CASE pipeline_stage
  WHEN 'sourcing'      THEN 1
  WHEN 'screening'     THEN 2
  WHEN 'due_diligence' THEN 3
  WHEN 'structuring'   THEN 4
  WHEN 'ic_review'     THEN 5 END;

-- =============================================================================
-- 12. SEED DATA — Enerdy (first portco, M4E deal March 2026)
-- =============================================================================

-- Deal
INSERT INTO ma_deals (
  deal_code, deal_name, company_name, industry, company_stage, deal_type,
  pipeline_stage, lead_source,
  market_score, team_score, product_score, traction_score,
  proposed_valuation, proposed_investment_amount, proposed_equity_pct,
  media_commitment_value, media_delivery_period_months,
  board_seat, observer_rights,
  ic_decision, ic_decision_date,
  actual_close_date, close_reason,
  deal_lead, created_by
) VALUES (
  'DEAL-2026-001', 'Enerdy M4E Deal', 'Grupo Energdy',
  'Energia / Utilities', 'pre_seed', 'm4e',
  'closed_won', 'referral',
  20, 18, 15, 12,
  1000000, 200000, 20,
  200000, 24,
  FALSE, TRUE,
  'approved', '2026-02-28',
  '2026-03-01', 'won_terms',
  'Miguel', 'Miguel'
) ON CONFLICT (deal_code) DO NOTHING;

-- Portfolio Company
INSERT INTO ma_portfolio_companies (
  portco_code, legal_name, trade_name,
  deal_type, investment_date,
  awq_ownership_pct, awq_shares_held, total_shares_outstanding,
  entry_valuation, current_valuation, valuation_date,
  media_commitment_value, media_delivered_value,
  media_delivery_start_date, media_delivery_end_date,
  board_seat, observer_rights, board_meeting_frequency,
  company_stage, industry, sector,
  ceo_name, ceo_email, website,
  status, created_by
) VALUES (
  'PORTCO-2026-001', 'Grupo Energdy Soluções Ltda', 'Grupo Energdy',
  'm4e', '2026-03-01',
  20.00, 200000, 1000000,
  1000000, 1050000, '2026-04-30',
  200000, 24000,
  '2026-03-01', '2028-02-28',
  FALSE, TRUE, 'monthly',
  'pre_seed', 'Energia / Utilities', 'Energia',
  'Fundadores Energdy', 'contato@energdy.com.br', 'https://energdy.com.br',
  'active', 'Miguel'
) ON CONFLICT (portco_code) DO NOTHING;

-- Link deal → portco
UPDATE ma_deals d
SET portco_id = pc.portco_id
FROM ma_portfolio_companies pc
WHERE d.deal_code = 'DEAL-2026-001' AND pc.portco_code = 'PORTCO-2026-001';

-- Cap Table — Enerdy
INSERT INTO ma_cap_table (portco_id, shareholder_name, shareholder_type, shareholder_entity,
  share_class, shares_held, shares_vested, cost_per_share, total_cost_basis, acquisition_date)
SELECT
  pc.portco_id, 'Fundadores Energdy', 'founder', 'Fundadores',
  'common', 700000, 700000, 1.00, 700000, '2023-01-01'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_cap_table (portco_id, shareholder_name, shareholder_type, shareholder_entity,
  share_class, shares_held, shares_vested,
  vesting_schedule, vesting_start_date, vesting_cliff_date, vesting_end_date,
  cost_per_share, total_cost_basis, acquisition_date)
SELECT
  pc.portco_id, 'AWQ Group', 'investor', 'AWQ Produções Ltda',
  'common', 200000, 0,
  '4 anos, 1 ano cliff, vesting mensal', '2026-03-01', '2027-03-01', '2030-03-01',
  1.00, 200000, '2026-03-01'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_cap_table (portco_id, shareholder_name, shareholder_type, shareholder_entity,
  share_class, shares_held, shares_vested, cost_per_share, total_cost_basis, acquisition_date)
SELECT
  pc.portco_id, 'Investidores Anjos', 'investor', 'Angels Round',
  'common', 100000, 100000, 1.50, 150000, '2025-06-01'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- KPIs Enerdy — Mar/2026
INSERT INTO ma_portco_kpis (portco_id, reporting_date, mrr, total_revenue,
  gross_margin_pct, burn_rate, cash_balance, mom_growth_pct, headcount, notes, submitted_by)
SELECT
  pc.portco_id, '2026-03-31', 8500, 8500,
  65, -22000, 180000, NULL, 4,
  'Primeiro mês pós deal AWQ. MRR inicial, queimando caixa na estruturação.', 'Miguel'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT (portco_id, reporting_date) DO NOTHING;

INSERT INTO ma_portco_kpis (portco_id, reporting_date, mrr, total_revenue,
  gross_margin_pct, burn_rate, cash_balance, mom_growth_pct, headcount, notes, submitted_by)
SELECT
  pc.portco_id, '2026-04-30', 11200, 11200,
  68, -19500, 160500, 31.76, 5,
  'Crescimento forte no MRR (+32% MoM). Novo cliente enterprise fechado.', 'Miguel'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT (portco_id, reporting_date) DO NOTHING;

-- Media Deliverables — Enerdy
INSERT INTO ma_media_deliverables (portco_id, deliverable_type, description,
  agreed_value, executing_bu, scheduled_delivery_date, actual_delivery_date,
  status, approved_by_portco, approval_date)
SELECT
  pc.portco_id, 'social_media', 'Gestão de redes sociais — Março 2026',
  8000, 'JACQES', '2026-03-31', '2026-03-31',
  'approved', TRUE, '2026-04-02'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_media_deliverables (portco_id, deliverable_type, description,
  agreed_value, executing_bu, scheduled_delivery_date, actual_delivery_date,
  status, approved_by_portco, approval_date)
SELECT
  pc.portco_id, 'social_media', 'Gestão de redes sociais — Abril 2026',
  8000, 'JACQES', '2026-04-30', '2026-04-30',
  'approved', TRUE, '2026-05-02'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_media_deliverables (portco_id, deliverable_type, description,
  agreed_value, executing_bu, scheduled_delivery_date,
  status, approved_by_portco)
SELECT
  pc.portco_id, 'video_production', 'Vídeo institucional — Identidade de marca Energdy',
  35000, 'CAZA', '2026-06-30',
  'in_progress', FALSE
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- Board Meetings — Enerdy
INSERT INTO ma_board_meetings (portco_id, meeting_date, meeting_type,
  agenda, awq_representative, status, notes)
SELECT
  pc.portco_id, '2026-04-10', 'regular',
  'Review financeiro Mar/2026 · KPIs operacionais · Roadmap produto Q2 · Status captação',
  'Miguel (AWQ)', 'completed',
  'Primeira board meeting pós investimento. Founders apresentaram plano Q2. AWQ confirmou entrega mídia on-track.'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- IC Meeting — aprovação Enerdy
INSERT INTO ma_ic_meetings (meeting_date, meeting_type, attendees, status)
VALUES ('2026-02-28', 'regular', '["Miguel (CEO/CIO)"]', 'completed')
ON CONFLICT DO NOTHING;

-- Synergy — JACQES gerencia mídia Enerdy
INSERT INTO ma_synergy_opportunities (synergy_type, opportunity_name, description,
  source_bu, portco_id, estimated_revenue_impact, status, owner)
SELECT
  'cross_selling',
  'JACQES × Energdy — Gestão de Mídia M4E',
  'JACQES entrega serviços de social media e conteúdo para Energdy como parte do deal M4E. Receita intercompany reconhecida no JACQES, eliminada na consolidação.',
  'JACQES', pc.portco_id, 200000, 'in_progress', 'Miguel'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

-- Intercompany — JACQES → Energdy (Mar + Apr media delivery)
INSERT INTO ma_intercompany_transactions (transaction_date, transaction_type,
  from_entity_type, from_entity_id, from_entity_name,
  to_entity_type, to_entity_id, to_entity_name,
  amount, debit_account_code, credit_account_code,
  description, source_system, elimination_status)
SELECT
  '2026-03-31', 'media_delivery',
  'bu', 'JACQES', 'JACQES',
  'portco', pc.portco_id::TEXT, 'Grupo Energdy',
  8000, '9.9.01', '9.9.02',
  'Social media management — Março 2026', 'ma', 'eliminated'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO ma_intercompany_transactions (transaction_date, transaction_type,
  from_entity_type, from_entity_id, from_entity_name,
  to_entity_type, to_entity_id, to_entity_name,
  amount, debit_account_code, credit_account_code,
  description, source_system, elimination_status)
SELECT
  '2026-04-30', 'media_delivery',
  'bu', 'JACQES', 'JACQES',
  'portco', pc.portco_id::TEXT, 'Grupo Energdy',
  8000, '9.9.01', '9.9.02',
  'Social media management — Abril 2026', 'ma', 'eliminated'
FROM ma_portfolio_companies pc WHERE pc.portco_code = 'PORTCO-2026-001'
ON CONFLICT DO NOTHING;
