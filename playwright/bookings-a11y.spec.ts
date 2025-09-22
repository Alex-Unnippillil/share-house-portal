import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test.describe("Bookings page accessibility", () => {
  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/bookings")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
