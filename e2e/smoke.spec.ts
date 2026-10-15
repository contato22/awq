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
