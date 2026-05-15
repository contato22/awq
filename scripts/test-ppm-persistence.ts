/**
 * Validation script for PPM data persistence (in-memory fallback path).
 * Tests all CRUD functions and the new snapshot system without needing Supabase.
 * Run: npx ts-node scripts/test-ppm-persistence.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓  ${msg}`);
};

async function run() {
  // ── Dynamic import avoids top-level path alias resolution issues ──────────
  const ppm = await import("../lib/ppm-db");

  console.log("\n── Projects ──────────────────────────────────────────────────────");

  const projectsBefore = await ppm.listProjects();
  assert(projectsBefore.length >= 5, `seed projects loaded (got ${projectsBefore.length})`);

  const created = await ppm.createProject({
    project_name:    "TEST — Projeto de Validação",
    customer_name:   "Cliente Teste",
    bu_code:         "AWQ",
    project_type:    "internal",
    contract_type:   "fixed_price",
    start_date:      "2026-05-01",
    planned_end_date:"2026-05-31",
    budget_cost:     10000,
    budget_revenue:  20000,
    phase:           "initiation",
    status:          "active",
    health_status:   "green",
    priority:        "medium",
    description:     "Projeto criado pelo script de teste",
    created_by:      "test-script",
  });

  assert(!!created.project_id, "createProject returns project_id");
  assert(created.project_code.startsWith("PRJ-"), "project_code starts with PRJ-");
  assert(created.actual_hours === 0, "actual_hours starts at 0");
  assert(created.actual_cost  === 0, "actual_cost starts at 0");
  assert(created.actual_revenue === 0, "actual_revenue starts at 0");

  const fetched = await ppm.getProject(created.project_id);
  assert(fetched?.project_name === "TEST — Projeto de Validação", "getProject returns correct project");

  const updated = await ppm.updateProject(created.project_id, { health_status: "yellow", completion_pct: 50 });
  assert(updated?.health_status === "yellow", "updateProject sets health_status");
  assert(updated?.completion_pct === 50, "updateProject sets completion_pct");

  const byBu = await ppm.listProjects({ bu_code: "AWQ" });
  assert(byBu.some(p => p.project_id === created.project_id), "listProjects filters by bu_code");

  const bySearch = await ppm.listProjects({ search: "Validação" });
  assert(bySearch.length === 1 && bySearch[0].project_id === created.project_id, "listProjects filters by search");

  console.log("\n── Tasks ─────────────────────────────────────────────────────────");

  const task = await ppm.createTask({
    project_id:    created.project_id,
    task_name:     "Task de Teste",
    task_type:     "task",
    sort_order:    1,
    status:        "not_started",
    completion_pct:0,
    is_deliverable:false,
  });

  assert(!!task.task_id, "createTask returns task_id");
  assert(task.actual_hours === 0, "task actual_hours starts at 0");

  const tasks = await ppm.listTasks(created.project_id);
  assert(tasks.length === 1, "listTasks returns created task");

  const updatedTask = await ppm.updateTask(task.task_id, { status: "in_progress", completion_pct: 30 });
  assert(updatedTask?.status === "in_progress", "updateTask sets status");

  const completed = await ppm.updateTask(task.task_id, { status: "completed" });
  assert(completed?.status === "completed", "updateTask to completed");
  assert(completed?.completion_pct === 100, "auto-sets completion_pct to 100 on complete");
  assert(!!completed?.completed_date, "auto-sets completed_date");

  console.log("\n── Milestones ────────────────────────────────────────────────────");

  const ms = await ppm.createMilestone({
    project_id:        created.project_id,
    milestone_name:    "Entrega Teste",
    planned_date:      "2026-05-31",
    status:            "upcoming",
    triggers_payment:  true,
    payment_percentage:30,
    requires_approval: false,
  });

  assert(!!ms.milestone_id, "createMilestone returns milestone_id");
  const milestones = await ppm.listMilestones(created.project_id);
  assert(milestones.length === 1, "listMilestones returns created milestone");

  console.log("\n── Allocations ───────────────────────────────────────────────────");

  const alloc = await ppm.createAllocation({
    project_id:     created.project_id,
    user_id:        "test-user",
    user_name:      "Usuário Teste",
    role:           "Developer",
    allocation_pct: 50,
    start_date:     "2026-05-01",
    end_date:       "2026-05-31",
    is_billable:    true,
    status:         "active",
  });

  assert(!!alloc.allocation_id, "createAllocation returns allocation_id");
  const allocations = await ppm.listAllocations(created.project_id);
  assert(allocations.length === 1, "listAllocations returns created allocation");

  const util = await ppm.getResourceUtilization();
  const testUser = util.find(u => u.user_id === "test-user");
  assert(!!testUser, "getResourceUtilization includes new user");
  assert(testUser!.total_allocation_pct === 50, "getResourceUtilization sums allocation_pct");
  assert(testUser!.utilization_status === "partially_allocated", "utilization_status correct for 50%");

  console.log("\n── Time Entries ──────────────────────────────────────────────────");

  const entry = await ppm.createTimeEntry({
    user_id:     "test-user",
    user_name:   "Usuário Teste",
    project_id:  created.project_id,
    entry_date:  "2026-05-15",
    hours:       8,
    is_billable: true,
    billing_rate:150,
    cost_rate:   60,
    status:      "submitted",
    invoiced:    false,
    description: "Desenvolvimento feature teste",
  });

  assert(!!entry.entry_id, "createTimeEntry returns entry_id");
  assert(entry.status === "submitted", "time entry status is submitted");

  const entries = await ppm.listTimeEntries({ project_id: created.project_id });
  assert(entries.length === 1, "listTimeEntries returns entry by project_id");
  assert(entries[0].hours === 8, "listTimeEntries returns correct hours");

  const entriesByUser = await ppm.listTimeEntries({ user_id: "test-user" });
  assert(entriesByUser.some(e => e.entry_id === entry.entry_id), "listTimeEntries filters by user_id");

  await ppm.approveTimeEntry(entry.entry_id, "manager-user");
  const entriesApproved = await ppm.listTimeEntries({ status: "approved" });
  const approvedEntry = entriesApproved.find(e => e.entry_id === entry.entry_id);
  assert(!!approvedEntry, "approveTimeEntry changes status");
  assert(approvedEntry!.approved_by === "manager-user", "approveTimeEntry records approved_by");
  assert(!!approvedEntry!.approved_at, "approveTimeEntry records approved_at timestamp");

  console.log("\n── Risks ─────────────────────────────────────────────────────────");

  const risk = await ppm.createRisk({
    project_id:       created.project_id,
    risk_description: "Risco de atraso de entrega",
    impact:           "high",
    probability:      "medium",
    status:           "identified",
    identified_date:  "2026-05-15",
    mitigation_plan:  "Adicionar buffer de 1 semana",
  });

  assert(!!risk.risk_id, "createRisk returns risk_id");
  assert(risk.risk_score === 6, `risk_score calculated correctly (high×medium = 6, got ${risk.risk_score})`);
  const risks = await ppm.listRisks(created.project_id);
  assert(risks.length === 1, "listRisks returns created risk");

  console.log("\n── Issues ────────────────────────────────────────────────────────");

  const issue = await ppm.createIssue({
    project_id:        created.project_id,
    issue_description: "Bug crítico no ambiente de staging",
    severity:          "high",
    reported_by:       "test-user",
    reported_by_name:  "Usuário Teste",
    assigned_to:       "dev-user",
    status:            "open",
    reported_date:     "2026-05-15",
  });

  assert(!!issue.issue_id, "createIssue returns issue_id");
  const issues = await ppm.listIssues(created.project_id);
  assert(issues.length === 1, "listIssues returns created issue");

  console.log("\n── Portfolio Metrics ─────────────────────────────────────────────");

  const metrics = await ppm.getPortfolioMetrics();
  assert(metrics.total_projects >= 6, `total_projects includes test project (got ${metrics.total_projects})`);
  assert(metrics.active_projects >= 1, "active_projects > 0");
  assert(typeof metrics.avg_margin_pct === "number", "avg_margin_pct is a number");
  assert(metrics.overdue_tasks >= 0, "overdue_tasks is non-negative");

  console.log("\n── Snapshots (day / month / year) ───────────────────────────────");

  // No Supabase configured → saveSnapshot returns the row but doesn't persist
  // We still validate the shape and computed values
  const daySnap = await ppm.saveSnapshot("day");
  assert(daySnap.granularity === "day", "snapshot granularity = day");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(daySnap.period_label), `period_label is YYYY-MM-DD (got "${daySnap.period_label}")`);
  assert(daySnap.snapshot_date === daySnap.period_label, "snapshot_date matches period_label for day");
  assert(daySnap.total_projects >= 6, `snapshot total_projects correct (got ${daySnap.total_projects})`);
  assert(daySnap.total_budget_revenue > 0, "snapshot total_budget_revenue > 0");
  assert(daySnap.green_count + daySnap.yellow_count + daySnap.red_count === daySnap.total_projects,
    "health counts sum to total_projects");
  assert(!!daySnap.snapshot_id, "snapshot_id present");
  assert(!!daySnap.created_at, "created_at present");

  const monthSnap = await ppm.saveSnapshot("month");
  assert(monthSnap.granularity === "month", "snapshot granularity = month");
  assert(/^\d{4}-\d{2}$/.test(monthSnap.period_label), `period_label is YYYY-MM (got "${monthSnap.period_label}")`);

  const yearSnap = await ppm.saveSnapshot("year");
  assert(yearSnap.granularity === "year", "snapshot granularity = year");
  assert(/^\d{4}$/.test(yearSnap.period_label), `period_label is YYYY (got "${yearSnap.period_label}")`);

  // BU-scoped snapshot
  const cazaSnap = await ppm.saveSnapshot("day", "CAZA");
  assert(cazaSnap.bu_code === "CAZA", "bu-scoped snapshot has bu_code");
  assert(cazaSnap.total_projects < daySnap.total_projects,
    `bu-scoped snapshot has fewer projects than portfolio (${cazaSnap.total_projects} < ${daySnap.total_projects})`);

  // listSnapshots returns empty array when no Supabase (expected)
  const history = await ppm.listSnapshots({ granularity: "day" });
  assert(Array.isArray(history), "listSnapshots returns array");

  console.log("\n── Migration file ────────────────────────────────────────────────");

  const fs = await import("fs");
  const sql = fs.readFileSync("supabase/migrations/003_ppm_snapshots.sql", "utf8");
  assert(sql.includes("CREATE TABLE IF NOT EXISTS ppm_snapshots"), "migration creates ppm_snapshots table");
  assert(sql.includes("UNIQUE (snapshot_date, granularity, bu_code)"), "migration has unique constraint");
  assert(sql.includes("granularity IN ('day', 'month', 'year')"), "migration has granularity check");
  assert(sql.includes("idx_ppm_snap_date"), "migration has date index");

  console.log("\n── API route file ────────────────────────────────────────────────");

  const routeSrc = fs.readFileSync("app/api/ppm/snapshots/route.ts", "utf8");
  assert(routeSrc.includes("export async function GET"), "GET handler exists");
  assert(routeSrc.includes("export async function POST"), "POST handler exists");
  assert(routeSrc.includes("listSnapshots"), "GET calls listSnapshots");
  assert(routeSrc.includes("saveSnapshot"), "POST calls saveSnapshot");
  assert(routeSrc.includes('"day", "month", "year"'), "POST validates granularity values");

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  All tests passed ✓");
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

run().catch(err => {
  console.error("\n✗ TEST FAILED:", err.message);
  process.exit(1);
});
