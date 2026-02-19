import { expect, test } from "@playwright/test"

const sectionIds = [
  "landing-features",
  "landing-personas",
  "landing-prism",
  "landing-integrations",
  "landing-workflow",
  "landing-final-cta",
]

test.describe("landing mobile QA", () => {
  test("hero headline and CTA are visible above the fold on 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await expect(
      page.getByRole("heading", {
        name: /modern operations for every roommate and property manager/i,
      })
    ).toBeVisible()

    const signIn = page.getByRole("link", { name: /^sign in$/i })
    await expect(signIn).toBeVisible()

    const ctaBottom = await signIn.evaluate((node) => node.getBoundingClientRect().bottom)
    expect(ctaBottom).toBeLessThanOrEqual(844)
  })

  test("mobile header menu opens and anchor link scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await page.getByText("Menu", { exact: true }).click()
    const featuresLink = page.locator('details a[href="#landing-features"]')
    await expect(featuresLink).toBeVisible()

    await featuresLink.click()
    await expect(page).toHaveURL(/#landing-features$/)

    const sectionTop = await page.locator("#landing-features").evaluate((node) => {
      return node.getBoundingClientRect().top
    })
    expect(Math.abs(sectionTop)).toBeLessThan(140)
  })

  test("mobile viewport keeps every landing section visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    for (const id of sectionIds) {
      const section = page.locator(`section#${id}`)
      await section.scrollIntoViewIfNeeded()
      await expect(section).toBeVisible()
    }
  })

  test("page does not allow horizontal scrolling on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    const hasHorizontalOverflow = await page.evaluate(() => {
      const { documentElement } = document
      return documentElement.scrollWidth > documentElement.clientWidth
    })

    expect(hasHorizontalOverflow).toBe(false)
  })
})
