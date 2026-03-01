import { expect, test } from "@playwright/test"

test.describe("entry page auth onboarding flow", () => {
  test("unauthenticated users see focused auth and onboarding CTAs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await expect(page.getByRole("heading", { name: /welcome to roomsily/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /^sign in$/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /start onboarding/i })).toBeVisible()
  })

  test("entry flow CTAs route users to auth and onboarding", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("link", { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/auth$/)

    await page.goto("/")
    await page.getByRole("link", { name: /start onboarding/i }).click()
    await expect(page).toHaveURL(/\/onboarding$/)
  })

  test("entry page has no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    const hasHorizontalOverflow = await page.evaluate(() => {
      const { documentElement } = document
      return documentElement.scrollWidth > documentElement.clientWidth
    })

    expect(hasHorizontalOverflow).toBe(false)
  })
})
