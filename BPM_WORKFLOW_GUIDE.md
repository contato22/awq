# BPM Workflow Guide — AWQ Control Tower

## How Approval Workflows Work

Each workflow follows a fixed sequence of steps. The engine automatically:
1. Determines which steps to execute based on **conditions** (e.g., amount thresholds)
2. Routes each step to the correct **approver** based on their role
3. Tracks **SLA deadlines** per step and per instance
4. Advances to the next step on approval, or closes the workflow on rejection
5. Fires **integration triggers** when the final step is approved

---

## Pre-configured Workflows (6)

### 1. PO_APPROVAL — Purchase Order Approval

| Step | Role | SLA | Condition |
|------|------|-----|-----------|
| Manager Review | manager (Sam) | 24h | amount ≥ R$1.000 |
| Finance Approval | finance_manager (Danilo) | 48h | amount ≥ R$5.000 |
| CEO Approval | ceo (Miguel) | 72h | amount ≥ R$10.000 |

Steps are skipped when conditions are not met (e.g., a R$3K PO skips CEO step).

### 2. EXPENSE_APPROVAL — Expense Approval

| Step | Role | SLA | Condition |
|------|------|-----|-----------|
| Manager Approval | manager | 24h | amount < R$1.000 |
| CFO Approval | cfo (Miguel) | 48h | amount ≥ R$1.000 |

Note: Only one step executes based on amount.

### 3. AP_APPROVAL — Accounts Payable Approval

| Step | Role | SLA | Condition |
|------|------|-----|-----------|
| Finance Manager Review | finance_manager (Danilo) | 48h | always |
| CFO Approval | cfo (Miguel) | 48h | amount ≥ R$5.000 |

**Integration:** On final approval → `accounts_payable.status = 'approved'`

### 4. BUDGET_APPROVAL — Budget Approval

| Step | Role | SLA | Condition |
|------|------|-----|-----------|
| BU Lead Review | bu_lead (Sam) | 72h | always |
| CFO Review | cfo (Miguel) | 96h | always |
| CEO Final Approval | ceo (Miguel) | 120h | always |

Total SLA: 10 days. **Integration:** On final approval → `budgets.is_locked = TRUE`

### 5. CONTRACT_APPROVAL — Contract Approval

| Step | Role | SLA | Condition |
|------|------|-----|-----------|
| Legal Review | legal (Miguel) | 96h | always |
| Finance Review | finance_manager (Danilo) | 48h | always |
| CEO Signature | ceo (Miguel) | 72h | always |

Total SLA: 7 days.

### 6. PROJECT_KICKOFF — Project Kickoff Approval

| Step | Role | SLA | Condition |
|------|------|-----|-----------|
| PM Review | pm (Sam) | 24h | always |
| CFO Budget Approval | cfo (Miguel) | 48h | budget ≥ R$50.000 |

**Integration:** On final approval → `ppm_projects.status = 'active'`

---

## Condition Syntax

Conditions are evaluated per-step using the `request_data` payload:

```json
"conditions": {
  "amount": { "operator": ">=", "value": 5000 }
}
```

Supported operators: `<` `<=` `>` `>=` `==`

Supported fields: any key in `request_data` (e.g., `amount`, `budget`, `quantity`)

**Step executes** if ALL conditions are true. Step is **skipped** if any condition is false.

---

## Adding a New Workflow

1. **Add to `awq_bpm_full_schema.sql`** (for new deployments):
```sql
INSERT INTO process_definitions (process_code, process_name, process_category, description, workflow_steps, default_sla_hours)
VALUES ('MY_WORKFLOW', 'My Workflow', 'approval', 'Description', '[...]', 48);
```

2. **Or add programmatically** via the seed in `lib/bpm-db.ts` → `_seedProcessDefinitions()`.

3. **Start workflows** via API:
```typescript
await fetch('/api/bpm/start-workflow', {
  method: 'POST',
  body: JSON.stringify({
    process_code: 'MY_WORKFLOW',
    related_entity_type: 'AP',
    related_entity_id: entityId,
    initiated_by: userId,
    request_data: { amount: 3000, description: 'My request' }
  })
});
```

---

## Role → User Mapping

Edit `lib/bpm-workflow-engine.ts` → `ROLE_MAP` to change who handles each role:

```typescript
const ROLE_MAP: Record<ApproverRole, string> = {
  manager:         "2",   // Sam Chen
  bu_lead:         "2",   // Sam Chen
  pm:              "2",   // Sam Chen
  finance_manager: "4",   // Danilo
  cfo:             "5",   // Miguel
  ceo:             "5",   // Miguel
  legal:           "5",   // Miguel
};
```

---

## SLA and Escalation

- Each step has `sla_hours` defined in the workflow definition
- `lib/bpm-workflow-engine.ts` → `computeSlaDeadline()` sets the deadline
- `POST /api/bpm/sla-check` (cron, every hour) marks breached tasks
- `POST /api/bpm/escalate-task` manually escalates to a different user
- SLA breaches trigger `sla_breached` notifications (priority: urgent)

---

## Priority Logic

Automatic priority derivation from `amount` field (`lib/bpm-workflow-engine.ts`):

| Amount | Priority |
|--------|----------|
| ≥ R$50.000 | urgent |
| ≥ R$10.000 | high |
| ≥ R$5.000 | normal |
| < R$5.000 | low |

Override by passing `priority` in `StartWorkflowInput`.
