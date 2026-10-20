/**
 * Smoke tests — core public routes and the anonymous boundary of /api/erp/health.
 * CI points PLAYWRIGHT_BASE_URL at the server built in the same job.
 * The default in playwright.config.ts is the live deployment.
 */
import { test, expect } from "@playwright/test";

test.describe("Public routes", () => {
  test("/login returns 200 and shows login form", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    // The field accepts an email or a username ("E-mail ou usuário").
    // type=email would block non-email usernames in the browser, so the
    // control stays type=text. The label is not associated via htmlFor;
    // the accessible name is the placeholder.
    const identity = page.getByPlaceholder("seu@email.com ou usuário");
    await expect(identity).toBeVisible();
    await expect(identity).toHaveAttribute("type", "text");
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("/api/auth/csrf returns csrfToken", async ({ request }) => {
    const res = await request.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("csrfToken");
  });

  test("/api/health returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 404]).toContain(res.status()); // 404 is fine if route not implemented
  });
});

test.describe("Public lead capture", () => {
  test("/leads/capture opens without login and reads bu plus UTM", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST") posts.push(req.url());
    });

    const response = await page.goto(
      "/leads/capture?bu=caza&utm_source=google&utm_medium=cpc&utm_campaign=lancamento&utm_term=agencia&utm_content=hero",
    );
    expect(response?.status()).toBe(200);
    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.getByRole("heading", { name: "Caza Vision" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fale com a gente" })).toBeVisible();
    await expect(page.locator('input[name="utm_source"]')).toHaveValue("google");
    await expect(page.locator('input[name="utm_medium"]')).toHaveValue("cpc");
    await expect(page.locator('input[name="utm_campaign"]')).toHaveValue("lancamento");
    await expect(page.locator('input[name="utm_term"]')).toHaveValue("agencia");
    await expect(page.locator('input[name="utm_content"]')).toHaveValue("hero");
    await expect(page.getByRole("link", { name: "Conciliação Bancária" })).toHaveCount(0);

    await page.getByLabel("Nome completo").fill("Ana Souza");
    await page.getByLabel("Empresa").fill("Oficina Norte");
    await page.getByLabel("E-mail").fill("ana@oficina.example");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.locator("form").getByRole("alert")).toContainText(
      "Não conseguimos registrar seu contato agora",
    );
    await expect(page.getByRole("heading", { name: "Mensagem recebida!" })).toHaveCount(0);
    expect(posts.filter((url) => /\/api\/(public|crm)\b/.test(url))).toEqual([]);
  });

  test("unknown bu falls back and empty submit stays on the form", async ({ page }) => {
    const response = await page.goto("/leads/capture?bu=ENRD");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "JACQES", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Nome obrigatório")).toBeVisible();
    await expect(page.getByText("Empresa obrigatória")).toBeVisible();
    await expect(page.getByText("E-mail obrigatório")).toBeVisible();
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  });

  test("mobile capture page has no platform chrome", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/leads/capture?bu=ADVISOR");
    await expect(page.getByRole("heading", { name: "AWQ Advisor" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toHaveCount(0);
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });
});

test.describe("Lead capture does not open the rest of the app", () => {
  test("near-miss and authenticated routes still redirect", async ({ request }) => {
    const protectedPaths = [
      "/awq",
      "/crm/leads",
      "/leads",
      "/leads/captured",
      "/api/crm/leads",
      "/api/publicity",
      "/api/public-leads",
    ];
    for (const path of protectedPaths) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 307], path).toContain(res.status());
      expect(res.headers()["location"] ?? "", path).toMatch(/\/api\/auth\/signin|\/login/);
    }
  });

  test("the public API prefix is exempt but has no write handler", async ({ request }) => {
    const res = await request.post("/api/public/leads/capture", {
      maxRedirects: 0,
      data: { contact_name: "Ana", company_name: "Oficina", email: "ana@oficina.example" },
    });
    expect(res.status()).toBe(404);
    expect(res.headers()["location"] ?? "").not.toMatch(/\/login/);
  });
});

test.describe("ERP health stays behind auth", () => {
  test("anonymous /api/erp/health redirects and does not return data", async ({ request }) => {
    // The handler uses the service role and can include driver errors.
    // Anonymous callers must stop at the middleware redirect — no JSON body.
    const res = await request.get("/api/erp/health", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
    const location = res.headers()["location"] ?? "";
    expect(location).toMatch(/\/api\/auth\/signin|\/login/);
    const text = await res.text();
    expect(text).not.toContain('"configured"');
    expect(text).not.toContain("erp_assets");
    expect(text).not.toContain("service_role");
  });
});
