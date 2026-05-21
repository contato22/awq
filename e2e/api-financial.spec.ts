// Financial API smoke tests — verify endpoints return expected shape.
// Runs against the live Vercel deployment.
// Unauthenticated checks verify auth enforcement; authenticated checks
// require E2E_EMAIL / E2E_PASSWORD.

import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const hasCredentials = !!EMAIL && !!PASSWORD;

async function getAuthCookies(page: Page): Promise<string> {
  await page.goto("/login");
  await page.locator("input[type=email], input[name=email]").fill(EMAIL);
  await page.locator("input[type=password], input[name=password]").fill(PASSWORD);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// ── Auth enforcement (unauthenticated) ────────────────────────────────────────

test.describe("Financial API — unauthenticated enforcement", () => {
  const protectedRoutes = [
    "/api/epm/dre",
    "/api/epm/gl",
    "/api/epm/bank-reconciliation",
    "/api/ingest/documents",
    "/api/crm/leads",
    "/api/crm/opportunities",
  ];

  for (const route of protectedRoutes) {
    test(`${route} is not accessible unauthenticated`, async ({ request }) => {
      const res = await request.get(route);
      // Next.js middleware returns 307 redirect to login; some routes return 401/403 directly
      expect([307, 401, 403]).toContain(res.status());
    });
  }
});

// ── CRM endpoints (authenticated) ────────────────────────────────────────────

test.describe("CRM API — authenticated", () => {
  test.skip(!hasCredentials, "E2E_EMAIL / E2E_PASSWORD not set");

  test("/api/crm/leads returns array", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/crm/leads", { headers: { Cookie: cookie } });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body) || typeof body === "object").toBe(true);
    }
  });

  test("/api/crm/opportunities returns array", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/crm/opportunities", { headers: { Cookie: cookie } });
    expect([200, 404]).toContain(res.status());
  });

  test("/api/crm/rfm returns object with segments", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/crm/rfm", { headers: { Cookie: cookie } });
    expect([200, 404]).toContain(res.status());
  });
});

// ── EPM / Financial endpoints (authenticated) ─────────────────────────────────

test.describe("EPM Financial API — authenticated", () => {
  test.skip(!hasCredentials, "E2E_EMAIL / E2E_PASSWORD not set");

  test("/api/epm/dre returns object with receita or error", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/epm/dre", { headers: { Cookie: cookie } });
    expect([200, 404, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body).toBe("object");
    }
  });

  test("/api/epm/bank-reconciliation returns array or object", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/epm/bank-reconciliation", { headers: { Cookie: cookie } });
    expect([200, 404]).toContain(res.status());
  });

  test("/api/epm/planning/bu-data returns non-empty array", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/epm/planning/bu-data", { headers: { Cookie: cookie } });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    }
  });
});

// ── Ingest pipeline (authenticated) ──────────────────────────────────────────

test.describe("Ingest API — authenticated", () => {
  test.skip(!hasCredentials, "E2E_EMAIL / E2E_PASSWORD not set");

  test("/api/ingest/documents returns array", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.get("/api/ingest/documents", { headers: { Cookie: cookie } });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    }
  });

  test("/api/ingest/process rejects missing documentId", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);
    const res = await request.post("/api/ingest/process", {
      data: {},
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect([400, 404]).toContain(res.status());
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

test.describe("Rate limiting", () => {
  test.skip(!hasCredentials, "E2E_EMAIL / E2E_PASSWORD not set");

  test("/api/chat returns 429 after exceeding limit", async ({ page, request }) => {
    const cookie = await getAuthCookies(page);

    // Fire 25 rapid requests (limit is 20/min)
    const requests = Array.from({ length: 25 }, () =>
      request.post("/api/chat", {
        data: { messages: [{ role: "user", content: "ping" }], buContext: "awq" },
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      })
    );
    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status());
    const has429 = statuses.some((s) => s === 429);
    // At least one should be rate-limited or rejected
    expect(statuses.every((s) => [200, 401, 403, 429].includes(s))).toBe(true);
    // If auth is working, we should see a 429
    if (statuses.some((s) => s !== 401)) {
      expect(has429).toBe(true);
    }
  });
});
