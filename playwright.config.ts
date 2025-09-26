import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/a11y",
  fullyParallel: true,
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
