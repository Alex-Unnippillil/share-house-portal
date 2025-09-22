import { expect, test } from "@playwright/test"

test.describe("motion accessibility", () => {
  test("defaults to motion-enabled animations when allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto("/about")

    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("[data-motion]")).every(
        (node) => node.getAttribute("data-motion") === "enabled",
      ),
    )

    const motionStates = await page.$$eval("[data-motion]", (nodes) =>
      nodes.map((node) => ({
        state: node.getAttribute("data-motion"),
        style: node.getAttribute("style") ?? "",
      })),
    )

    expect(motionStates.every(({ state }) => state === "enabled")).toBe(true)
    expect(motionStates.some(({ style }) => /transform|opacity/.test(style))).toBe(true)
  })

  test.describe("with prefers-reduced-motion", () => {
    test.use({ reducedMotion: "reduce" })

    test("disables framer-motion driven animations", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto("/about")

      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll("[data-motion]")).every(
          (node) => node.getAttribute("data-motion") === "reduced",
        ),
      )

      const motionStates = await page.$$eval("[data-motion]", (nodes) =>
        nodes.map((node) => ({
          state: node.getAttribute("data-motion"),
          style: node.getAttribute("style") ?? "",
        })),
      )

      expect(motionStates.every(({ state }) => state === "reduced")).toBe(true)
      for (const { style } of motionStates) {
        expect(style).not.toMatch(/transform|opacity/)
      }
    })
  })
})
