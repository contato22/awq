# PPM API Documentation — AWQ Control Tower

Base URL: `/api/ppm`

Todas as respostas seguem o padrão:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "mensagem de erro" }
```

---

## Projects

### `GET /api/ppm/projects`

Lista todos os projetos com métricas do portfolio.

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `bu_code` | string | Filtrar por BU: `JACQES`, `CAZA`, `ADVISOR`, `VENTURE` |
| `status` | string | `active`, `on_hold`, `completed`, `cancelled` |
| `health_status` | string | `green`, `yellow`, `red` |
| `project_type` | string | `one_off`, `retainer`, `internal`, `investment` |
| `search` | string | Busca por nome ou código |

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [ { ...PpmProject } ],
    "metrics": {
      "total_projects": 10,
      "active_projects": 6,
      "total_budget_revenue": 500000,
      "total_actual_revenue": 320000,
      "avg_margin_pct": 42.5,
      "green_count": 4,
      "yellow_count": 1,
      "red_count": 1
    }
  }
}
```

---

### `POST /api/ppm/projects`

Cria novo projeto.

**Body (obrigatórios):**
```json
{
  "project_name": "XP — Campanha Q2",
  "bu_code": "JACQES",
  "project_type": "one_off",
  "contract_type": "fixed_price",
  "start_date": "2026-06-01",
  "planned_end_date": "2026-08-31",
  "budget_cost": 45000,
  "budget_revenue": 80000
}
```

**Body (opcionais):**
```json
{
  "customer_name": "XP Investimentos",
  "project_manager": "Danilo",
  "phase": "initiation",
  "status": "active",
  "health_status": "green",
  "priority": "high",
  "description": "...",
  "opportunity_id": "uuid"
}
```

---

### `GET /api/ppm/projects/:id`

Retorna projeto completo com tasks, milestones, alocações, timesheets, riscos e issues.

**Response:**
```json
{
  "success": true,
  "data": {
    "project": { ...PpmProject },
    "tasks": [ ...PpmTask[] ],
    "milestones": [ ...PpmMilestone[] ],
    "allocations": [ ...PpmAllocation[] ],
    "timeEntries": [ ...PpmTimeEntry[] ],
    "risks": [ ...PpmRisk[] ],
    "issues": [ ...PpmIssue[] ]
  }
}
```

---

### `PATCH /api/ppm/projects/:id`

Atualiza campos do projeto (parcial).

```json
{
  "status": "completed",
  "actual_end_date": "2026-07-15",
  "health_status": "green",
  "completion_pct": 100
}
```

---

## Tasks

### `GET /api/ppm/tasks`

| Param | Tipo | Descrição |
|-------|------|-----------|
| `project_id` | UUID | Filtrar por projeto |
| `status` | string | `not_started`, `in_progress`, `blocked`, `completed`, `cancelled` |

### `POST /api/ppm/tasks`

```json
{
  "project_id": "uuid",
  "task_name": "Criar briefing de campanha",
  "task_type": "task",
  "assigned_to": "uuid",
  "assigned_name": "Danilo",
  "estimated_hours": 8,
  "start_date": "2026-06-05",
  "due_date": "2026-06-10",
  "priority": "high",
  "is_deliverable": false
}
```

### `PATCH /api/ppm/tasks`

Atualiza task pelo body (inclui `task_id`):

```json
{
  "task_id": "uuid",
  "status": "completed",
  "completion_pct": 100,
  "actual_hours": 6.5
}
```

---

## Time Entries (Timesheets)

### `GET /api/ppm/time-entries`

| Param | Tipo |
|-------|------|
| `project_id` | UUID |
| `user_id` | UUID |
| `status` | `draft`, `submitted`, `approved`, `rejected` |

### `POST /api/ppm/time-entries` — Criar apontamento

```json
{
  "user_id": "uuid",
  "project_id": "uuid",
  "task_id": "uuid",
  "entry_date": "2026-06-10",
  "hours": 6.5,
  "is_billable": true,
  "billing_rate": 250,
  "description": "Criação de layouts para campanha XP"
}
```

### `POST /api/ppm/time-entries` — Aprovar

```json
{
  "action": "approve",
  "entry_id": "uuid",
  "approved_by": "uuid"
}
```

---

## Resources

### `GET /api/ppm/resources`

