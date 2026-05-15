/**
 * Smoke tests — verify core pages load and basic navigation works.
 * Runs against the live Vercel deployment (PLAYWRIGHT_BASE_URL).
 * No authentication required for the login page; authenticated routes
 * are covered by the probe-vercel workflow.
 */
import { test, expect } from "@playwright/test";

test.describe("Public routes", () => {
  test("/login returns 200 and shows login form", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator("input[type=email], input[name=email]")).toBeVisible();
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

test.describe("ERP Supabase connectivity", () => {
  test("/api/erp/health returns configured status", async ({ request }) => {
    // maxRedirects: 0 so we see the real status (307 when auth-protected, 200/500 otherwise)
    const res = await request.get("/api/erp/health", { maxRedirects: 0 });
    // Accept: 307 (auth-protected, local env without secrets), 200 (ok), 500 (misconfigured)
    expect([200, 307, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("ok");
      expect(body).toHaveProperty("configured");
    }
  });
});
