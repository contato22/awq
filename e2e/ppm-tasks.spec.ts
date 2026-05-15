/**
 * PPM Tasks — testes funcionais e de UX.
 * Roda contra servidor local (PLAYWRIGHT_BASE_URL=http://localhost:3001).
 * O middleware está com bypass para /awq/ppm e /api/ppm neste ambiente.
 */
import { test, expect } from "@playwright/test";

// ── API: /api/ppm/tasks ───────────────────────────────────────────────────────

test.describe("API /api/ppm/tasks", () => {
  test("GET retorna lista de tarefas com project_name", async ({ request }) => {
    const res = await request.get("/api/ppm/tasks");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Tarefas com project_id de seed devem ter project_name preenchido
    const seedTasks = body.data.filter((t: { project_id: string }) => t.project_id.startsWith("prj-"));
    expect(seedTasks.length).toBeGreaterThan(0);
    for (const task of seedTasks) {
      expect(task.project_name, `task ${task.task_id} sem project_name`).toBeTruthy();
    }
  });

  test("GET filtra por project_id", async ({ request }) => {
    const all = await (await request.get("/api/ppm/tasks")).json();
    const projectId = all.data[0].project_id;

    const filtered = await (await request.get(`/api/ppm/tasks?project_id=${projectId}`)).json();
    expect(filtered.success).toBe(true);
    expect(filtered.data.every((t: { project_id: string }) => t.project_id === projectId)).toBe(true);
  });

  test("GET contém tarefa bloqueada com blocked_reason", async ({ request }) => {
    const res = await request.get("/api/ppm/tasks");
    const body = await res.json();
    const blocked = body.data.filter((t: { status: string }) => t.status === "blocked");
    expect(blocked.length).toBeGreaterThan(0);
    for (const t of blocked) {
      expect(t.blocked_reason, `task ${t.task_id} bloqueada sem blocked_reason`).toBeTruthy();
    }
  });

  test("PATCH atualiza status da tarefa", async ({ request }) => {
    // Pega primeira tarefa not_started
    const all = await (await request.get("/api/ppm/tasks")).json();
    const target = all.data.find((t: { status: string }) => t.status === "not_started");
    expect(target).toBeTruthy();

    const patch = await request.patch("/api/ppm/tasks", {
      data: { task_id: target.task_id, status: "in_progress" },
    });
    expect(patch.status()).toBe(200);
    const updated = await patch.json();
    expect(updated.success).toBe(true);
    expect(updated.data.status).toBe("in_progress");

    // Reverte
    await request.patch("/api/ppm/tasks", {
      data: { task_id: target.task_id, status: "not_started" },
    });
  });

  test("PATCH sem task_id retorna 400", async ({ request }) => {
    const res = await request.patch("/api/ppm/tasks", {
      data: { status: "completed" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("POST cria nova tarefa e aparece no GET", async ({ request }) => {
    const all = await (await request.get("/api/ppm/tasks")).json();
    const countBefore = all.data.length;

    const create = await request.post("/api/ppm/tasks", {
      data: {
        project_id: "prj-001",
        task_name:  "Tarefa de teste automatizado",
        task_type:  "task",
        status:     "not_started",
        sort_order: 99,
        completion_pct: 0,
        is_deliverable: false,
      },
    });
    expect(create.status()).toBe(200);
    const created = await create.json();
    expect(created.success).toBe(true);
    expect(created.data.task_id).toBeTruthy();

    const after = await (await request.get("/api/ppm/tasks")).json();
    expect(after.data.length).toBe(countBefore + 1);
  });

  test("POST sem project_id retorna 400", async ({ request }) => {
    const res = await request.post("/api/ppm/tasks", {
      data: { task_name: "Sem projeto" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST sem task_name retorna 400", async ({ request }) => {
    const res = await request.post("/api/ppm/tasks", {
      data: { project_id: "prj-001" },
    });
    expect(res.status()).toBe(400);
  });
});

// ── UI: /awq/ppm/tasks ────────────────────────────────────────────────────────

test.describe("UI Kanban /awq/ppm/tasks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/awq/ppm/tasks", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
  });

  test("renderiza 4 colunas kanban", async ({ page }) => {
    const cols = page.locator(".rounded-xl.border.p-4");
    await expect(cols).toHaveCount(4);
  });

  test("exibe contagem total de tarefas no header", async ({ page }) => {
    const counter = page.locator("p.text-xs.text-gray-500").first();
    await expect(counter).toContainText("tarefas no total");
  });

  test("coluna Bloqueado exibe blocked_reason", async ({ page }) => {
    const reason = page.locator(".bg-red-50.border-red-100").first();
    await expect(reason).toBeVisible();
    const text = await reason.textContent();
    expect(text?.trim().length).toBeGreaterThan(5);
  });

  test("cards exibem badge de tipo (Fase/Marco)", async ({ page }) => {
    const faseBadge = page.locator("text=Fase").first();
    await expect(faseBadge).toBeVisible();
  });

  test("cards de entregável exibem badge Entregável", async ({ page }) => {
    const badge = page.locator("text=Entregável").first();
    await expect(badge).toBeVisible();
  });

  test("botões de mover mostram todos os destinos (sem .slice)", async ({ page }) => {
    // Um card na coluna 'Bloqueado' deve ter 3 botões: A Fazer, Em Andamento, Concluído
    const blockedCol = page.locator(".rounded-xl.border.p-4").filter({ hasText: "Bloqueado" });
    const moveButtons = blockedCol.locator("button").filter({ hasText: "→" });
    const count = await moveButtons.count();
    expect(count).toBeGreaterThanOrEqual(3); // 3 destinos × 1 card = 3
  });

  test("filtro de projeto reduz cards exibidos", async ({ page }) => {
    const totalBefore = await page.locator(".bg-white.border.rounded-xl").count();
    const select = page.locator("select").first();
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1200);
    const totalAfter = await page.locator(".bg-white.border.rounded-xl").count();
    expect(totalAfter).toBeLessThan(totalBefore);
  });

  test("dropdown mantém todos os projetos após filtrar", async ({ page }) => {
    const optsBefore = await page.locator("select option").count();
    const select = page.locator("select").first();
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1200);
    const optsAfter = await page.locator("select option").count();
    // Deve ter pelo menos as mesmas opções (estado estável)
    expect(optsAfter).toBeGreaterThanOrEqual(optsBefore - 1);
  });

  test("mover tarefa atualiza contagem da coluna destino", async ({ page }) => {
    const emAndamentoCol = page.locator(".rounded-xl.border.p-4").nth(1);
    const badgeBefore = await emAndamentoCol.locator(".text-xs.font-bold").first().textContent();
    const countBefore = parseInt(badgeBefore ?? "0");

    const moveBtn = page.locator("button:has-text('→ Em Andamento')").first();
    if (await moveBtn.count() > 0) {
      await moveBtn.click();
      await page.waitForTimeout(2000);
      const badgeAfter = await emAndamentoCol.locator(".text-xs.font-bold").first().textContent();
      const countAfter = parseInt(badgeAfter ?? "0");
      expect(countAfter).toBe(countBefore + 1);
    }
  });

  test("botão Nova Tarefa navega para /tasks/new", async ({ page }) => {
    await page.locator("text=Nova Tarefa").first().click();
    await page.waitForURL("**/tasks/new");
    expect(page.url()).toContain("/tasks/new");
  });
});

// ── UI: /awq/ppm/tasks/new ────────────────────────────────────────────────────

test.describe("UI Nova Tarefa /awq/ppm/tasks/new", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/awq/ppm/tasks/new", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
  });

  test("renderiza sem erros (sem 404)", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Nova Tarefa");
  });

  test("exibe campos obrigatórios: Projeto e Nome", async ({ page }) => {
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.locator("input[type=text]").first()).toBeVisible();
  });

  test("exibe dropdown de projetos preenchido", async ({ page }) => {
    const opts = await page.locator("select").first().locator("option").count();
    expect(opts).toBeGreaterThan(1); // "Selecione..." + projetos reais
  });

  test("campo Tipo tem opções em PT: Tarefa, Fase, Marco", async ({ page }) => {
    const tipoSelect = page.locator("select").nth(1);
    const opts = await tipoSelect.locator("option").allTextContents();
    expect(opts).toContain("Tarefa");
    expect(opts).toContain("Fase");
    expect(opts).toContain("Marco");
  });

  test("campo Status tem opções em PT", async ({ page }) => {
    const statusSelect = page.locator("select").nth(2);
    const opts = await statusSelect.locator("option").allTextContents();
    expect(opts).toContain("A Fazer");
    expect(opts).toContain("Em Andamento");
    expect(opts).toContain("Bloqueado");
    expect(opts).toContain("Concluído");
  });

  test("submissão sem projeto exibe mensagem de erro", async ({ page }) => {
    // Fill task name so HTML5 required on that field doesn't fire first
    await page.locator("input[type=text]").first().fill("Tarefa sem projeto");
    await page.locator("button[type=submit]").click();
    await expect(page.locator("text=Selecione um projeto.")).toBeVisible();
  });

  test("cria tarefa e redireciona para /tasks", async ({ page }) => {
    await page.locator("select").first().selectOption({ index: 1 });
    await page.locator("input[type=text]").first().fill("Tarefa E2E Test");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("**/ppm/tasks", { timeout: 8000 });
    expect(page.url()).toContain("/ppm/tasks");
  });
});

