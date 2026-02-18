import { expect, test } from "@playwright/test"

test.describe("breakpoint-aware coverage for nav, forms, and dashboards", () => {
  test("navigation remains usable across viewport projects", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(["A", "BUTTON", "INPUT"]).toContain(String(focusedTag))
  })

  test("auth form remains actionable", async ({ page }) => {
    await page.goto("/auth")

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("button")).toBeVisible()
  })

  test("dashboard shell route preserves landmarks", async ({ page }) => {
    await page.goto("/dashboard")

    if (page.url().includes("/auth/signin")) {
      await expect(page.getByRole("main")).toBeVisible()
      return
    }

    await expect(page.getByRole("main")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})
