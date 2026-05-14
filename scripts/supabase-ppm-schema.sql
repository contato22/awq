-- ─── AWQ PPM — Supabase Schema ───────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Tables use TEXT primary keys (UUIDs stored as text for simplicity).
-- RLS is disabled — this is an internal app accessed via anon key.

-- ─── ppm_projects ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_projects (
  project_id           TEXT PRIMARY KEY,
  project_code         TEXT NOT NULL,
  project_name         TEXT NOT NULL,
  customer_id          TEXT,
  customer_name        TEXT,
  bu_code              TEXT NOT NULL,
  bu_name              TEXT,
  opportunity_id       TEXT,
  project_type         TEXT NOT NULL DEFAULT 'one_off',
  service_category     TEXT,
  contract_type        TEXT NOT NULL DEFAULT 'fixed_price',
  start_date           DATE NOT NULL,
  planned_end_date     DATE NOT NULL,
  actual_end_date      DATE,
  baseline_end_date    DATE,
  budget_hours         NUMERIC,
  actual_hours         NUMERIC NOT NULL DEFAULT 0,
  budget_cost          NUMERIC NOT NULL DEFAULT 0,
  actual_cost          NUMERIC NOT NULL DEFAULT 0,
  budget_revenue       NUMERIC NOT NULL DEFAULT 0,
  actual_revenue       NUMERIC NOT NULL DEFAULT 0,
  margin_target        NUMERIC,
  project_manager_id   TEXT,
  project_manager      TEXT,
  account_manager_id   TEXT,
  description          TEXT,
  objectives           TEXT,
  scope                TEXT,
  success_criteria     TEXT,
  phase                TEXT NOT NULL DEFAULT 'initiation',
  status               TEXT NOT NULL DEFAULT 'active',
  health_status        TEXT NOT NULL DEFAULT 'green',
  health_notes         TEXT,
  priority             TEXT NOT NULL DEFAULT 'medium',
  strategic_alignment  NUMERIC,
  roi_estimate         NUMERIC,
  billing_frequency    TEXT,
  next_billing_date    DATE,
  tags                 TEXT[],
  notes                TEXT,
  completion_pct       NUMERIC DEFAULT 0,
  team_size            INTEGER DEFAULT 0,
  schedule_variance_days INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           TEXT
);

ALTER TABLE ppm_projects DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_projects TO anon;

-- ─── ppm_tasks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_tasks (
  task_id              TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  parent_task_id       TEXT,
  task_name            TEXT NOT NULL,
  description          TEXT,
  task_type            TEXT NOT NULL DEFAULT 'task',
  wbs_code             TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  assigned_to          TEXT,
  assigned_name        TEXT,
  estimated_hours      NUMERIC,
  actual_hours         NUMERIC NOT NULL DEFAULT 0,
  start_date           DATE,
  due_date             DATE,
  completed_date       DATE,
  baseline_due_date    DATE,
  status               TEXT NOT NULL DEFAULT 'not_started',
  completion_pct       NUMERIC NOT NULL DEFAULT 0,
  dependencies         TEXT[],
  is_deliverable       BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason       TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_tasks DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_tasks TO anon;

-- ─── ppm_milestones ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_milestones (
  milestone_id         TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  milestone_name       TEXT NOT NULL,
  description          TEXT,
  planned_date         DATE NOT NULL,
  actual_date          DATE,
  baseline_date        DATE,
  status               TEXT NOT NULL DEFAULT 'upcoming',
  triggers_payment     BOOLEAN NOT NULL DEFAULT FALSE,
  payment_amount       NUMERIC,
  payment_percentage   NUMERIC,
  requires_approval    BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by          TEXT,
  approved_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_milestones DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_milestones TO anon;

-- ─── ppm_allocations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_allocations (
  allocation_id        TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  user_id              TEXT NOT NULL,
  user_name            TEXT,
  role                 TEXT NOT NULL,
  allocation_pct       NUMERIC NOT NULL DEFAULT 0,
  hours_per_week       NUMERIC,
  start_date           DATE NOT NULL,
  end_date             DATE,
  billable_rate        NUMERIC,
  cost_rate            NUMERIC,
  is_billable          BOOLEAN NOT NULL DEFAULT TRUE,
  status               TEXT NOT NULL DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_allocations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_allocations TO anon;

-- ─── ppm_time_entries ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_time_entries (
  entry_id             TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  user_name            TEXT,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  task_id              TEXT,
  task_name            TEXT,
  entry_date           DATE NOT NULL,
  hours                NUMERIC NOT NULL,
  is_billable          BOOLEAN NOT NULL DEFAULT TRUE,
  billing_rate         NUMERIC,
  cost_rate            NUMERIC,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'submitted',
  submitted_at         TIMESTAMPTZ,
  approved_by          TEXT,
  approved_at          TIMESTAMPTZ,
  rejection_reason     TEXT,
  invoiced             BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_id           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_time_entries DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_time_entries TO anon;

-- ─── ppm_risks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_risks (
  risk_id              TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  risk_description     TEXT NOT NULL,
  impact               TEXT NOT NULL DEFAULT 'medium',
  probability          TEXT NOT NULL DEFAULT 'medium',
  risk_score           INTEGER,
  mitigation_plan      TEXT,
  contingency_plan     TEXT,
  owner_id             TEXT,
  owner_name           TEXT,
  status               TEXT NOT NULL DEFAULT 'identified',
  identified_date      DATE NOT NULL,
  closed_date          DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_risks DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_risks TO anon;

-- ─── ppm_issues ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_issues (
  issue_id             TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  issue_description    TEXT NOT NULL,
  severity             TEXT NOT NULL DEFAULT 'medium',
  reported_by          TEXT,
  reported_by_name     TEXT,
  assigned_to          TEXT,
  assigned_name        TEXT,
  status               TEXT NOT NULL DEFAULT 'open',
  resolution           TEXT,
  reported_date        DATE NOT NULL,
  resolved_date        DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_issues DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_issues TO anon;

-- ─── ppm_comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppm_comments (
  comment_id           TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  project_name         TEXT,
  task_id              TEXT,
  task_name            TEXT,
  author_id            TEXT,
  author_name          TEXT NOT NULL,
  body                 TEXT NOT NULL,
  mentions             TEXT[],
  parent_comment_id    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppm_comments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ppm_comments TO anon;
