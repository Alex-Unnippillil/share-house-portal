import { expect, test } from "@playwright/test"

const sectionIds = [
  "landing-features",
  "landing-personas",
  "landing-prism",
  "landing-integrations",
  "landing-workflow",
  "landing-final-cta",
]

test.describe("LANDING-008 landing header navigation", () => {
  test("supports desktop anchor navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")

    await page.getByRole("link", { name: "Features" }).click()
    await expect(page).toHaveURL(/#landing-features$/)

    await page.getByRole("link", { name: "How it works" }).click()
    await expect(page).toHaveURL(/#landing-workflow$/)
  })

  test("desktop navigation landmarks are present and reachable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")

    for (const id of sectionIds) {
      const section = page.locator(`section#${id}`)
      await section.scrollIntoViewIfNeeded()
      await expect(section).toBeVisible()
    }
  })

  test("skip link focuses main landmark", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")

    await page.keyboard.press("Tab")
    const skipLink = page.getByRole("link", { name: /skip to main content/i })
    await expect(skipLink).toBeVisible()
    await skipLink.click()

    await expect(page.locator("main#main-content")).toBeFocused()
  })

  test("anchor navigation keeps focus targets visible below sticky header", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")

    await page.getByRole("link", { name: "Features" }).click()

    const headerBottom = await page.locator("header").first().evaluate((node) => node.getBoundingClientRect().bottom)
    const sectionTop = await page.locator("#landing-features").evaluate((node) => node.getBoundingClientRect().top)

    expect(sectionTop).toBeGreaterThanOrEqual(headerBottom - 2)
  })

  test("mobile sheet keeps dialog labeling and focus trapped", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await page.getByRole("button", { name: /open navigation menu/i }).click()

    const dialog = page.getByRole("dialog", { name: /navigate roomsily/i })
    await expect(dialog).toBeVisible()

    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")

    const focusInsideDialog = await page.evaluate(() => {
      const active = document.activeElement
      const dialogNode = document.querySelector('[role="dialog"]')

      return Boolean(active && dialogNode?.contains(active))
    })

    expect(focusInsideDialog).toBe(true)
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