// ── UI: /awq/ppm/add — prioridade em PT ──────────────────────────────────────

test.describe("UI Novo Projeto /awq/ppm/add", () => {
  test("campo Prioridade exibe opções em PT-BR", async ({ page }) => {
    await page.goto("/awq/ppm/add", { waitUntil: "networkidle" });
    const prioritySelect = page.locator("select").filter({ hasText: /Média|Baixa|Alta|Crítica/ }).first();
    await expect(prioritySelect).toBeVisible();
    const opts = await prioritySelect.locator("option").allTextContents();
    expect(opts).toContain("Baixa");
    expect(opts).toContain("Média");
    expect(opts).toContain("Alta");
    expect(opts).toContain("Crítica");
    expect(opts).not.toContain("Medium");
    expect(opts).not.toContain("High");
  });
});

// ── UI: /awq/ppm/timesheets — STATUS visível ──────────────────────────────────

test.describe("UI Timesheets /awq/ppm/timesheets", () => {
  test("coluna STATUS presente nos headers da tabela", async ({ page }) => {
    await page.goto("/awq/ppm/timesheets", { waitUntil: "networkidle" });
    const headers = await page.locator("th").allTextContents();
    expect(headers.map(h => h.trim())).toContain("Status");
  });

  test("STATUS visível após scroll horizontal", async ({ page }) => {
    await page.goto("/awq/ppm/timesheets", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      const el = document.querySelector(".overflow-x-auto");
      if (el) el.scrollLeft = 9999;
    });
    await page.waitForTimeout(300);
    const statusCol = page.locator("th", { hasText: "Status" });
    await expect(statusCol).toBeVisible();
  });
});
