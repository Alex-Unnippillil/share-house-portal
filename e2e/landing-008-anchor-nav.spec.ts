import { expect, test } from "@playwright/test"

test.describe("LANDING-008 landing header navigation", () => {
  test("supports desktop anchor navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")

    await page.getByRole("link", { name: "Features" }).click()
    await expect(page).toHaveURL(/#features$/)

    await page.getByRole("link", { name: "How it works" }).click()
    await expect(page).toHaveURL(/#how-it-works$/)
  })

  test("opens mobile sheet with anchors and ctas", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await page.getByRole("button", { name: /open navigation menu/i }).click()

    await expect(page.getByRole("link", { name: "Features" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Roles" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Integrations" })).toBeVisible()
    await expect(page.getByRole("link", { name: "How it works" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Contact" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Start onboarding" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
  })
})
