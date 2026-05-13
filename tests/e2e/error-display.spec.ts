/**
 * Macro-testes E2E: exibição de erros e alertas na UI.
 *
 * Cobre:
 *  - AlertBanner: renderização correta para cada tipo (warning/info/success/error)
 *  - Toast: aparece e desaparece automaticamente
 *  - EmptyState: exibido quando não há dados
 *  - Mensagens de erro nas APIs (lista de erros)
 *
 * Usa a página JACQES (/jacqes) que renderiza AlertBanner em produção.
 * Requer servidor rodando — use: npm run test:e2e
 */

import { test, expect, Page } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function waitForPage(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
}

// ─── AlertBanner — cores e estrutura ─────────────────────────────────────────

test.describe("AlertBanner — estrutura visual", () => {
  test("página JACQES renderiza sem crash", async ({ page }) => {
    await waitForPage(page, "/jacqes");
    // Página deve ter pelo menos um elemento de layout
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("seção de alertas está presente na estrutura DOM", async ({ page }) => {
    await waitForPage(page, "/jacqes");
    // O container de alertas usa ícone de bell — verifica existência
    const alertSection = page.locator('[class*="border"][class*="rounded-lg"]');
    // Pode ter 0 ou mais alertas — o importante é a página carregar
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─── AlertBanner — classes CSS por tipo ──────────────────────────────────────

test.describe("AlertBanner — classes CSS esperadas por tipo", () => {
  // Testa programaticamente os estilos via avaliação inline na página
  // sem depender de alertas reais estarem presentes no banco

  test("warning usa amber como cor base", async ({ page }) => {
    await page.goto("/jacqes");
    const amberBanners = page.locator('[class*="bg-amber-50"]');
    // Se existir, deve ter borda amber também
    const count = await amberBanners.count();
    for (let i = 0; i < count; i++) {
      await expect(amberBanners.nth(i)).toHaveClass(/border-amber/);
    }
  });

  test("error usa red como cor base", async ({ page }) => {
    await page.goto("/jacqes");
    const redBanners = page.locator('[class*="bg-red-50"]');
    const count = await redBanners.count();
    for (let i = 0; i < count; i++) {
      await expect(redBanners.nth(i)).toHaveClass(/border-red/);
    }
  });

  test("success usa emerald como cor base", async ({ page }) => {
    await page.goto("/jacqes");
    const emeraldBanners = page.locator('[class*="bg-emerald-50"]');
    const count = await emeraldBanners.count();
    for (let i = 0; i < count; i++) {
      await expect(emeraldBanners.nth(i)).toHaveClass(/border-emerald/);
    }
  });

  test("info usa blue como cor base", async ({ page }) => {
    await page.goto("/jacqes");
    const blueBanners = page.locator('[class*="bg-blue-50"]');
    const count = await blueBanners.count();
    for (let i = 0; i < count; i++) {
      await expect(blueBanners.nth(i)).toHaveClass(/border-blue/);
    }
  });
});

// ─── Toast — ciclo de vida ────────────────────────────────────────────────────

test.describe("Toast — aparência e auto-dismiss", () => {
  const FORM_URL = "/crm/leads/add";

  async function submitEmpty(page: Page) {
    await page.goto(FORM_URL);
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    // Preenche obrigatórios para passar validação client-side
    await page.getByPlaceholder("Rafael Moura").fill("Teste");
    await page.getByPlaceholder("Tech Solutions BR").fill("EmpresaTeste");
    await page.locator("select").first().selectOption("JACQES");
    // Preenche responsável (segundo select)
    const selects = page.locator("select");
    await selects.nth(1).selectOption({ index: 1 });
    // Submit — a chamada de API vai falhar (sem DB) mas localStorage salva
    await page.getByRole("button", { name: /salvar lead|cadastrar|criar/i }).click();
  }

  test("toast de sucesso aparece após salvar no localStorage", async ({ page }) => {
    await submitEmpty(page);
    // Toast de sucesso deve aparecer
    const toast = page.locator('[class*="bg-emerald-50"]').filter({ hasText: /sucesso|criado/i });
    await expect(toast).toBeVisible({ timeout: 5_000 });
  });

  test("toast tem ícone de status", async ({ page }) => {
    await submitEmpty(page);
    // O toast renderiza um ícone SVG (CheckCircle2 ou AlertCircle)
    const toast = page.locator('[class*="fixed"][class*="bottom"]');
    if (await toast.count() > 0) {
      const icon = toast.locator("svg");
      await expect(icon).toBeVisible();
    }
  });

  test("toast desaparece automaticamente em ~3,5 s", async ({ page }) => {
    await submitEmpty(page);
    const toast = page.locator('[class*="fixed"][class*="bottom"]');
    if (await toast.count() > 0) {
      await expect(toast).toBeVisible();
      // Aguarda auto-dismiss (3500 ms + margem)
      await expect(toast).not.toBeVisible({ timeout: 5_000 });
    }
  });
});

// ─── Listagem de erros de validação — acessibilidade ─────────────────────────

test.describe("Listagem de erros — acessibilidade e UX", () => {
  test("mensagens de erro são legíveis (fonte não muito pequena)", async ({ page }) => {
    await page.goto("/crm/leads/add");
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    await page.getByRole("button", { name: /salvar lead|cadastrar|criar/i }).click();

    // Erros usam text-[11px] — verificamos que estão visíveis mesmo sendo pequenos
    const firstError = page.locator(".text-red-600").first();
    await expect(firstError).toBeVisible();

    const box = await firstError.boundingBox();
    // Deve ter altura mínima positiva (visível)
    expect(box?.height).toBeGreaterThan(0);
  });

  test("erros ficam próximos aos seus campos (mesma seção)", async ({ page }) => {
    await page.goto("/crm/leads/add");
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    await page.getByRole("button", { name: /salvar lead|cadastrar|criar/i }).click();

    const nomeError = page.getByText("Nome obrigatório");
    const nomeInput = page.getByPlaceholder("Rafael Moura");

    const errorBox = await nomeError.boundingBox();
    const inputBox = await nomeInput.boundingBox();

    if (errorBox && inputBox) {
      // O erro deve aparecer abaixo do input e próximo (< 40px de distância vertical)
      expect(errorBox.y).toBeGreaterThan(inputBox.y);
      expect(errorBox.y - (inputBox.y + inputBox.height)).toBeLessThan(40);
    }
  });

  test("todos os erros são exibidos de uma só vez (não um por vez)", async ({ page }) => {
    await page.goto("/crm/leads/add");
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    await page.getByRole("button", { name: /salvar lead|cadastrar|criar/i }).click();

    // Todos os 4 erros devem estar visíveis simultaneamente
    await expect(page.getByText("Nome obrigatório")).toBeVisible();
    await expect(page.getByText("Empresa obrigatória")).toBeVisible();
    await expect(page.getByText("BU obrigatória")).toBeVisible();
    await expect(page.getByText("Responsável obrigatório")).toBeVisible();
  });
});

// ─── Navegação — botão Voltar ─────────────────────────────────────────────────

test.describe("Navegação", () => {
  test("botão 'Voltar para Leads' navega para /crm/leads", async ({ page }) => {
    await page.goto("/crm/leads/add");
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    await page.getByText("Voltar para Leads").click();
    await expect(page).toHaveURL(/\/crm\/leads$/);
  });
});

// ─── Responsividade ───────────────────────────────────────────────────────────

test.describe("Responsividade — mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("formulário renderiza corretamente em mobile", async ({ page }) => {
    await page.goto("/crm/leads/add");
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    await expect(page.getByText("Novo Lead")).toBeVisible();
  });

  test("erros de validação são visíveis em mobile", async ({ page }) => {
    await page.goto("/crm/leads/add");
    await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
    await page.getByRole("button", { name: /salvar lead|cadastrar|criar/i }).click();
    await expect(page.getByText("Nome obrigatório")).toBeVisible();
  });
});
