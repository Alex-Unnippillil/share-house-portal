import { defineConfig, devices } from "@playwright/test"

const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      NEXT_PUBLIC_CALCOM_BASE_URL: "https://app.cal.com",
      CALCOM_MOCK_EVENT_TYPE_ID: "team/mock-event",
      NEXT_DISABLE_VERSION_CHECK: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
})
