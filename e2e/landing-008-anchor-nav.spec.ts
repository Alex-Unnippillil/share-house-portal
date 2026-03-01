import { expect, test } from "@playwright/test"

test.describe("LANDING-008 entry route navigation", () => {
  test("desktop route only exposes auth-first entry actions", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")

    await expect(page.getByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/auth")
    await expect(page.getByRole("link", { name: /start onboarding/i })).toHaveAttribute("href", "/onboarding")
    await expect(page.locator('a[href^="#landing-"]')).toHaveCount(0)
  })

  test("keyboard navigation reaches primary auth action", async ({ page }) => {
    await page.goto("/")

    await page.keyboard.press("Tab")
    const signIn = page.getByRole("link", { name: /^sign in$/i })
    await expect(signIn).toBeFocused()
  })

  test("support link directs to contact route", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("link", { name: /contact support/i }).click()
    await expect(page).toHaveURL(/\/contact$/)
  })
})
