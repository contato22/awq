-- ─── BPM Workflow Engine — Tables + Analytics Views ──────────────────────────
-- Idempotente — seguro rodar múltiplas vezes.

-- ─── 1. process_definitions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS process_definitions (
  process_def_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code        TEXT        NOT NULL UNIQUE,
  process_name        TEXT        NOT NULL,
  process_category    TEXT        NOT NULL,
  description         TEXT,
  process_owner       TEXT,
  workflow_steps      JSONB       NOT NULL,
  routing_rules       JSONB,
  default_sla_hours   INTEGER     NOT NULL DEFAULT 48,
  escalation_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  escalation_hours    INTEGER     NOT NULL DEFAULT 72,
  notification_config JSONB,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  version             INTEGER     NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT
);

-- ─── 2. process_instances ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS process_instances (
  instance_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code       TEXT        NOT NULL UNIQUE,
  process_def_id      UUID        REFERENCES process_definitions(process_def_id),
  process_code        TEXT        NOT NULL,
  process_name        TEXT        NOT NULL,
  related_entity_type TEXT        NOT NULL,
  related_entity_id   TEXT        NOT NULL,
  request_data        JSONB       NOT NULL DEFAULT '{}',
  initiated_by        TEXT        NOT NULL,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_step_id     TEXT,
  current_step_name   TEXT,
  status              TEXT        NOT NULL DEFAULT 'in_progress',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  sla_due_date        TIMESTAMPTZ,
  sla_breached        BOOLEAN     NOT NULL DEFAULT FALSE,
  final_decision      TEXT,
  rejection_reason    TEXT,
  priority            TEXT        NOT NULL DEFAULT 'normal',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pi_status  ON process_instances(status);
CREATE INDEX IF NOT EXISTS idx_pi_entity  ON process_instances(related_entity_type, related_entity_id);

-- ─── 3. process_tasks ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS process_tasks (
  task_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id    UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,
  step_id        TEXT        NOT NULL,
  step_name      TEXT        NOT NULL,
  assigned_to    TEXT        NOT NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task_type      TEXT        NOT NULL DEFAULT 'approval',
  status         TEXT        NOT NULL DEFAULT 'pending',
  decision       TEXT,
  decision_notes TEXT,
  decided_by     TEXT,
  decided_at     TIMESTAMPTZ,
  sla_hours      INTEGER,
  sla_due_date   TIMESTAMPTZ,
  sla_breached   BOOLEAN     NOT NULL DEFAULT FALSE,
  escalated      BOOLEAN     NOT NULL DEFAULT FALSE,
  escalated_to   TEXT,
  escalated_at   TIMESTAMPTZ,
  task_data      JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pt_assigned ON process_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pt_status   ON process_tasks(status);

-- ─── 4. process_history ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS process_history (
  history_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id        UUID        NOT NULL REFERENCES process_instances(instance_id) ON DELETE CASCADE,
  action             TEXT        NOT NULL,
  action_description TEXT,
  step_id            TEXT,
  step_name          TEXT,
  performed_by       TEXT,
  performed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_data        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ph_instance ON process_history(instance_id);

-- ─── 5. bpm_notifications ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bpm_notifications (
  notification_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  notification_type   TEXT        NOT NULL,
  related_entity_type TEXT,
  related_entity_id   UUID,
  title               TEXT        NOT NULL,
  message             TEXT        NOT NULL,
  action_url          TEXT,
  is_read             BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at             TIMESTAMPTZ,
  send_email          BOOLEAN     NOT NULL DEFAULT TRUE,
  email_sent          BOOLEAN     NOT NULL DEFAULT FALSE,
  email_sent_at       TIMESTAMPTZ,
  priority            TEXT        NOT NULL DEFAULT 'normal',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bn_user_unread ON bpm_notifications(user_id, is_read);

-- ─── 6. Seed process definitions ─────────────────────────────────────────────

INSERT INTO process_definitions
  (process_code, process_name, process_category, description, workflow_steps, default_sla_hours)
VALUES
  ('PO_APPROVAL', 'Purchase Order Approval', 'procurement',
   'Aprovação de ordens de compra. >R$1K: Manager. >R$5K: Finance. >R$10K: CEO.',
   '[{"step_id":"1","step_name":"Manager Review","step_type":"approval","approver_role":"manager","sla_hours":24,"conditions":{"amount":{"operator":">=","value":1000}}},{"step_id":"2","step_name":"Finance Approval","step_type":"approval","approver_role":"finance_manager","sla_hours":48,"conditions":{"amount":{"operator":">=","value":5000}}},{"step_id":"3","step_name":"CEO Approval","step_type":"approval","approver_role":"ceo","sla_hours":72,"conditions":{"amount":{"operator":">=","value":10000}}}]',
   72),
  ('EXPENSE_APPROVAL', 'Expense Approval', 'finance',
   'Aprovação de despesas operacionais. <R$1K: Manager. ≥R$1K: CFO.',
   '[{"step_id":"1","step_name":"Manager Approval","step_type":"approval","approver_role":"manager","sla_hours":24,"conditions":{"amount":{"operator":"<","value":1000}}},{"step_id":"2","step_name":"CFO Approval","step_type":"approval","approver_role":"cfo","sla_hours":48,"conditions":{"amount":{"operator":">=","value":1000}}}]',
   48),
  ('AP_APPROVAL', 'Accounts Payable Approval', 'finance',
   'Aprovação de contas a pagar. Sempre Finance; ≥R$5K também CFO.',
   '[{"step_id":"1","step_name":"Finance Manager Review","step_type":"approval","approver_role":"finance_manager","sla_hours":48},{"step_id":"2","step_name":"CFO Approval","step_type":"approval","approver_role":"cfo","sla_hours":48,"conditions":{"amount":{"operator":">=","value":5000}}}]',
   48),
  ('BUDGET_APPROVAL', 'Budget Approval', 'finance',
   'Aprovação do orçamento anual/trimestral. BU Lead → CFO → CEO → Locked.',
   '[{"step_id":"1","step_name":"BU Lead Review","step_type":"approval","approver_role":"bu_lead","sla_hours":72},{"step_id":"2","step_name":"CFO Review","step_type":"approval","approver_role":"cfo","sla_hours":96},{"step_id":"3","step_name":"CEO Final Approval","step_type":"approval","approver_role":"ceo","sla_hours":120}]',
   240),
  ('CONTRACT_APPROVAL', 'Contract Approval', 'legal',
   'Aprovação de contratos. Legal → Finance → CEO.',
   '[{"step_id":"1","step_name":"Legal Review","step_type":"approval","approver_role":"legal","sla_hours":96},{"step_id":"2","step_name":"Finance Review","step_type":"approval","approver_role":"finance_manager","sla_hours":48},{"step_id":"3","step_name":"CEO Signature","step_type":"approval","approver_role":"ceo","sla_hours":72}]',
   168),
  ('PROJECT_KICKOFF', 'Project Kickoff Approval', 'project_management',
   'Aprovação para iniciar novo projeto. PM Review → CFO (budget ≥R$50K).',
   '[{"step_id":"1","step_name":"PM Review","step_type":"approval","approver_role":"pm","sla_hours":24},{"step_id":"2","step_name":"CFO Budget Approval","step_type":"approval","approver_role":"cfo","sla_hours":48,"conditions":{"budget":{"operator":">=","value":50000}}}]',
   72)
ON CONFLICT (process_code) DO NOTHING;

-- ─── 7. Analytics views ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_process_performance AS
SELECT
  pd.process_def_id,
  pd.process_code,
  pd.process_name,
  pd.process_category,
  COUNT(pi.instance_id)                                             AS total_instances,
  COUNT(pi.instance_id) FILTER (WHERE pi.final_decision = 'approved') AS approved_count,
  COUNT(pi.instance_id) FILTER (WHERE pi.final_decision = 'rejected') AS rejected_count,
  COUNT(pi.instance_id) FILTER (WHERE pi.status = 'in_progress')      AS in_progress_count,
  ROUND(
    100.0 * COUNT(pi.instance_id) FILTER (WHERE pi.final_decision = 'approved')
    / NULLIF(COUNT(pi.instance_id) FILTER (WHERE pi.status IN ('approved','rejected')), 0),
    1
  )                                                                 AS approval_rate_pct,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (pi.completed_at - pi.started_at)) / 3600
    ) FILTER (WHERE pi.completed_at IS NOT NULL),
    1
  )                                                                 AS avg_cycle_time_hours,
  COUNT(pi.instance_id) FILTER (WHERE pi.sla_breached)             AS sla_breaches,
  ROUND(
    100.0 * COUNT(pi.instance_id) FILTER (WHERE NOT pi.sla_breached)
    / NULLIF(COUNT(pi.instance_id), 0),
    1
  )                                                                 AS sla_compliance_pct
FROM process_definitions pd
LEFT JOIN process_instances pi ON pd.process_def_id = pi.process_def_id
WHERE pd.is_active
GROUP BY pd.process_def_id, pd.process_code, pd.process_name, pd.process_category;

CREATE OR REPLACE VIEW v_sla_dashboard AS
SELECT
  pd.process_code,
  pd.process_name,
  COUNT(pt.task_id) FILTER (WHERE pt.status = 'pending')           AS active_tasks,
  COUNT(pt.task_id) FILTER (WHERE pt.sla_breached)                 AS breached_tasks,
  COUNT(pt.task_id) FILTER (
    WHERE pt.status = 'pending'
      AND NOT pt.sla_breached
      AND pt.sla_due_date < NOW() + INTERVAL '4 hours'
  )                                                                 AS at_risk_tasks,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (pt.decided_at - pt.assigned_at)) / 3600
    ) FILTER (WHERE pt.decided_at IS NOT NULL),
    1
  )                                                                 AS avg_response_hours
FROM process_definitions pd
LEFT JOIN process_instances pi ON pd.process_def_id = pi.process_def_id
LEFT JOIN process_tasks pt     ON pi.instance_id    = pt.instance_id
WHERE pd.is_active
GROUP BY pd.process_code, pd.process_name;

CREATE OR REPLACE VIEW v_process_bottlenecks AS
SELECT
  pt.step_name,
  pd.process_code,
  pd.process_name,
  COUNT(pt.task_id)                                                  AS total_tasks,
  COUNT(pt.task_id) FILTER (WHERE pt.sla_breached)                  AS breached_tasks,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (COALESCE(pt.decided_at, NOW()) - pt.assigned_at)) / 3600
    ),
    1
  )                                                                  AS avg_hours,
  ROUND(
    MAX(
      EXTRACT(EPOCH FROM (COALESCE(pt.decided_at, NOW()) - pt.assigned_at)) / 3600
    ),
    1
  )                                                                  AS max_hours
FROM process_tasks pt
JOIN process_instances pi ON pt.instance_id     = pi.instance_id
JOIN process_definitions pd ON pi.process_def_id = pd.process_def_id
GROUP BY pt.step_name, pd.process_code, pd.process_name
ORDER BY avg_hours DESC NULLS LAST;
