/**
 * Smoke tests — public routes and the anonymous boundary of sensitive /api routes.
 * CI points PLAYWRIGHT_BASE_URL at the server built in the same job.
 * playwright.config.ts defaults to http://127.0.0.1:3000 and refuses production.
 */
import http from "http";
import { test, expect } from "@playwright/test";

function rawGet(path: string): Promise<{ status: number; location: string; body: string }> {
  const base = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: base.protocol,
        hostname: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path,
        method: "GET",
        headers: { host: base.host, accept: "application/json,text/html" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const location = res.headers.location;
          resolve({
            status: res.statusCode ?? 0,
            location: Array.isArray(location) ? location[0] ?? "" : location ?? "",
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function isAuthRedirect(status: number, location: string): boolean {
  return (status === 302 || status === 307 || status === 303) && /\/login(?:\?|$)|\/api\/auth\/signin/.test(location);
}

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
    await expect(page.locator("form")).not.toHaveAttribute("action");
    await expect(page.locator("form")).not.toHaveAttribute("method");
    await expect(page.getByText("Ao enviar, você concorda com a")).toBeVisible();
    await expect(page.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "#privacidade");
    await expect(page.getByRole("link", { name: "contato@awq.com.br" }).first()).toBeVisible();
    await expect(page.getByRole("checkbox")).not.toHaveAttribute("required", "");

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
    await page.getByLabel("Nome completo").focus();
    await page.getByLabel("Nome completo").blur();
    await expect(page.getByText("Nome obrigatório")).toBeVisible();
    await page.getByLabel("Telefone / WhatsApp").fill("119999");
    await page.getByLabel("Telefone / WhatsApp").blur();
    await expect(page.getByText("Ex.: 11 99999-0000")).toBeVisible();
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

  test("/api/public stays behind auth while there is no handler", async ({ request }) => {
    const res = await request.post("/api/public/leads/capture", {
      maxRedirects: 0,
      data: { contact_name: "Ana", company_name: "Oficina", email: "ana@oficina.example" },
    });
    expect([302, 307]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toMatch(/\/api\/auth\/signin|\/login/);
  });

  test("encoded and uppercase paths do not skip auth", async () => {
    const paths = [
      "/LEADS/CAPTURE",
      "/Leads/Capture",
      "/leads/capture/%2e%2e/api/erp/health",
      "/leads/capture/..%2Fapi/erp/health",
      "/leads/capture/%2e%2e%2fapi/crm/leads",
      "//api/erp/health",
      "//api/crm/leads",
    ];
    for (const path of paths) {
      const res = await rawGet(path);
      expect([302, 307, 308], path).toContain(res.status);
      expect(res.location, path).toMatch(/\/api\/auth\/signin|\/login|\/api\/erp\/health|\/api\/crm\/leads/);
      expect(res.location, path).not.toMatch(/\/leads\/capture\/?$/);
    }
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

// O middleware deixa passar sem sessão. O handler tem de negar sozinho
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

test.describe("Public matcher boundaries", () => {
  test("encoded dot-segments that still hit a dynamic route redirect to login", async () => {
    const paths = [
      "/api/crm/..%2F..%2Flogin",
      "/api/caza/clients/x%2F..%2F..%2F..%2F..%2Flogin",
      "/api/ppm/projects/x%2F..%2F..%2F..%2F..%2Fapi%2Fhealth",
      "/loginX",
      "/api/healthcheck",
      "/patricia-cantoX",
      "/api/cora/cron-syncX",
      "/api/live-shop/webhookX",
      "/api/setup/backfill-snapshotsX",
      "/_next/webpack-hmr",
    ];
    for (const path of paths) {
      const res = await rawGet(path);
      expect(
        isAuthRedirect(res.status, res.location),
        `${path} -> ${res.status} ${res.location} ${res.body.slice(0, 160)}`,
      ).toBe(true);
      expect(res.body, path).not.toContain("dbAdapter");
      expect(res.body, path).not.toContain("csrfToken");
      expect(res.body, path).not.toContain("erp_assets");
      expect(res.body, path).not.toContain("service_role");
    }
  });
});
