import { expect, test } from "@playwright/test"

const protectedRoutes = ["/dashboard", "/payments", "/bookings", "/documents", "/maintenance", "/messaging", "/visitors"]

test.describe("responsive portal navigation shell", () => {
  test("keeps core workflows reachable on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/payments")

    for (const route of protectedRoutes) {
      const link = page.locator("aside[aria-label='Portal navigation'] a").filter({ hasText: new RegExp(route.slice(1), "i") }).first()
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(new RegExp(`^.+(${route}|/auth)$`))
      await expect(page.getByRole("main")).toBeVisible()
    }
  })

  test("keeps core workflows reachable on mobile via sheet nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/payments")

    for (const route of protectedRoutes) {
      await page.getByRole("button", { name: /open navigation menu/i }).click()
      const link = page.getByRole("link", { name: new RegExp(route.slice(1), "i") }).first()
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(new RegExp(`^.+(${route}|/auth)$`))
      await expect(page.getByRole("main")).toBeVisible()
    }
  })

  test("focuses skip link or first actionable control on first tab", async ({ page }) => {
    await page.goto("/payments")
    await page.keyboard.press("Tab")

    const focusedText = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "")
    const focusedLabel = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null
      return element?.getAttribute("aria-label") ?? ""
    })

    expect(/skip to main content/i.test(focusedText) || /open navigation menu/i.test(focusedLabel)).toBeTruthy()
  })
})
