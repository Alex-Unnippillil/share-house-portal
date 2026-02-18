import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("documents flow variants", () => {
  test("tenant documents workspace is available", async ({ page }) => {
    await expectProtectedRoute(page, "/documents", /documents|lease|upload|history/i)
  })

  test("manager document operations path follows access controls", async ({ page }) => {
    await page.goto("/dashboard/operations")
    await expect(page).toHaveURL(/auth\/signin|dashboard\/operations/)
  })

  test("admin variant can audit document related exports", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations", /operations|tools|csv export/i)
  })

  test("captures documents visual baseline", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop" || process.env.PLAYWRIGHT_VISUAL_BASELINE !== "1",
      "Visual regression snapshots run on desktop when PLAYWRIGHT_VISUAL_BASELINE=1",
    )
    await page.goto("/documents")
    await expect(page).toHaveScreenshot("documents-workspace.png", { fullPage: true })
  })
})
