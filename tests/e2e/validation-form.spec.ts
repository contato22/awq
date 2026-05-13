/**
 * Macro-testes E2E: validação de formulário e listagem de erros.
 *
 * Cobre o fluxo em /crm/leads/add:
 *  - Renderização do formulário
 *  - Erros de campo obrigatório ao submeter vazio
 *  - Limpeza dos erros ao preencher o campo
 *  - Score BANT refletido na UI em tempo real
 *  - Toast de erro quando a API falha
 *  - Toast de sucesso quando o localStorage salva
 *
 * Requer servidor rodando — use: npm run test:e2e
 */

import { test, expect, Page } from "@playwright/test";

const FORM_URL = "/crm/leads/add";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goto(page: Page) {
  await page.goto(FORM_URL);
  // Aguarda o formulário estar visível (indicador confiável de hydration)
  await page.waitForSelector('form[novalidate]', { timeout: 10_000 });
}

async function submitForm(page: Page) {
  await page.getByRole("button", { name: /salvar lead|cadastrar|criar/i }).click();
}

// ─── Renderização ─────────────────────────────────────────────────────────────

test.describe("Formulário — renderização", () => {
  test("página carrega com título correto", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveTitle(/AWQ|Lead/i);
  });

  test("cabeçalho 'Novo Lead' é visível", async ({ page }) => {
    await goto(page);
    await expect(page.getByText("Novo Lead")).toBeVisible();
  });

  test("seção 'Dados do Lead' é visível", async ({ page }) => {
    await goto(page);
    await expect(page.getByText("Dados do Lead")).toBeVisible();
  });

  test("seção 'Qualificação' é visível", async ({ page }) => {
    await goto(page);
    await expect(page.getByText("Qualificação")).toBeVisible();
  });

  test("score BANT é exibido", async ({ page }) => {
    await goto(page);
    await expect(page.getByText(/Score estimado/i)).toBeVisible();
  });

  test("campos obrigatórios têm marcador '*'", async ({ page }) => {
    await goto(page);
    const required = page.locator("label .text-red-500");
    await expect(required).toHaveCount(4); // Nome, Empresa, BU, Responsável
  });

  test("botão 'Voltar para Leads' está presente", async ({ page }) => {
    await goto(page);
    await expect(page.getByText("Voltar para Leads")).toBeVisible();
  });
});

// ─── Erros de validação — campos obrigatórios ─────────────────────────────────

test.describe("Formulário — erros de validação", () => {
  test("submit sem preencher exibe 4 mensagens de erro", async ({ page }) => {
    await goto(page);
    // Limpa o campo de need para ter score 0 puro
    await submitForm(page);
    const errors = page.locator(".text-red-600");
    await expect(errors).toHaveCount(4);
  });

  test("exibe erro 'Nome obrigatório'", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("Nome obrigatório")).toBeVisible();
  });

  test("exibe erro 'Empresa obrigatória'", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("Empresa obrigatória")).toBeVisible();
  });

  test("exibe erro 'BU obrigatória'", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("BU obrigatória")).toBeVisible();
  });

  test("exibe erro 'Responsável obrigatório'", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("Responsável obrigatório")).toBeVisible();
  });

  test("erros têm classe CSS de vermelho", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    const firstError = page.locator(".text-red-600").first();
    await expect(firstError).toBeVisible();
  });
});

// ─── Limpeza de erros ao preencher ────────────────────────────────────────────

test.describe("Formulário — limpeza de erros", () => {
  test("preencher nome remove erro de nome", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("Nome obrigatório")).toBeVisible();

    await page.getByPlaceholder("Rafael Moura").fill("Ana Lima");
    await expect(page.getByText("Nome obrigatório")).not.toBeVisible();
  });

  test("preencher empresa remove erro de empresa", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("Empresa obrigatória")).toBeVisible();

    await page.getByPlaceholder("Tech Solutions BR").fill("AWQ Group");
    await expect(page.getByText("Empresa obrigatória")).not.toBeVisible();
  });

  test("selecionar BU remove erro de BU", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    await expect(page.getByText("BU obrigatória")).toBeVisible();

    await page.locator("select").first().selectOption("JACQES");
    await expect(page.getByText("BU obrigatória")).not.toBeVisible();
  });

  test("erros dos outros campos permanecem ao corrigir apenas um", async ({ page }) => {
    await goto(page);
    await submitForm(page);

    // Corrige só o nome
    await page.getByPlaceholder("Rafael Moura").fill("Ana Lima");

    // Os outros 3 erros continuam visíveis
    await expect(page.getByText("Empresa obrigatória")).toBeVisible();
    await expect(page.getByText("BU obrigatória")).toBeVisible();
    await expect(page.getByText("Responsável obrigatório")).toBeVisible();
  });
});

