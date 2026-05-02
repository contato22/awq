# BPM Deploy Guide — AWQ Control Tower

## Overview

The BPM module is a **Next.js-native** workflow engine. No separate Supabase or external service is required — it runs on the same Neon Postgres + Vercel stack as the rest of AWQ Control Tower.

---

## Prerequisites

- AWQ Control Tower deployed (Vercel + Neon Postgres)
- `DATABASE_URL` set in Vercel environment variables
- Existing EPM/PPM schema deployed (for integration triggers)

---

## Step 1: Apply Database Schema

Run `awq_bpm_full_schema.sql` against your Neon Postgres database.

**Option A — Neon Console**
1. Open [Neon Console](https://console.neon.tech)
2. Select your project → SQL Editor
3. Paste and execute `awq_bpm_full_schema.sql`

**Option B — psql**
```bash
psql $DATABASE_URL -f awq_bpm_full_schema.sql
```

**Option C — Auto-bootstrap (recommended for production)**

The `initBpmDB()` function in `lib/bpm-db.ts` runs idempotent `CREATE TABLE IF NOT EXISTS` statements on first request. Tables are created automatically when any BPM API endpoint is first called.

---

## Step 2: Deploy to Vercel

The BPM module is part of the existing Next.js app. No separate deployment needed.

```bash
git push origin claude/bpm-workflow-engine-XBtty
# Vercel auto-deploys on push
```

---

## Step 3: Verify API Routes

After deployment, test the core endpoints:

```bash
# Check process definitions
curl https://your-app.vercel.app/api/bpm/analytics?view=performance

# Check work queue (user 5 = Miguel)
curl https://your-app.vercel.app/api/bpm/my-tasks?user_id=5

# Start a test workflow
curl -X POST https://your-app.vercel.app/api/bpm/start-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "process_code": "AP_APPROVAL",
    "related_entity_type": "AP",
    "related_entity_id": "test-ap-001",
    "initiated_by": "4",
    "request_data": {
      "supplier_name": "Teste Fornecedor",
      "amount": 5000,
      "description": "Pagamento de teste",
      "bu": "JACQES"
    }
  }'
```

---

## Step 4: SLA Check Cron Job (optional)

Add a Vercel Cron to run SLA checks every hour:

**`vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/bpm/sla-check",
      "schedule": "0 * * * *"
    }
  ]
}
```

Or set `CRON_SECRET` in env vars and call with:
```bash
curl -X POST https://your-app.vercel.app/api/bpm/sla-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/awq/bpm/tasks` | My Tasks work queue |
| `/awq/bpm/tasks/[id]` | Approve / Reject task |
| `/awq/bpm/processes` | Process catalog (6 workflows) |
| `/awq/bpm/instances` | All process instances |
| `/awq/bpm/instances/[id]` | Instance detail + history timeline |
| `/awq/bpm/analytics/performance` | Process performance metrics |
| `/awq/bpm/analytics/sla` | SLA dashboard |
| `/awq/bpm/analytics/bottlenecks` | Bottleneck analysis |

---

## User → Role Mapping

| User ID | Name | BPM Roles |
|---------|------|-----------|
| `2` | Sam Chen | manager, bu_lead, pm |
| `4` | Danilo | finance_manager |
| `5` | Miguel | cfo, ceo, legal |

To change role assignments, edit `lib/bpm-workflow-engine.ts` → `ROLE_MAP`.

---

## Zero-Cost Operation

- **Database**: Neon Free Tier (0.5 GB, unlimited requests)
- **Hosting**: Vercel Free Tier (100 GB bandwidth)
- **No third-party BPM SaaS** required
- Monthly cost: **R$0**
