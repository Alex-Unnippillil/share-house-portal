import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
        testDir: "./tests/e2e",
        timeout: 30 * 1000,
        expect: {
                timeout: 10 * 1000,
        },
        fullyParallel: false,
        forbidOnly: !!process.env.CI,
        retries: process.env.CI ? 2 : 0,
        reporter: "list",
        use: {
                baseURL,
                trace: "on-first-retry",
                video: "on-first-retry",
        },
        projects: [
                {
                        name: "chromium",
                        use: { ...devices["Desktop Chrome"] },
                },
        ],
});
