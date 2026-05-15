-- =============================================================================
-- AWQ PPM — Historical Snapshots Table
-- Stores portfolio metrics permanently by day, month and year for trend analysis.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_snapshots (
  snapshot_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  snapshot_date         DATE          NOT NULL,
  granularity           TEXT          NOT NULL CHECK (granularity IN ('day', 'month', 'year')),
  period_label          TEXT          NOT NULL,  -- '2026-05-15' | '2026-05' | '2026'
  bu_code               TEXT,                    -- NULL = entire portfolio

  -- Project counts
  total_projects        INTEGER       NOT NULL DEFAULT 0,
  active_projects       INTEGER       NOT NULL DEFAULT 0,
  completed_projects    INTEGER       NOT NULL DEFAULT 0,
  on_hold_projects      INTEGER       NOT NULL DEFAULT 0,

  -- Financials
  total_budget_revenue  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_actual_revenue  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_budget_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_actual_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_budget_margin   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_actual_margin   NUMERIC(15,2) NOT NULL DEFAULT 0,
  avg_margin_pct        NUMERIC(6,2)  NOT NULL DEFAULT 0,

  -- Health
  green_count           INTEGER       NOT NULL DEFAULT 0,
  yellow_count          INTEGER       NOT NULL DEFAULT 0,
  red_count             INTEGER       NOT NULL DEFAULT 0,

  -- Hours
  total_budget_hours    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_actual_hours    NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- People & schedule
  total_team_members    INTEGER       NOT NULL DEFAULT 0,
  overdue_tasks         INTEGER       NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (snapshot_date, granularity, bu_code)
);

CREATE INDEX IF NOT EXISTS idx_ppm_snap_date        ON ppm_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_ppm_snap_granularity ON ppm_snapshots(granularity);
CREATE INDEX IF NOT EXISTS idx_ppm_snap_bu          ON ppm_snapshots(bu_code);
CREATE INDEX IF NOT EXISTS idx_ppm_snap_period      ON ppm_snapshots(period_label);
