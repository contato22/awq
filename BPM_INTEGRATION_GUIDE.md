# BPM Integration Guide — EPM / PPM / CRM

## Overview

The BPM engine integrates with EPM (financial) and PPM (project management) via:
1. **SQL Triggers** (automatic, on DB UPDATE)
2. **Workflow Completion Callbacks** (in API route `complete-task`)

---

## EPM Integration: Accounts Payable

### Trigger: AP Approved → Update Status

When an `AP_APPROVAL` workflow reaches final approval:

**SQL Trigger** (`awq_bpm_full_schema.sql`):
```sql
-- Fires AFTER UPDATE on process_instances WHERE related_entity_type = 'AP'
UPDATE accounts_payable
   SET approval_status = 'approved',
       approved_by     = NEW.initiated_by,
       approved_at     = NOW(),
       status          = 'approved'
 WHERE ap_id::TEXT = NEW.related_entity_id;
```

### Starting an AP Workflow

When creating a new AP entry, call the workflow API:

```typescript
// In your AP creation flow
const ap = await addAP(apData);

await fetch('/api/bpm/start-workflow', {
  method: 'POST',
  body: JSON.stringify({
    process_code: 'AP_APPROVAL',
    related_entity_type: 'AP',
    related_entity_id: ap.id,
    initiated_by: currentUserId,
    request_data: {
      supplier_name: ap.supplier_name,
      amount: ap.amount,
      description: ap.description,
      due_date: ap.due_date,
      bu: ap.bu_code
    }
  })
});
```

---

## EPM Integration: Budget

### Trigger: Budget Approved → Lock

When a `BUDGET_APPROVAL` workflow reaches final approval:

```sql
-- Fires on process_instances WHERE related_entity_type = 'Budget'
UPDATE budgets
   SET status      = 'approved',
       approved_by = NEW.initiated_by,
       approved_at = NOW(),
       is_locked   = TRUE
 WHERE budget_id::TEXT = NEW.related_entity_id;
```

### Starting a Budget Workflow

```typescript
await fetch('/api/bpm/start-workflow', {
  method: 'POST',
  body: JSON.stringify({
    process_code: 'BUDGET_APPROVAL',
    related_entity_type: 'Budget',
    related_entity_id: budget.budget_id,
    initiated_by: buLeadUserId,
    priority: 'high',
    request_data: {
      budget_name: budget.budget_name,
      bu: budget.bu_code,
      fiscal_year: budget.fiscal_year,
      amount: budget.total_budget
    }
  })
});
```

---

## PPM Integration: Project Kickoff

### Trigger: Kickoff Approved → Activate Project

When a `PROJECT_KICKOFF` workflow reaches final approval:

```sql
-- Fires on process_instances WHERE related_entity_type = 'Project'
UPDATE ppm_projects
   SET status = 'active',
       phase  = 'execution'
 WHERE project_id::TEXT = NEW.related_entity_id;
```

### Starting a Kickoff Workflow

```typescript
// In your project creation flow
const project = await createProject(projectData);

await fetch('/api/bpm/start-workflow', {
  method: 'POST',
  body: JSON.stringify({
    process_code: 'PROJECT_KICKOFF',
    related_entity_type: 'Project',
    related_entity_id: project.project_id,
    initiated_by: pmUserId,
    request_data: {
      project_name: project.project_name,
      bu: project.bu_code,
      budget: project.budget_total,
      description: project.description,
      client: project.client_name
    }
  })
});
```

---

## CRM Integration: Contract Approval

For CRM contracts, start a `CONTRACT_APPROVAL` workflow:

```typescript
// After creating a contract in CRM
await fetch('/api/bpm/start-workflow', {
  method: 'POST',
  body: JSON.stringify({
    process_code: 'CONTRACT_APPROVAL',
    related_entity_type: 'Contract',
    related_entity_id: contract.id,
    initiated_by: salesUserId,
    request_data: {
      contract_name: contract.name,
      client: contract.client_name,
      amount: contract.contract_value,
      bu: contract.bu_code,
      description: contract.scope
    }
  })
});
```

Note: CRM contracts don't yet have a DB trigger — approval completion only creates a notification to the initiator. Add a SQL trigger if you need automated CRM status updates.

---

## Webhook / Callback Pattern (Future)

For external integrations, check the workflow status after completion:

```typescript
// Poll for completion
const res = await fetch(`/api/bpm/process-instance?id=${instanceId}`);
const { instance } = (await res.json()).data;

if (instance.status === 'approved') {
  // Do post-approval work
  await activateInExternalSystem(instance.related_entity_id);
}
```

---

## Notification Placeholders

The `bpm_notifications` table records all notifications. Email sending is **not yet implemented** (placeholder). To add email:

1. Install a mailer (Resend, SendGrid, etc.)
2. In `lib/bpm-db.ts` → `createNotification()`, add email sending after DB insert
3. Set `email_sent = TRUE` after successful send

Example with Resend:
```typescript
if (data.send_email) {
  await resend.emails.send({
    from: 'noreply@awqgroup.com',
    to: getUserEmail(data.user_id),
    subject: data.title,
    text: data.message
  });
}
```
