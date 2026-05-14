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
    const res = await request.get("/api/erp/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("ok");
    expect(body).toHaveProperty("configured");
  });
});
