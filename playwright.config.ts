import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://awq-brown.vercel.app";

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
    // Authenticated project — only runs when E2E_EMAIL/E2E_PASSWORD are set
    {
      name: "chromium-auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/auth.spec.ts",
    },
  ],
});
