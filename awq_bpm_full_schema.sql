-- =============================================================================
-- AWQ GROUP — BPM Full Schema (PostgreSQL / Neon)
-- =============================================================================
-- Business Process Management — Approval Workflow Engine
--
-- Camadas:
--   1. Process Definitions  — process_definitions (6 workflows prontos)
--   2. Process Instances    — process_instances (execuções em andamento)
--   3. Process Tasks        — process_tasks (tarefas individuais de aprovação)
--   4. Process History      — process_history (audit trail completo)
--   5. Notifications        — bpm_notifications (in-app + email)
--   6. Views                — v_work_queue, v_process_performance,
--                             v_sla_dashboard, v_process_bottlenecks
--
-- Integra com: accounts_payable, budgets, ppm_projects (EPM + PPM schemas)
-- Usuários: TEXT IDs mapeados de lib/auth-users.ts ("1"–"6")
--           "4" = Danilo (finance_manager), "5" = Miguel (cfo/ceo)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROCESS DEFINITIONS (Catálogo de Workflows)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_definitions (
  process_def_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code    TEXT        NOT NULL UNIQUE, -- 'PO_APPROVAL', 'EXPENSE_APPROVAL'
  process_name    TEXT        NOT NULL,
  process_category TEXT       NOT NULL CHECK (process_category IN
                    ('approval','procurement','finance','legal','project_management')),
  description     TEXT,
  process_owner   TEXT,                        -- user_id from auth-users.ts

  -- WORKFLOW STRUCTURE
  workflow_steps  JSONB       NOT NULL,
  -- [{ step_id, step_name, step_type, approver_role, conditions?, sla_hours }]

  routing_rules   JSONB,                       -- conditional routing overrides

  -- SLA DEFAULTS
  default_sla_hours INTEGER   NOT NULL DEFAULT 48,
  escalation_enabled BOOLEAN  NOT NULL DEFAULT TRUE,
  escalation_hours  INTEGER   NOT NULL DEFAULT 72,

  -- NOTIFICATION CONFIG
  notification_config JSONB,

  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  version         INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT                         -- user_id
);

CREATE INDEX IF NOT EXISTS idx_process_defs_code     ON process_definitions(process_code);
CREATE INDEX IF NOT EXISTS idx_process_defs_category ON process_definitions(process_category);
CREATE INDEX IF NOT EXISTS idx_process_defs_active   ON process_definitions(is_active);

-- ── Update timestamp helper ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION bpm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_defs_updated_at
  BEFORE UPDATE ON process_definitions
  FOR EACH ROW EXECUTE FUNCTION bpm_update_updated_at();

-- ── Seed: 6 Critical Workflows ────────────────────────────────────────────────

INSERT INTO process_definitions
  (process_code, process_name, process_category, description, workflow_steps, default_sla_hours)
VALUES

-- 1. Purchase Order Approval
('PO_APPROVAL', 'Purchase Order Approval', 'procurement',
 'Aprovação de ordens de compra. >R$1K: Manager. >R$5K: Finance. >R$10K: CEO.',
 '[
   {"step_id":"1","step_name":"Manager Review","step_type":"approval",
    "approver_role":"manager","sla_hours":24,
    "conditions":{"amount":{"operator":">=","value":1000}}},
   {"step_id":"2","step_name":"Finance Approval","step_type":"approval",
    "approver_role":"finance_manager","sla_hours":48,
    "conditions":{"amount":{"operator":">=","value":5000}}},
   {"step_id":"3","step_name":"CEO Approval","step_type":"approval",
    "approver_role":"ceo","sla_hours":72,
    "conditions":{"amount":{"operator":">=","value":10000}}}
 ]', 72),

-- 2. Expense Approval
('EXPENSE_APPROVAL', 'Expense Approval', 'finance',
 'Aprovação de despesas operacionais. <R$1K: Manager. ≥R$1K: CFO.',
 '[
   {"step_id":"1","step_name":"Manager Approval","step_type":"approval",
    "approver_role":"manager","sla_hours":24,
    "conditions":{"amount":{"operator":"<","value":1000}}},
   {"step_id":"2","step_name":"CFO Approval","step_type":"approval",
    "approver_role":"cfo","sla_hours":48,
    "conditions":{"amount":{"operator":">=","value":1000}}}
 ]', 48),

