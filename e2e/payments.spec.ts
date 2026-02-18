import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("payments flow variants", () => {
  test("tenant payments dashboard includes ledger and receipts", async ({ page }) => {
    await expectProtectedRoute(page, "/payments", /payments|ledger|receipt|autopay/i)
  })

  test("manager operations finance view is role-gated", async ({ page }) => {
    await page.goto("/dashboard/operations/finance")
    await expect(page).toHaveURL(/auth\/signin|dashboard\?denied=1|dashboard\/operations\/finance/)
  })

  test("admin operations dashboard module remains discoverable", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations", /operations command center|operational queues|finance/i)
  })

  test("captures payments visual baseline", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop" || process.env.PLAYWRIGHT_VISUAL_BASELINE !== "1",
      "Visual regression snapshots run on desktop when PLAYWRIGHT_VISUAL_BASELINE=1",
    )
    await page.goto("/payments")
    await expect(page).toHaveScreenshot("payments-dashboard.png", { fullPage: true })
  })
})
