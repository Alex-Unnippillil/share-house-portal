import { defineConfig } from "@playwright/test"

const PORT = process.env.PORT ?? "3000"

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NEXT_DISABLE_VERSION_CHECK: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
})
