import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("bookings flow variants", () => {
  test("tenant booking page keeps amenity form available", async ({ page }) => {
    await expectProtectedRoute(page, "/bookings", /book|amenity|reservation|availability/i)
  })

  test("manager booking oversight dashboard is role-restricted", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations/bookings", /booking|queue|pending|conflict/i)
  })

  test("admin booking exports remain surfaced in operations tools", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations", /csv export: bookings|tools|operations/i)
  })

  test("captures bookings visual baseline", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop" || process.env.PLAYWRIGHT_VISUAL_BASELINE !== "1",
      "Visual regression snapshots run on desktop when PLAYWRIGHT_VISUAL_BASELINE=1",
    )
    await page.goto("/bookings")
    await expect(page).toHaveScreenshot("bookings-form.png", { fullPage: true })
  })
})
