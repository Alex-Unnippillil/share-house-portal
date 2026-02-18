import { expect, test } from "@playwright/test"

test("semantic typography hierarchy baseline", async ({ page }) => {
  await page.goto("/typography-checkpoint")
  await expect(page).toHaveScreenshot("typography-checkpoint.png", {
    fullPage: true,
    animations: "disabled",
  })
})