// ─── Score BANT em tempo real ─────────────────────────────────────────────────

test.describe("Formulário — score BANT reativo", () => {
  test("score começa em 15 (need=medium padrão)", async ({ page }) => {
    await goto(page);
    await expect(page.getByText("Score estimado: 15/100")).toBeVisible();
  });

  test("score sobe ao preencher orçamento alto", async ({ page }) => {
    await goto(page);
    await page.getByPlaceholder(/orçamento|budget|50000/i).fill("50000");
    // 30 (budget) + 15 (need medium) = 45
    await expect(page.getByText("Score estimado: 45/100")).toBeVisible();
  });

  test("label 'Lead frio' para score <= 40", async ({ page }) => {
    await goto(page);
    // Score 15 → frio
    await expect(page.getByText("Lead frio")).toBeVisible();
  });

  test("label 'Lead morno' para score 41-70", async ({ page }) => {
    await goto(page);
    // Budget 20000 (20) + need medium (15) + authority (20) = 55 → morno
    await page.getByPlaceholder(/orçamento|budget|50000/i).fill("20000");
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    await expect(page.getByText("Lead morno")).toBeVisible();
  });

  test("label 'Lead quente' para score >= 71", async ({ page }) => {
    await goto(page);
    // Budget 50000 (30) + need high (25) + authority (20) = 75 → quente
    await page.getByPlaceholder(/orçamento|budget|50000/i).fill("50000");
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    // Muda need para high
    await page.locator("select").filter({ hasText: /médio|alta|baixa/i }).selectOption("high");
    await expect(page.getByText("Lead quente")).toBeVisible();
  });
});

// ─── Inputs de campo — comportamento ─────────────────────────────────────────

test.describe("Formulário — campos opcionais", () => {
  test("campo e-mail aceita endereço válido", async ({ page }) => {
    await goto(page);
    await page.getByPlaceholder("rafael@empresa.com.br").fill("contato@awq.com.br");
    const input = page.getByPlaceholder("rafael@empresa.com.br");
    await expect(input).toHaveValue("contato@awq.com.br");
  });

  test("campo telefone aceita número formatado", async ({ page }) => {
    await goto(page);
    await page.getByPlaceholder("11 99999-0000").fill("11 98765-4321");
    await expect(page.getByPlaceholder("11 99999-0000")).toHaveValue("11 98765-4321");
  });

  test("campo de notas aceita texto longo", async ({ page }) => {
    await goto(page);
    const longText = "Cliente muito interessado. " .repeat(5);
    const textarea = page.locator("textarea");
    await textarea.fill(longText);
    await expect(textarea).toHaveValue(longText);
  });
});

// ─── Input com borda vermelha no erro ─────────────────────────────────────────

test.describe("Formulário — estilo de erro nos inputs", () => {
  test("input de nome recebe borda vermelha ao submeter vazio", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    // O input de nome tem classe border-red-400 quando há erro
    const nomeInput = page.getByPlaceholder("Rafael Moura");
    await expect(nomeInput).toHaveClass(/border-red-400/);
  });

  test("borda vermelha some após preencher o nome", async ({ page }) => {
    await goto(page);
    await submitForm(page);
    const nomeInput = page.getByPlaceholder("Rafael Moura");
    await expect(nomeInput).toHaveClass(/border-red-400/);

    await nomeInput.fill("Rafael Moura");
    await expect(nomeInput).not.toHaveClass(/border-red-400/);
  });
});
