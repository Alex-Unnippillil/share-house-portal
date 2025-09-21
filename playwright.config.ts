import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PORT || 3000)

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec next start --hostname 0.0.0.0 --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_DISABLE_TELEMETRY: "1",
      NEXT_DISABLE_VERSION_CHECK: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
