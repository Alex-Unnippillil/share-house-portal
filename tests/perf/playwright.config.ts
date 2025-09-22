import { defineConfig } from "@playwright/test"

const port = Number(process.env.PERF_ROUTE_PORT ?? 4319)
const baseURL = process.env.PERF_ROUTE_BASE_URL ?? `http://127.0.0.1:${port}`
const defaultCommand = `pnpm exec next dev --port ${port}`
const command = process.env.PERF_ROUTE_COMMAND ?? defaultCommand

export default defineConfig({
  testDir: "./",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})
