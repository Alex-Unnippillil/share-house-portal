import { expect, test } from "@playwright/test"

const aboutPath = "/about"

test.describe("reduced motion preferences", () => {
  test("disables about page animations when the user prefers reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })

    await page.goto(aboutPath)
    await page.waitForLoadState("networkidle")

    await page.waitForFunction(() => {
      const root = document.querySelector('[data-reduced-motion]')
      return root?.getAttribute("data-reduced-motion") === "true"
    })

    const animatedElements = page.locator('[data-motion-enabled="true"]')
    await expect(animatedElements).toHaveCount(0)

    const motionDisabledElements = page.locator('[data-motion-enabled="false"]')
    await expect(motionDisabledElements).not.toHaveCount(0)

    const inlineStyles = await motionDisabledElements.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("style")),
    )
    expect(inlineStyles.every((style) => !style || !style.includes("will-change"))).toBe(true)
  })

  test("keeps about page animations active by default", async ({ page }) => {
    await page.goto(aboutPath)
    await page.waitForLoadState("networkidle")

    const animatedElements = page.locator('[data-motion-enabled="true"]')
    await expect(animatedElements).not.toHaveCount(0)

    const hasWillChange = await animatedElements.evaluateAll((elements) =>
      elements.some((element) => element.getAttribute("style")?.includes("will-change")),
    )
    expect(hasWillChange).toBe(true)
  })
})
