import { defineConfig, devices } from "@playwright/test";

/**
 * Dois projetos:
 *  - unit  → testes de lógica pura (sem browser, sem servidor)
 *  - e2e   → testes de UI/UX em Chromium (requer servidor rodando)
 *
 * CI:  PLAYWRIGHT_PROJECT=unit   (só unit, sem servidor)
 * Dev: PLAYWRIGHT_PROJECT=e2e    (E2E, inicia dev server automaticamente)
 *      (sem variável → roda ambos)
 */

const project = process.env.PLAYWRIGHT_PROJECT;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  projects: [
    // ── Micro: lógica pura — sem browser ─────────────────────────────────────
    ...(!project || project === "unit"
      ? [
          {
            name: "unit",
            testDir: "./tests/unit",
            testMatch: "**/*.test.ts",
          },
        ]
      : []),

    // ── Macro: UI/UX em Chromium ──────────────────────────────────────────────
    ...(!project || project === "e2e"
      ? [
          {
            name: "e2e-chromium",
            testDir: "./tests/e2e",
            testMatch: "**/*.spec.ts",
            use: {
              ...devices["Desktop Chrome"],
              baseURL: process.env.BASE_URL ?? "http://localhost:3000",
              screenshot: "only-on-failure",
              video: "retain-on-failure",
            },
          },
        ]
      : []),
  ],

  // Dev server — só ativo quando roda testes e2e
  ...((!project || project === "e2e") && {
    webServer: {
      command: process.env.CI ? "npm start" : "npm run dev",
      url: process.env.BASE_URL ?? "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  }),
});
