import { expect, test, type Locator, type Page } from "@playwright/test"

async function focusWithTab(
  page: Page,
  locator: Locator,
  maxAttempts = 15
) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const isFocused = await locator.evaluate(
      (element) => element === document.activeElement
    )
    if (isFocused) {
      return
    }
    await page.keyboard.press("Tab")
  }
}

test.describe("keyboard navigation", () => {
  test("desktop nav supports tab focus and active route announcement", async ({ page }) => {
    await page.goto("/")

    const paymentsLink = page
      .getByRole("link", { name: "Payments", exact: true })
      .first()

    await focusWithTab(page, paymentsLink, 20)
    await expect(paymentsLink).toBeFocused()

    await page.keyboard.press("Enter")
    await page.waitForURL("**/payments")

    await expect(
      page.getByRole("link", { name: "Payments", exact: true }).first()
    ).toHaveAttribute("aria-current", "page")
  })

  test("mobile drawer can be toggled and keeps active link state", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 900 })
    await page.goto("/payments")

    const toggleMenu = page.getByRole("button", { name: "Toggle Menu" })
    await toggleMenu.focus()
    await expect(toggleMenu).toBeFocused()

    await page.keyboard.press("Enter")

    const mobileDialog = page.getByRole("dialog")
    const paymentsLink = mobileDialog
      .getByRole("link", { name: "Payments", exact: true })
      .first()

    await focusWithTab(page, paymentsLink, 20)
    await expect(paymentsLink).toBeFocused()
    await expect(paymentsLink).toHaveAttribute("aria-current", "page")
  })
})
