# BPM API Documentation — AWQ Control Tower

Base URL: `/api/bpm`

All endpoints return `{ success: boolean, data?: T, error?: string }`.

---

## POST `/api/bpm/start-workflow`

Start a new workflow instance.

**Request Body:**
```json
{
  "process_code": "AP_APPROVAL",
  "related_entity_type": "AP",
  "related_entity_id": "uuid-or-string",
  "initiated_by": "4",
  "priority": "normal",
  "request_data": {
    "supplier_name": "João Silva",
    "amount": 5000,
    "description": "Edição de vídeo",
    "due_date": "2026-05-15",
    "bu": "Caza Vision"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "instance_id": "uuid",
    "instance_code": "PI-2026-0001",
    "current_step": "Finance Manager Review",
    "assigned_to": "4",
    "task_id": "uuid"
  }
}
```

**Process Codes:** `PO_APPROVAL` · `EXPENSE_APPROVAL` · `AP_APPROVAL` · `BUDGET_APPROVAL` · `CONTRACT_APPROVAL` · `PROJECT_KICKOFF`

**Entity Types:** `AP` · `PO` · `Budget` · `Contract` · `Project` · `Expense`

---

## POST `/api/bpm/complete-task`

Approve or reject a pending task.

**Request Body:**
```json
{
  "task_id": "uuid",
  "decision": "approved",
  "decision_notes": "Aprovado conforme orçamento Q2",
  "decided_by": "5"
}
```

`decision_notes` is **required** when `decision = "rejected"`.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "workflow_completed": false,
    "next_step": "CFO Approval",
    "next_task_id": "uuid"
  }
}
```

When `workflow_completed = true`, the instance is finalized and EPM/PPM integration triggers fire (if applicable).

---

## GET `/api/bpm/my-tasks`

Get pending tasks for a user (work queue).

**Query Params:** `user_id` (required) · `filter` (optional: `all` | `overdue` | `today` | `upcoming`)

**Response:**
```json
{
  "success": true,
  "data": [...WorkQueueItem[]],
  "stats": {
    "total": 3,
    "overdue": 1,
    "due_today": 1,
    "due_this_week": 2
  }
}
```

---

## GET `/api/bpm/process-instance`

Fetch instance(s).

**Query Params:**
- `id` — single instance + tasks
- `status` — filter: `in_progress` | `approved` | `rejected` | `cancelled`
- `process_code` — filter by process
- `initiated_by` — filter by user

**Response (single):** `{ instance: ProcessInstance, tasks: ProcessTask[] }`
**Response (list):** `ProcessInstance[]`

---

## POST `/api/bpm/cancel-instance`

Cancel a running instance.

```json
{ "instance_id": "uuid", "cancelled_by": "5", "reason": "Projeto cancelado" }
```

---

## POST `/api/bpm/escalate-task`

Escalate a pending task to a higher approver.

```json
{
  "task_id": "uuid",
  "escalated_by": "4",
  "escalate_to": "5",
  "reason": "SLA próximo de vencer"
}
```

---

## GET `/api/bpm/process-history`

Get full audit trail for an instance.

**Query:** `instance_id` (required)

**Response:** `ProcessHistoryEntry[]` sorted by `performed_at ASC`

---

## GET `/api/bpm/analytics`

Get process analytics.

**Query:** `view` = `performance` | `sla` | `bottlenecks` | `all` (default)

| View | Returns |
|------|---------|
| `performance` | `ProcessPerformance[]` — approval rate, cycle time, SLA compliance |
| `sla` | `SlaDashboardRow[]` — active tasks, breaches, at-risk |
| `bottlenecks` | `BottleneckRow[]` — avg/median time per step |
| `all` | `{ performance, sla, bottlenecks }` |

---

## GET/POST `/api/bpm/mark-notification-read`

**GET** `?user_id=5` — returns unread notifications + count.

**POST** to mark read:
```json
{ "notification_id": "uuid" }
// or
{ "user_id": "5", "mark_all": true }
```

---

## POST `/api/bpm/sla-check`

Cron job endpoint — marks overdue tasks/instances and sends breach notifications.

Optionally protect with `Authorization: Bearer $CRON_SECRET`.

---

## TypeScript Types

All types are in `lib/bpm-types.ts`. Key types:

```typescript
ProcessDefinition   // Workflow template
ProcessInstance     // Running workflow
ProcessTask         // Individual approval task
ProcessHistoryEntry // Audit trail entry
BpmNotification     // In-app notification
WorkQueueItem       // My Tasks view row
ProcessPerformance  // Analytics row
SlaDashboardRow     // SLA analytics
BottleneckRow       // Bottleneck analytics
StartWorkflowInput  // POST /start-workflow body
CompleteTaskInput   // POST /complete-task body
```