-- 3. AP Approval
('AP_APPROVAL', 'Accounts Payable Approval', 'finance',
 'Aprovação de contas a pagar antes do pagamento. Sempre Finance; ≥R$5K também CFO.',
 '[
   {"step_id":"1","step_name":"Finance Manager Review","step_type":"approval",
    "approver_role":"finance_manager","sla_hours":48},
   {"step_id":"2","step_name":"CFO Approval","step_type":"approval",
    "approver_role":"cfo","sla_hours":48,
    "conditions":{"amount":{"operator":">=","value":5000}}}
 ]', 48),

-- 4. Budget Approval
('BUDGET_APPROVAL', 'Budget Approval', 'finance',
 'Aprovação do orçamento anual/trimestral. BU Lead → CFO → CEO → Locked.',
 '[
   {"step_id":"1","step_name":"BU Lead Review","step_type":"approval",
    "approver_role":"bu_lead","sla_hours":72},
   {"step_id":"2","step_name":"CFO Review","step_type":"approval",
    "approver_role":"cfo","sla_hours":96},
   {"step_id":"3","step_name":"CEO Final Approval","step_type":"approval",
    "approver_role":"ceo","sla_hours":120}
 ]', 240),

-- 5. Contract Approval
('CONTRACT_APPROVAL', 'Contract Approval', 'legal',
 'Aprovação de contratos antes da assinatura. Legal → Finance → CEO.',
 '[
   {"step_id":"1","step_name":"Legal Review","step_type":"approval",
    "approver_role":"legal","sla_hours":96},
   {"step_id":"2","step_name":"Finance Review","step_type":"approval",
    "approver_role":"finance_manager","sla_hours":48},
   {"step_id":"3","step_name":"CEO Signature","step_type":"approval",
    "approver_role":"ceo","sla_hours":72}
 ]', 168),

-- 6. Project Kickoff Approval
('PROJECT_KICKOFF', 'Project Kickoff Approval', 'project_management',
 'Aprovação para iniciar novo projeto. PM Review → CFO (se budget ≥R$50K).',
 '[
   {"step_id":"1","step_name":"PM Review","step_type":"approval",
    "approver_role":"pm","sla_hours":24},
   {"step_id":"2","step_name":"CFO Budget Approval","step_type":"approval",
    "approver_role":"cfo","sla_hours":48,
    "conditions":{"budget":{"operator":">=","value":50000}}}
 ]', 72)

ON CONFLICT (process_code) DO NOTHING;

