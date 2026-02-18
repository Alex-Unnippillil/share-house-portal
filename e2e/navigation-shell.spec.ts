import { expect, test } from "@playwright/test"

const protectedRoutes = [
  "/dashboard",
  "/payments",
  "/bookings",
  "/documents",
  "/maintenance",
  "/messaging",
  "/visitors",
]

test.describe("responsive portal navigation shell", () => {
  test("shows sheet navigation on md viewports", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto("/payments")

    await expect(page.getByRole("button", { name: /toggle menu/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /toggle menu/i })).toBeEnabled()
  })

  test("shows top navigation links on lg viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/payments")

    await expect(page.getByRole("link", { name: /^dashboard$/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /^payments$/i })).toBeVisible()
  })

  test("keeps target routes reachable at md and lg breakpoints", async ({ page }) => {
    for (const viewport of [
      { width: 900, height: 900 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport)

      for (const route of protectedRoutes) {
        await page.goto(route)
        await expect(page).toHaveURL(new RegExp(`^.+(${route}|/auth)$`))
        await expect(page.getByRole("main")).toBeVisible()
      }
    }
  })
})
