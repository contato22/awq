-- =============================================================================
-- AWQ GROUP — PPM Full Schema (PostgreSQL / Neon)
-- Project Portfolio Management: projects, tasks, milestones, allocations,
-- time entries, risks, issues + analytical views.
-- =============================================================================
-- Run ONCE against your Neon database:
--   psql $DATABASE_URL < awq_ppm_full_schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Updated-at helper ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. PROJECTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_projects (
  project_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code        TEXT        NOT NULL UNIQUE,                 -- PRJ-2026-001
  project_name        TEXT        NOT NULL,

  -- Relationships
  customer_id         UUID        REFERENCES customers(customer_id),
  bu_code             TEXT        NOT NULL REFERENCES business_units(bu_code),
  opportunity_id      UUID,                                        -- FK → crm_opportunities

  -- Classification
  project_type        TEXT        NOT NULL CHECK (project_type IN ('one_off','retainer','internal','investment')),
  service_category    TEXT        CHECK (service_category IN ('social_media','video_production','consulting','m4e_deal','other')),
  contract_type       TEXT        NOT NULL CHECK (contract_type IN ('fixed_price','time_and_materials','retainer')),

  -- Dates
  start_date          DATE        NOT NULL,
  planned_end_date    DATE        NOT NULL,
  actual_end_date     DATE,
  baseline_end_date   DATE,

  -- Financials
  budget_hours        NUMERIC(10,2),
  actual_hours        NUMERIC(10,2)  NOT NULL DEFAULT 0,
  budget_cost         NUMERIC(15,2)  NOT NULL DEFAULT 0,
  actual_cost         NUMERIC(15,2)  NOT NULL DEFAULT 0,
  budget_revenue      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  actual_revenue      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  margin_target       NUMERIC(5,4),                               -- 0.73 = 73%

  -- People
  project_manager_id  UUID        REFERENCES users(user_id),
  account_manager_id  UUID        REFERENCES users(user_id),

  -- Scope
  description         TEXT,
  objectives          TEXT,
  scope               TEXT,
  success_criteria    TEXT,

  -- Status
  phase               TEXT        NOT NULL DEFAULT 'initiation'
                        CHECK (phase IN ('initiation','planning','execution','monitoring','closure')),
  status              TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','on_hold','completed','cancelled')),
  health_status       TEXT        NOT NULL DEFAULT 'green'
                        CHECK (health_status IN ('green','yellow','red')),
  health_notes        TEXT,

  -- Prioritisation
  priority            TEXT        NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low','medium','high','critical')),
  strategic_alignment NUMERIC(3,2),
  roi_estimate        NUMERIC(15,2),

  -- Billing
  billing_frequency   TEXT        CHECK (billing_frequency IN ('monthly','milestone','upon_completion')),
  next_billing_date   DATE,

  -- Meta
  tags                JSONB,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES users(user_id),
  updated_by          UUID        REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ppm_prj_bu      ON ppm_projects(bu_code);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_status  ON ppm_projects(status);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_health  ON ppm_projects(health_status);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_pm      ON ppm_projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_ppm_prj_cust    ON ppm_projects(customer_id);

CREATE OR REPLACE TRIGGER trg_ppm_projects_updated_at
  BEFORE UPDATE ON ppm_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calc actual_hours from time entries
CREATE OR REPLACE FUNCTION fn_ppm_update_project_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ppm_projects
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM ppm_time_entries
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calc actual_cost from AP (linked by project_id on accounts_payable)
CREATE OR REPLACE FUNCTION fn_ppm_update_project_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE ppm_projects
    SET actual_cost = (
      SELECT COALESCE(SUM(net_amount), 0)
      FROM accounts_payable
      WHERE project_id = NEW.project_id AND status = 'PAID'
    )
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calc actual_revenue from AR (linked by project_id on accounts_receivable)
CREATE OR REPLACE FUNCTION fn_ppm_update_project_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE ppm_projects
    SET actual_revenue = (
      SELECT COALESCE(SUM(net_amount), 0)
      FROM accounts_receivable
      WHERE project_id = NEW.project_id AND status = 'RECEIVED'
    )
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. TASKS (WBS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_tasks (
  task_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  parent_task_id      UUID        REFERENCES ppm_tasks(task_id),

  task_name           TEXT        NOT NULL,
  description         TEXT,
  task_type           TEXT        NOT NULL DEFAULT 'task'
                        CHECK (task_type IN ('milestone','task','phase')),

  wbs_code            TEXT,
  sort_order          INTEGER     NOT NULL DEFAULT 0,

  assigned_to         UUID        REFERENCES users(user_id),

  estimated_hours     NUMERIC(10,2),
  actual_hours        NUMERIC(10,2) NOT NULL DEFAULT 0,

  start_date          DATE,
  due_date            DATE,
  completed_date      DATE,
  baseline_due_date   DATE,

  status              TEXT        NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started','in_progress','completed','blocked','cancelled')),
  completion_pct      NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (completion_pct BETWEEN 0 AND 100),

  dependencies        JSONB,
  is_deliverable      BOOLEAN     NOT NULL DEFAULT FALSE,
  deliverable_desc    TEXT,
  blocked_reason      TEXT,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ppm_tasks_project  ON ppm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_tasks_assigned ON ppm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ppm_tasks_status   ON ppm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ppm_tasks_parent   ON ppm_tasks(parent_task_id);

CREATE OR REPLACE TRIGGER trg_ppm_tasks_updated_at
  BEFORE UPDATE ON ppm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-complete task when status set to completed
CREATE OR REPLACE FUNCTION fn_ppm_auto_complete_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completion_pct   := 100;
    NEW.completed_date   := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ppm_task_auto_complete
  BEFORE UPDATE ON ppm_tasks
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_auto_complete_task();

-- Auto-update task actual_hours from time entries
CREATE OR REPLACE FUNCTION fn_ppm_update_task_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.task_id, OLD.task_id) IS NOT NULL THEN
    UPDATE ppm_tasks
    SET actual_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM ppm_time_entries
      WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    )
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. MILESTONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_milestones (
  milestone_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,

  milestone_name      TEXT        NOT NULL,
  description         TEXT,

  planned_date        DATE        NOT NULL,
  actual_date         DATE,
  baseline_date       DATE,

  status              TEXT        NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming','achieved','missed','cancelled')),

  triggers_payment    BOOLEAN     NOT NULL DEFAULT FALSE,
  payment_amount      NUMERIC(15,2),
  payment_percentage  NUMERIC(5,2),

  requires_approval   BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by         UUID        REFERENCES users(user_id),
  approved_at         TIMESTAMPTZ,

  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_milestones_project ON ppm_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_milestones_status  ON ppm_milestones(status);

CREATE OR REPLACE TRIGGER trg_ppm_milestones_updated_at
  BEFORE UPDATE ON ppm_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. RESOURCE ALLOCATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_allocations (
  allocation_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(user_id),

  role                TEXT        NOT NULL,

  allocation_pct      NUMERIC(5,2) NOT NULL CHECK (allocation_pct BETWEEN 0 AND 200),
  hours_per_week      NUMERIC(5,2),

  start_date          DATE        NOT NULL,
  end_date            DATE,

  billable_rate       NUMERIC(10,2),
  cost_rate           NUMERIC(10,2),
  is_billable         BOOLEAN     NOT NULL DEFAULT TRUE,

  status              TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','completed','cancelled')),
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_alloc_project ON ppm_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_alloc_user    ON ppm_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_ppm_alloc_dates   ON ppm_allocations(start_date, end_date);

CREATE OR REPLACE TRIGGER trg_ppm_alloc_updated_at
  BEFORE UPDATE ON ppm_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. TIME ENTRIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_time_entries (
  entry_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id             UUID        NOT NULL REFERENCES users(user_id),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id),
  task_id             UUID        REFERENCES ppm_tasks(task_id),

  entry_date          DATE        NOT NULL,
  hours               NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),

  is_billable         BOOLEAN     NOT NULL DEFAULT TRUE,
  billing_rate        NUMERIC(10,2),
  cost_rate           NUMERIC(10,2),

  description         TEXT,

  status              TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_at        TIMESTAMPTZ,
  approved_by         UUID        REFERENCES users(user_id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,

  invoiced            BOOLEAN     NOT NULL DEFAULT FALSE,
  invoice_id          UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_te_user    ON ppm_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ppm_te_project ON ppm_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_te_task    ON ppm_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_ppm_te_date    ON ppm_time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ppm_te_status  ON ppm_time_entries(status);

CREATE OR REPLACE TRIGGER trg_ppm_te_updated_at
  BEFORE UPDATE ON ppm_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wire up project hours trigger
CREATE OR REPLACE TRIGGER trg_ppm_te_project_hours
  AFTER INSERT OR UPDATE OR DELETE ON ppm_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_update_project_hours();

-- Wire up task hours trigger
CREATE OR REPLACE TRIGGER trg_ppm_te_task_hours
  AFTER INSERT OR UPDATE OR DELETE ON ppm_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_update_task_hours();

-- =============================================================================
-- 6. RISKS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_risks (
  risk_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,

  risk_description    TEXT        NOT NULL,

  impact              TEXT        NOT NULL CHECK (impact IN ('low','medium','high')),
  probability         TEXT        NOT NULL CHECK (probability IN ('low','medium','high')),
  risk_score          INTEGER     CHECK (risk_score BETWEEN 1 AND 9),

  mitigation_plan     TEXT,
  contingency_plan    TEXT,

  owner_id            UUID        REFERENCES users(user_id),

  status              TEXT        NOT NULL DEFAULT 'identified'
                        CHECK (status IN ('identified','mitigating','occurred','closed')),

  identified_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  closed_date         DATE,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_risks_project ON ppm_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_risks_status  ON ppm_risks(status);

CREATE OR REPLACE TRIGGER trg_ppm_risks_updated_at
  BEFORE UPDATE ON ppm_risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate risk_score = impact_num × probability_num
CREATE OR REPLACE FUNCTION fn_ppm_calc_risk_score()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  p INTEGER;
BEGIN
  i := CASE NEW.impact      WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END;
  p := CASE NEW.probability WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END;
  NEW.risk_score := i * p;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ppm_risks_score
  BEFORE INSERT OR UPDATE ON ppm_risks
  FOR EACH ROW EXECUTE FUNCTION fn_ppm_calc_risk_score();

-- =============================================================================
-- 7. ISSUES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ppm_issues (
  issue_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES ppm_projects(project_id) ON DELETE CASCADE,

  issue_description   TEXT        NOT NULL,

  severity            TEXT        NOT NULL CHECK (severity IN ('low','medium','high','critical')),

  reported_by         UUID        REFERENCES users(user_id),
  assigned_to         UUID        REFERENCES users(user_id),

  status              TEXT        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution          TEXT,

  reported_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  resolved_date       DATE,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppm_issues_project  ON ppm_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_ppm_issues_assigned ON ppm_issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ppm_issues_status   ON ppm_issues(status);

CREATE OR REPLACE TRIGGER trg_ppm_issues_updated_at
  BEFORE UPDATE ON ppm_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. ANALYTICAL VIEWS
-- =============================================================================

-- ── Portfolio Dashboard ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_portfolio AS
SELECT
  p.project_id,
  p.project_code,
  p.project_name,
  p.bu_code,
  bu.bu_name,
  c.customer_name,
  u.full_name                                        AS project_manager,
  p.project_type,
  p.service_category,
  p.contract_type,
  p.status,
  p.health_status,
  p.health_notes,
  p.phase,
  p.priority,
  p.start_date,
  p.planned_end_date,
  p.actual_end_date,
  p.baseline_end_date,

  -- Financials
  p.budget_revenue,
  p.actual_revenue,
  p.budget_cost,
  p.actual_cost,
  p.budget_revenue  - p.budget_cost                 AS budget_margin,
  p.actual_revenue  - p.actual_cost                 AS actual_margin,
  CASE WHEN p.budget_revenue  > 0
    THEN ROUND(((p.budget_revenue  - p.budget_cost)  / p.budget_revenue)  * 100, 1)
    ELSE 0 END                                       AS budget_margin_pct,
  CASE WHEN p.actual_revenue  > 0
    THEN ROUND(((p.actual_revenue  - p.actual_cost)  / p.actual_revenue)  * 100, 1)
    ELSE 0 END                                       AS actual_margin_pct,

  -- Hours
  p.budget_hours,
  p.actual_hours,
  CASE WHEN p.budget_hours > 0
    THEN ROUND((p.actual_hours / p.budget_hours) * 100, 1)
    ELSE 0 END                                       AS hours_burn_pct,

  -- Team
  (SELECT COUNT(DISTINCT user_id)
   FROM ppm_allocations a
   WHERE a.project_id = p.project_id AND a.status = 'active') AS team_size,

  -- Completion
  COALESCE(
    (SELECT COUNT(*) FROM ppm_tasks t WHERE t.project_id = p.project_id AND t.status = 'completed')::FLOAT /
    NULLIF((SELECT COUNT(*) FROM ppm_tasks t WHERE t.project_id = p.project_id), 0) * 100,
    0
  )                                                  AS completion_pct,

  -- Tasks summary
  (SELECT COUNT(*) FROM ppm_tasks WHERE project_id = p.project_id)                                AS total_tasks,
  (SELECT COUNT(*) FROM ppm_tasks WHERE project_id = p.project_id AND status = 'completed')       AS completed_tasks,
  (SELECT COUNT(*) FROM ppm_tasks WHERE project_id = p.project_id AND status = 'blocked')         AS blocked_tasks,

  -- Schedule variance (days late vs planned_end_date)
  CASE WHEN p.status = 'completed'
    THEN p.actual_end_date - p.planned_end_date
    ELSE CURRENT_DATE - p.planned_end_date
  END                                                AS schedule_variance_days,

  p.created_at,
  p.updated_at

FROM ppm_projects p
LEFT JOIN business_units bu ON p.bu_code = bu.bu_code
LEFT JOIN customers c       ON p.customer_id = c.customer_id
LEFT JOIN users u           ON p.project_manager_id = u.user_id;

-- ── Project Profitability (EVM) ───────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_profitability AS
SELECT
  p.project_id,
  p.project_code,
  p.project_name,
  p.bu_code,
  p.status,

  -- Revenue
  p.budget_revenue,
  p.actual_revenue,
  p.budget_revenue - p.actual_revenue                               AS revenue_variance,

  -- Cost
  p.budget_cost,
  p.actual_cost,
  p.actual_cost - p.budget_cost                                     AS cost_variance,

  -- Margin
  p.budget_revenue - p.budget_cost                                  AS budget_margin,
  p.actual_revenue - p.actual_cost                                  AS actual_margin,
  CASE WHEN p.budget_revenue > 0
    THEN ROUND(((p.budget_revenue - p.budget_cost) / p.budget_revenue) * 100, 1) ELSE 0
  END                                                               AS budget_margin_pct,
  CASE WHEN p.actual_revenue > 0
    THEN ROUND(((p.actual_revenue - p.actual_cost) / p.actual_revenue) * 100, 1) ELSE 0
  END                                                               AS actual_margin_pct,

  -- EVM
  p.budget_cost                                                     AS planned_value,
  p.actual_cost                                                     AS actual_cost_evm,
  CASE WHEN p.budget_revenue > 0
    THEN (p.actual_revenue / p.budget_revenue) * p.budget_cost
    ELSE 0 END                                                      AS earned_value,

  -- CPI = EV / AC
  CASE WHEN p.actual_cost > 0
    THEN ROUND(
      ((p.actual_revenue / NULLIF(p.budget_revenue,0)) * p.budget_cost) / p.actual_cost,
      3)
    ELSE NULL END                                                   AS cpi,

  -- SPI = EV / PV
  CASE WHEN p.budget_cost > 0
    THEN ROUND(
      ((p.actual_revenue / NULLIF(p.budget_revenue,0)) * p.budget_cost) / p.budget_cost,
      3)
    ELSE NULL END                                                   AS spi

FROM ppm_projects p;

-- ── Resource Utilization ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_resource_utilization AS
SELECT
  u.user_id,
  u.full_name                                                     AS user_name,
  u.email,
  COALESCE(SUM(a.allocation_pct), 0)                             AS total_allocation_pct,
  CASE
    WHEN COALESCE(SUM(a.allocation_pct), 0) > 100  THEN 'overallocated'
    WHEN COALESCE(SUM(a.allocation_pct), 0) >= 80  THEN 'fully_allocated'
    WHEN COALESCE(SUM(a.allocation_pct), 0) >= 50  THEN 'partially_allocated'
    ELSE 'available'
  END                                                             AS utilization_status,
  COUNT(DISTINCT a.project_id)                                   AS active_projects,
  ARRAY_AGG(DISTINCT p.project_name) FILTER (WHERE p.project_name IS NOT NULL) AS project_names
FROM users u
LEFT JOIN ppm_allocations a ON u.user_id = a.user_id
  AND a.status = 'active'
  AND a.start_date <= CURRENT_DATE
  AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
LEFT JOIN ppm_projects p ON a.project_id = p.project_id
GROUP BY u.user_id, u.full_name, u.email;

-- ── Timesheet Summary ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_ppm_timesheet_summary AS
SELECT
  p.project_id,
  p.project_code,
  p.project_name,
  p.bu_code,
  SUM(e.hours)                                                   AS total_hours,
  SUM(CASE WHEN e.is_billable THEN e.hours ELSE 0 END)          AS billable_hours,
  SUM(CASE WHEN NOT e.is_billable THEN e.hours ELSE 0 END)      AS non_billable_hours,
  SUM(CASE WHEN e.is_billable THEN e.hours * COALESCE(e.billing_rate,0) ELSE 0 END) AS billable_amount,
  SUM(e.hours * COALESCE(e.cost_rate, 0))                       AS cost_amount,
  COUNT(DISTINCT e.user_id)                                     AS contributors,
  COUNT(e.entry_id)                                             AS entries_count,
  MAX(e.entry_date)                                             AS last_entry_date
FROM ppm_projects p
LEFT JOIN ppm_time_entries e ON p.project_id = e.project_id
GROUP BY p.project_id, p.project_code, p.project_name, p.bu_code;

-- =============================================================================
-- 9. SEED DATA
-- =============================================================================

-- Depends on existing business_units, customers, and users tables.
-- Run after inserting those rows (see awq_epm_full_schema.sql and awq_crm_full_schema.sql).

INSERT INTO ppm_projects (
  project_code, project_name, customer_id, bu_code,
  project_type, service_category, contract_type,
  start_date, planned_end_date, baseline_end_date,
  budget_hours, budget_cost, budget_revenue, margin_target,
  description, phase, status, health_status, priority
) VALUES
  ('PRJ-2026-001', 'XP Investimentos — Campanha Q1 2026',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%XP%' LIMIT 1),
   'CAZA', 'one_off', 'video_production', 'fixed_price',
   '2026-01-15', '2026-03-31', '2026-03-31',
   240, 85000, 320000, 0.73,
   'Produção campanha institucional Q1: 5 vídeos + fotografia.',
   'execution', 'active', 'green', 'high'),

  ('PRJ-2026-002', 'Nubank — Vídeo Institucional',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%Nubank%' LIMIT 1),
   'CAZA', 'one_off', 'video_production', 'fixed_price',
   '2026-02-01', '2026-03-15', '2026-03-15',
   80, 28000, 85000, 0.67,
   NULL,
   'planning', 'active', 'yellow', 'medium'),

  ('PRJ-2026-003', 'Carol Bertolini — Social Media Mensal',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%Carol%' LIMIT 1),
   'JACQES', 'retainer', 'social_media', 'retainer',
   '2026-01-01', '2026-12-31', '2026-12-31',
   20, 900, 3000, 0.70,
   'Retainer mensal de gestão de social media.',
   'execution', 'active', 'green', 'low'),

  ('PRJ-2026-004', 'Reabilicor — Consultoria Estratégica',
   (SELECT customer_id FROM customers WHERE customer_name ILIKE '%Reabilicor%' LIMIT 1),
   'ADVISOR', 'one_off', 'consulting', 'fixed_price',
   '2026-03-01', '2026-06-30', '2026-06-30',
   120, 22000, 95000, 0.77,
   'Consultoria estratégica: diagnóstico, plano de ação e implementação.',
   'execution', 'active', 'green', 'high')

ON CONFLICT (project_code) DO NOTHING;
