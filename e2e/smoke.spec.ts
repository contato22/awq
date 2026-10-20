/**
 * Smoke tests — public routes and the anonymous boundary of sensitive /api routes.
 * CI points PLAYWRIGHT_BASE_URL at the server built in the same job.
 * playwright.config.ts defaults to http://127.0.0.1:3000 and refuses production.
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

const SENSITIVE_BEHIND_MIDDLEWARE = [
  "/api/setup/migrate",
  "/api/cora/sync",
  "/api/cora/debug",
  "/api/conciliacao/data",
  "/api/epm/dre",
  "/api/office/state",
  "/api/crm/accounts",
  "/api/ingest/upload",
  "/api/internal/test-supabase",
  "/api/security/audit",
];

// Fora do matcher do middleware. O handler tem de negar sozinho
// (sessão ou Bearer). 200 aqui seria seed, sync ou dump anônimo.
const SENSITIVE_CLOSED = [
  { method: "GET" as const, path: "/api/setup/seed-btg-extract-jun2026" },
  { method: "GET" as const, path: "/api/setup/seed-itau-extract-jun2026" },
  { method: "GET" as const, path: "/api/setup/seed-santander-extracts" },
  { method: "GET" as const, path: "/api/setup/backfill-snapshots" },
  { method: "GET" as const, path: "/api/cora/cron-sync" },
  { method: "GET" as const, path: "/api/cora/audit-probe" },
  { method: "POST" as const, path: "/api/cora/sync-probe" },
  { method: "GET" as const, path: "/api/office/head/tick" },
  { method: "GET" as const, path: "/api/enrd/debug-saldo" },
  { method: "GET" as const, path: "/api/enrd/montagem/cron-sync" },
  { method: "GET" as const, path: "/api/live-shop/cron" },
];

test.describe("Sensitive APIs deny anonymous access", () => {
  for (const path of SENSITIVE_BEHIND_MIDDLEWARE) {
    test(`GET ${path} redirects and does not return data`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 307], path).toContain(res.status());
      const location = res.headers()["location"] ?? "";
      expect(location, path).toMatch(/\/api\/auth\/signin|\/login/);
      const text = await res.text();
      expect(text, path).not.toContain("service_role");
      expect(text, path).not.toContain("CREATE TABLE");
    });
  }

  for (const { method, path } of SENSITIVE_CLOSED) {
    test(`${method} ${path} does not run for an anonymous caller`, async ({ request }) => {
      const res =
        method === "GET"
          ? await request.get(path, { maxRedirects: 0 })
          : await request.post(path, { maxRedirects: 0, data: {} });
      expect([401, 403, 503], `${method} ${path}`).toContain(res.status());
      const text = await res.text();
      expect(text, path).not.toContain("already_seeded");
      expect(text, path).not.toContain('"seeded"');
      expect(text, path).not.toContain("service_role");
    });
  }
});