-- =============================================================================
-- 2. PROCESS INSTANCES (Execuções em andamento)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_instances (
  instance_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code       TEXT        NOT NULL UNIQUE,  -- 'PI-2026-0001'

  -- PROCESSO
  process_def_id      UUID        REFERENCES process_definitions(process_def_id),
  process_code        TEXT        NOT NULL,
  process_name        TEXT        NOT NULL,

  -- OBJETO APROVADO
  related_entity_type TEXT        NOT NULL,  -- 'AP','PO','Budget','Contract','Project','Expense'
  related_entity_id   TEXT        NOT NULL,  -- PK of the related row (TEXT to support any PK type)

  -- SNAPSHOT DOS DADOS NO MOMENTO DO INÍCIO
  request_data        JSONB       NOT NULL DEFAULT '{}',

  -- INICIADOR
  initiated_by        TEXT        NOT NULL,  -- user_id
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ESTADO ATUAL
  current_step_id     TEXT,
  current_step_name   TEXT,
  status              TEXT        NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','approved','rejected','cancelled')),

  -- DATAS
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,

  -- SLA
  sla_due_date        TIMESTAMPTZ,
  sla_breached        BOOLEAN     NOT NULL DEFAULT FALSE,

  -- RESULTADO
  final_decision      TEXT        CHECK (final_decision IN ('approved','rejected','cancelled')),
  rejection_reason    TEXT,

  priority            TEXT        NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instances_process_def  ON process_instances(process_def_id);
CREATE INDEX IF NOT EXISTS idx_instances_status       ON process_instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_entity       ON process_instances(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_instances_initiated_by ON process_instances(initiated_by);
CREATE INDEX IF NOT EXISTS idx_instances_sla_due      ON process_instances(sla_due_date);

CREATE TRIGGER trg_process_instances_updated_at
  BEFORE UPDATE ON process_instances
  FOR EACH ROW EXECUTE FUNCTION bpm_update_updated_at();

-- Auto-mark SLA breach on update
CREATE OR REPLACE FUNCTION bpm_check_instance_sla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('in_progress')
     AND NEW.sla_due_date IS NOT NULL
     AND NEW.sla_due_date < NOW() THEN
    NEW.sla_breached = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_instance_sla_check
  BEFORE UPDATE ON process_instances
  FOR EACH ROW EXECUTE FUNCTION bpm_check_instance_sla();

-- =============================================================================
-- 3. PROCESS TASKS (Tarefas individuais de aprovação)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_tasks (
  task_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  instance_id     UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,
  step_id         TEXT        NOT NULL,       -- "1", "2", "3"
  step_name       TEXT        NOT NULL,

  -- ASSIGNMENT
  assigned_to     TEXT        NOT NULL,       -- user_id
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  task_type       TEXT        NOT NULL DEFAULT 'approval'
                    CHECK (task_type IN ('approval','review','sign','acknowledge')),

  -- STATUS
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','rejected','cancelled','escalated')),

  -- DECISÃO
  decision        TEXT        CHECK (decision IN ('approved','rejected')),
  decision_notes  TEXT,
  decided_by      TEXT,                       -- user_id
  decided_at      TIMESTAMPTZ,

  -- SLA
  sla_hours       INTEGER,
  sla_due_date    TIMESTAMPTZ,
  sla_breached    BOOLEAN     NOT NULL DEFAULT FALSE,

  -- ESCALATION
  escalated       BOOLEAN     NOT NULL DEFAULT FALSE,
  escalated_to    TEXT,                       -- user_id
  escalated_at    TIMESTAMPTZ,

  task_data       JSONB,                      -- snapshot de request_data para este step

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_instance   ON process_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON process_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON process_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_due    ON process_tasks(sla_due_date);

CREATE TRIGGER trg_process_tasks_updated_at
  BEFORE UPDATE ON process_tasks
  FOR EACH ROW EXECUTE FUNCTION bpm_update_updated_at();

-- Auto-mark SLA breach on task update
CREATE OR REPLACE FUNCTION bpm_check_task_sla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending'
     AND NEW.sla_due_date IS NOT NULL
     AND NEW.sla_due_date < NOW() THEN
    NEW.sla_breached = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_sla_check
  BEFORE UPDATE ON process_tasks
  FOR EACH ROW EXECUTE FUNCTION bpm_check_task_sla();

-- =============================================================================
-- 4. PROCESS HISTORY (Audit trail completo)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_history (
  history_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id         UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,

  action              TEXT        NOT NULL,   -- 'started','step_completed','approved','rejected','escalated','cancelled'
  action_description  TEXT,

  step_id             TEXT,
  step_name           TEXT,

  performed_by        TEXT,                   -- user_id (NULL = system)
  performed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  action_data         JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_instance     ON process_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_history_performed_by ON process_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_history_date         ON process_history(performed_at);

-- =============================================================================
-- 5. NOTIFICATIONS (In-app + email)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bpm_notifications (
  notification_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id             TEXT        NOT NULL,   -- user_id

  notification_type   TEXT        NOT NULL
                        CHECK (notification_type IN (
                          'task_assigned','approval_needed','approved',
                          'rejected','escalated','sla_warning','sla_breached')),

  related_entity_type TEXT        CHECK (related_entity_type IN ('process_instance','process_task')),
  related_entity_id   UUID,

  title               TEXT        NOT NULL,
  message             TEXT        NOT NULL,
  action_url          TEXT,

  is_read             BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at             TIMESTAMPTZ,

  send_email          BOOLEAN     NOT NULL DEFAULT TRUE,
  email_sent          BOOLEAN     NOT NULL DEFAULT FALSE,
  email_sent_at       TIMESTAMPTZ,

  priority            TEXT        NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON bpm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON bpm_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_date   ON bpm_notifications(created_at);

-- =============================================================================
-- 6. ANALYTICAL VIEWS
-- =============================================================================

-- ── Work Queue (My Pending Tasks) ────────────────────────────────────────────

CREATE OR REPLACE VIEW v_work_queue AS
SELECT
  t.task_id,
  t.instance_id,
  t.step_id,
  t.step_name,
  t.task_type,
  t.status       AS task_status,
  t.assigned_to,
  t.assigned_at,
  t.sla_due_date,
  t.sla_breached,

  i.instance_code,
  i.process_code,
  i.process_name,
  i.related_entity_type,
  i.related_entity_id,
  i.request_data,
  i.initiated_by,
  i.priority,

  EXTRACT(EPOCH FROM (NOW() - t.assigned_at)) / 3600   AS hours_pending,
  EXTRACT(EPOCH FROM (t.sla_due_date - NOW())) / 3600   AS sla_hours_remaining

FROM process_tasks t
JOIN process_instances i ON t.instance_id = i.instance_id
WHERE t.status = 'pending'
ORDER BY
  CASE WHEN t.sla_breached     THEN 0 ELSE 1 END,
  CASE WHEN i.priority = 'urgent' THEN 0
       WHEN i.priority = 'high'   THEN 1
       WHEN i.priority = 'normal' THEN 2
       ELSE 3 END,
  t.sla_due_date ASC NULLS LAST,
  t.assigned_at  ASC;

-- ── Process Performance (last 90 days) ───────────────────────────────────────

CREATE OR REPLACE VIEW v_process_performance AS
SELECT
  pd.process_def_id,
  pd.process_code,
  pd.process_name,
  pd.process_category,

  COUNT(pi.instance_id)                                                      AS total_instances,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'approved')                AS approved_count,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'rejected')                AS rejected_count,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'in_progress')             AS in_progress_count,

  CASE WHEN COUNT(pi.instance_id) FILTER (WHERE pi.status IN ('approved','rejected')) > 0
    THEN ROUND(
      COUNT(pi.instance_id) FILTER (WHERE pi.status = 'approved')::NUMERIC /
      COUNT(pi.instance_id) FILTER (WHERE pi.status IN ('approved','rejected')) * 100, 1)
    ELSE 0
  END AS approval_rate_pct,

  ROUND(AVG(
    EXTRACT(EPOCH FROM (pi.completed_at - pi.started_at)) / 3600
  ) FILTER (WHERE pi.completed_at IS NOT NULL), 1)                            AS avg_cycle_time_hours,

  COUNT(pi.instance_id) FILTER (WHERE pi.sla_breached)                       AS sla_breaches,

  CASE WHEN COUNT(pi.instance_id) > 0
    THEN ROUND(
      (COUNT(pi.instance_id) - COUNT(pi.instance_id) FILTER (WHERE pi.sla_breached))::NUMERIC /
      COUNT(pi.instance_id) * 100, 1)
    ELSE 100
  END AS sla_compliance_pct

FROM process_definitions pd
LEFT JOIN process_instances pi
  ON pd.process_def_id = pi.process_def_id
  AND pi.created_at >= CURRENT_DATE - INTERVAL '90 days'
WHERE pd.is_active = TRUE
GROUP BY pd.process_def_id, pd.process_code, pd.process_name, pd.process_category;

-- ── SLA Dashboard ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_sla_dashboard AS
SELECT
  pd.process_code,
  pd.process_name,

  COUNT(t.task_id)                                                            AS active_tasks,
  COUNT(t.task_id) FILTER (WHERE t.sla_breached)                             AS breached_tasks,
  COUNT(t.task_id) FILTER (WHERE t.sla_due_date < NOW() + INTERVAL '24 hours'
                              AND NOT t.sla_breached)                        AS at_risk_tasks,

  ROUND(AVG(
    EXTRACT(EPOCH FROM (t.decided_at - t.assigned_at)) / 3600
  ) FILTER (WHERE t.decided_at IS NOT NULL), 1)                              AS avg_response_hours

FROM process_definitions pd
LEFT JOIN process_instances pi  ON pd.process_def_id = pi.process_def_id
LEFT JOIN process_tasks     t   ON pi.instance_id = t.instance_id
WHERE pd.is_active = TRUE
  AND (t.status = 'pending' OR t.decided_at >= CURRENT_DATE - INTERVAL '30 days')
GROUP BY pd.process_code, pd.process_name;

-- ── Bottleneck Analysis ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_process_bottlenecks AS
SELECT
  pd.process_code,
  pd.process_name,
  t.step_name,

  COUNT(t.task_id)                                                            AS task_count,
  COUNT(t.task_id) FILTER (WHERE t.sla_breached)                             AS breach_count,

  ROUND(AVG(
    EXTRACT(EPOCH FROM (t.decided_at - t.assigned_at)) / 3600
  ) FILTER (WHERE t.decided_at IS NOT NULL), 1)                              AS avg_time_hours,

  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (t.decided_at - t.assigned_at)) / 3600
  ) FILTER (WHERE t.decided_at IS NOT NULL), 1)                              AS median_time_hours

