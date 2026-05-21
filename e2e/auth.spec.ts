// Authenticated E2E tests — login flow + protected route access.
// Requires E2E_EMAIL and E2E_PASSWORD env vars pointing to a valid test account.
// Skips gracefully when credentials are absent (e.g. static-export CI jobs).

import { test, expect, type Page } from "@playwright/test";

const EMAIL    = process.env.E2E_EMAIL    ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

const hasCredentials = !!EMAIL && !!PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("input[type=email], input[name=email]").fill(EMAIL);
  await page.locator("input[type=password], input[name=password]").fill(PASSWORD);
  await page.locator("button[type=submit]").click();
  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });
}

test.describe("Login flow", () => {
  test.skip(!hasCredentials, "E2E_EMAIL / E2E_PASSWORD not set");

  test("successful login redirects to home route", async ({ page }) => {
    await login(page);
    const url = page.url();
    expect(url).not.toContain("/login");
  });

  test("invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type=email], input[name=email]").fill("invalid@example.com");
    await page.locator("input[type=password], input[name=password]").fill("wrongpassword");
    await page.locator("button[type=submit]").click();
    // Should stay on login or show an error
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasError = url.includes("/login") || await page.locator("[role=alert], .error, [data-error]").isVisible();
    expect(hasError).toBe(true);
  });
});

test.describe("Protected routes — unauthenticated", () => {
  test("/awq redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/awq");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/jacqes redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/jacqes");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/caza-vision redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/caza-vision");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Protected routes — authenticated", () => {
  test.skip(!hasCredentials, "E2E_EMAIL / E2E_PASSWORD not set");

  test("authenticated user can access their home route", async ({ page }) => {
    await login(page);
    const response = await page.request.get(page.url());
    expect(response.status()).toBe(200);
  });

  test("/api/auth/session returns authenticated session", async ({ page, request }) => {
    await login(page);
    const cookies = await page.context().cookies();
    const jar = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await request.get("/api/auth/session", {
      headers: { Cookie: jar },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("user");
    expect(body.user).toHaveProperty("email");
    expect(body.user).toHaveProperty("role");
  });

  test("/api/chat rejects unauthenticated requests with 401 or 403", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { messages: [{ role: "user", content: "hello" }], buContext: "awq" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("RBAC isolation", () => {
  test("/api/security/audit returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/security/audit");
    expect([401, 403]).toContain(res.status());
  });
});
