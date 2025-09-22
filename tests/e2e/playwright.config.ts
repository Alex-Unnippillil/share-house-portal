import { defineConfig, devices } from "@playwright/test"
import type { ReporterDescription } from "@playwright/test"
import path from "path"

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PLAYWRIGHT_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000"

const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""

const supabaseAnonKey =
  process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""

const supabaseServiceRoleKey =
  process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""

if (supabaseUrl && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
}

if (supabaseAnonKey && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
}

if (supabaseServiceRoleKey && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = baseURL
}

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = baseURL
}

if (!process.env.PLAYWRIGHT_SEEDED_EMAIL) {
  process.env.PLAYWRIGHT_SEEDED_EMAIL = "tenant.e2e@roomsily.dev"
}

if (!process.env.PLAYWRIGHT_SEEDED_PASSWORD) {
  process.env.PLAYWRIGHT_SEEDED_PASSWORD = "Roomsily!123"
}

if (!process.env.PLAYWRIGHT_SEEDED_NAME) {
  process.env.PLAYWRIGHT_SEEDED_NAME = "E2E Tenant"
}

if (!process.env.PLAYWRIGHT_SEEDED_UNIT_ID) {
  process.env.PLAYWRIGHT_SEEDED_UNIT_ID = "unit-e2e-1"
}

if (!process.env.PLAYWRIGHT_SEEDED_DOCUMENT_TITLE) {
  process.env.PLAYWRIGHT_SEEDED_DOCUMENT_TITLE = "E2E Lease Agreement"
}

if (!process.env.PLAYWRIGHT_SEEDED_SIGNED_DOCUMENT_TITLE) {
  process.env.PLAYWRIGHT_SEEDED_SIGNED_DOCUMENT_TITLE = "E2E House Rules"
}

const reporterConfig: ReporterDescription[] = process.env.CI
  ? [
      ["github"],
      ["html", { outputFolder: path.join(__dirname, "playwright-report"), open: "never" }],
    ]
  : [
      ["list"],
      ["html", { outputFolder: path.join(__dirname, "playwright-report"), open: "never" }],
    ]

export default defineConfig({
  testDir: "./",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: reporterConfig,
  globalSetup: require.resolve("./global-setup"),
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  outputDir: path.join(__dirname, "test-results"),
})