| Param | Valor | Descrição |
|-------|-------|-----------|
| `mode` | `utilization` | Retorna utilização de todos os recursos |
| `project_id` | UUID | Alocações por projeto |
| `user_id` | UUID | Alocações por pessoa |

**Utilization response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "user_name": "Danilo",
      "total_allocation_pct": 85,
      "utilization_status": "well_utilized",
      "active_projects": 3,
      "project_names": ["Projeto A", "Projeto B", "Projeto C"]
    }
  ]
}
```

### `POST /api/ppm/resources` — Criar alocação

```json
{
  "project_id": "uuid",
  "user_id": "uuid",
  "role": "lead_designer",
  "allocation_pct": 50,
  "hours_per_week": 20,
  "start_date": "2026-06-01",
  "end_date": "2026-08-31",
  "is_billable": true,
  "billable_rate": 250
}
```

---

## Milestones

### `GET /api/ppm/milestones?project_id=uuid`

### `POST /api/ppm/milestones`

```json
{
  "project_id": "uuid",
  "milestone_name": "Entrega de Identidade Visual",
  "planned_date": "2026-07-01",
  "triggers_payment": true,
  "payment_percentage": 30,
  "requires_approval": true
}
```

---

## Issues

### `GET /api/ppm/issues?project_id=uuid`

### `POST /api/ppm/issues`

```json
{
  "project_id": "uuid",
  "issue_description": "Cliente solicitou mudança de escopo fora do contrato",
  "severity": "high",
  "assigned_to": "uuid",
  "status": "open"
}
```

Severidades: `low`, `medium`, `high`, `critical`
Status: `open`, `in_progress`, `resolved`, `closed`

---

## Risks

### `GET /api/ppm/risks?project_id=uuid`

### `POST /api/ppm/risks`

```json
{
  "project_id": "uuid",
  "risk_description": "Freelancer principal pode não estar disponível em julho",
  "impact": "high",
  "probability": "medium",
  "mitigation_plan": "Identificar backup antecipadamente",
  "owner_id": "uuid",
  "status": "identified"
}
```

Risk score = impact_score × probability_score (1–9)

---

## Comments

### `GET /api/ppm/comments`

| Param | Tipo |
|-------|------|
| `project_id` | UUID |
| `task_id` | UUID |

### `POST /api/ppm/comments` — Criar

```json
{
  "project_id": "uuid",
  "task_id": "uuid",
  "author_name": "Miguel",
  "body": "Confirmar com o cliente o prazo de aprovação do layout @Danilo",
  "mentions": ["user-uuid-danilo"]
}
```

### `POST /api/ppm/comments` — Deletar

```json
{
  "action": "delete",
  "comment_id": "uuid"
}
```

---

## Metrics (Portfolio + EVM)

### `GET /api/ppm/metrics`

Retorna métricas consolidadas do portfolio + EVM por projeto.

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": { ...PpmPortfolioMetrics },
    "utilization": [ ...ResourceUtilization[] ],
    "profitability": [
      {
        "project_id": "uuid",
        "project_name": "...",
        "budget_revenue": 80000,
        "actual_revenue": 60000,
        "budget_cost": 45000,
        "actual_cost": 38000,
        "actual_margin_pct": 36.7,
        "planned_value": 45000,
        "earned_value": 33750,
        "actual_cost_evm": 38000,
        "cpi": 0.89,
        "spi": 0.75,
        "eac": 50562,
        "etc": 12562
      }
    ]
  }
}
```

---

## Tipos Principais

```typescript
type BuCode      = "AWQ" | "JACQES" | "CAZA" | "ADVISOR" | "VENTURE"
type ProjectType = "one_off" | "retainer" | "internal" | "investment"
type ContractType= "fixed_price" | "time_and_materials" | "retainer"
type ProjectPhase= "initiation" | "planning" | "execution" | "monitoring" | "closure"
type ProjectStatus = "active" | "on_hold" | "completed" | "cancelled"
type HealthStatus  = "green" | "yellow" | "red"
type TaskStatus    = "not_started" | "in_progress" | "completed" | "blocked" | "cancelled"
type TimeEntryStatus = "draft" | "submitted" | "approved" | "rejected"
```

Documentação completa dos tipos em `lib/ppm-types.ts`.
