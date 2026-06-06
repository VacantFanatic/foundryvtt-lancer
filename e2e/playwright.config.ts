import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.FOUNDRY_URL ?? "http://localhost:30000";

export default defineConfig({
  testDir: "./regression",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "report" }]],
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Firefox"],
    viewport: { width: 1400, height: 900 },
  },
  projects: [{ name: "firefox", use: { browserName: "firefox" } }],
  outputDir: "test-results",
});
