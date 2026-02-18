import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("onboarding flow variants", () => {
  test("tenant onboarding route renders guided profile setup", async ({ page }) => {
    await expectProtectedRoute(page, "/onboarding", /onboarding|unit assignment|emergency/i)
  })

  test("manager variant can still audit tenant onboarding entry point", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard", /dashboard|welcome|operations/i)
  })

  test("admin variant blocks unauthorized dashboard member access", async ({ page }) => {
    await page.goto("/dashboard/members")
    await expect(page).toHaveURL(/auth\/signin|dashboard\?denied=1/)
  })

  test("captures onboarding visual baseline", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop" || process.env.PLAYWRIGHT_VISUAL_BASELINE !== "1",
      "Visual regression snapshots run on desktop when PLAYWRIGHT_VISUAL_BASELINE=1",
    )
    await page.goto("/onboarding")
    await expect(page).toHaveScreenshot("onboarding-form.png", { fullPage: true })
  })
})
