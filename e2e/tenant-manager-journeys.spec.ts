import { expect, test } from "@playwright/test"

const keyboardSteps = [
  { name: "onboarding", path: "/" },
  { name: "bookings", path: "/bookings" },
  { name: "messaging", path: "/messaging" },
]

test.describe("tenant and manager core journeys", () => {
  test("tenant can discover primary workflows from navigation", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("link", { name: /payments/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /documents/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /bookings/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /messaging/i })).toBeVisible()
  })

  test("manager-facing pages expose maintenance and visitor workflows", async ({ page }) => {
    await page.goto("/bookings")
    await expect(page.getByText(/book amenity/i)).toBeVisible()

    await page.goto("/visitors")
    await expect(page.getByText(/visitor booking/i)).toBeVisible()

    await page.goto("/maintenance")
    await expect(page.getByText(/maintenance request/i)).toBeVisible()
  })

  test("keyboard navigation reaches the first actionable control on each journey", async ({ page }) => {
    for (const entry of keyboardSteps) {
      await page.goto(entry.path)
      await page.keyboard.press("Tab")

      const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
      expect(["A", "BUTTON", "INPUT"]).toContain(String(focusedTag))
    }
  })

  test("page landmarks and headings remain screen-reader friendly", async ({ page }) => {
    await page.goto("/bookings")

    await expect(page.getByRole("main")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})