FROM process_definitions pd
JOIN process_instances pi ON pd.process_def_id = pi.process_def_id
JOIN process_tasks     t  ON pi.instance_id = t.instance_id
WHERE pi.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY pd.process_code, pd.process_name, t.step_name
ORDER BY avg_time_hours DESC NULLS LAST;

-- =============================================================================
-- 7. INTEGRATION TRIGGERS (EPM + PPM sync)
-- =============================================================================

-- ── AP: workflow approved → update accounts_payable ──────────────────────────

CREATE OR REPLACE FUNCTION bpm_on_ap_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.related_entity_type = 'AP' THEN
    UPDATE accounts_payable
       SET approval_status = 'approved',
           approved_by     = NEW.initiated_by,
           approved_at     = NOW(),
           status          = 'approved'
     WHERE ap_id::TEXT = NEW.related_entity_id;
  END IF;

  IF NEW.status = 'rejected' AND OLD.status <> 'rejected'
     AND NEW.related_entity_type = 'AP' THEN
    UPDATE accounts_payable
       SET approval_status = 'rejected',
           status          = 'cancelled'
     WHERE ap_id::TEXT = NEW.related_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bpm_ap_approved
  AFTER UPDATE ON process_instances
  FOR EACH ROW
  WHEN (NEW.related_entity_type = 'AP')
  EXECUTE FUNCTION bpm_on_ap_approved();

-- ── Budget: workflow approved → lock budget ───────────────────────────────────

CREATE OR REPLACE FUNCTION bpm_on_budget_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.related_entity_type = 'Budget' THEN
    UPDATE budgets
       SET status      = 'approved',
           approved_by = NEW.initiated_by,
           approved_at = NOW(),
           is_locked   = TRUE
     WHERE budget_id::TEXT = NEW.related_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bpm_budget_approved
  AFTER UPDATE ON process_instances
  FOR EACH ROW
  WHEN (NEW.related_entity_type = 'Budget')
  EXECUTE FUNCTION bpm_on_budget_approved();

-- ── Project Kickoff: workflow approved → activate project ────────────────────

CREATE OR REPLACE FUNCTION bpm_on_project_kickoff_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.related_entity_type = 'Project' THEN
    -- Try ppm_projects first, fall back to projects
    UPDATE ppm_projects
       SET status = 'active',
           phase  = 'execution'
     WHERE project_id::TEXT = NEW.related_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bpm_project_kickoff_approved
  AFTER UPDATE ON process_instances
  FOR EACH ROW
  WHEN (NEW.related_entity_type = 'Project')
  EXECUTE FUNCTION bpm_on_project_kickoff_approved();

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
