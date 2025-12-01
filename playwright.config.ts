import { defineConfig, devices } from "@playwright/test"

const defaultBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"

const resolvedRegions = (process.env.PLAYWRIGHT_REGIONS || "us-east-1,us-west-2,eu-central-1")
  .split(",")
  .map((region) => region.trim())
  .filter(Boolean)

const regionProjects = resolvedRegions.map((region) => ({
  name: `synthetic-${region}`,
  metadata: { region },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: defaultBaseURL,
    extraHTTPHeaders: {
      "x-monitoring-region": region,
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
}))

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: defaultBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: regionProjects.length > 0 ? regionProjects : undefined,
})
