import { defineConfig, devices } from "@playwright/test";

// Local server only. The previous default was the production deployment.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

if (/awq-brown\.vercel\.app/i.test(BASE_URL)) {
  throw new Error(
    "PLAYWRIGHT_BASE_URL não pode apontar para a produção (awq-brown.vercel.app). Suba o app em http://127.0.0.1:3000.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
