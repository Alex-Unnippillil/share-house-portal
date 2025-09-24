import { test, expect } from "./fixtures"

test.describe("Messaging moderation monitor", () => {
  test("property manager can triage flagged threads", async ({ page }) => {
    await test.step("open messaging workspace", async () => {
      await page.goto("/messaging")
      await expect(page.getByRole("heading", { name: "Moderation controls" })).toBeVisible()
      await expect(page.getByText("Active moderation queue")).toBeVisible()
    })

    await test.step("highlight quiet hours incident", async () => {
      const quietRow = page.getByRole("row", { name: /Quiet hours disruption/ })
      await expect(quietRow).toBeVisible()
      await quietRow.click()
      await expect(page.getByRole("heading", { name: "Quiet hours disruption" })).toBeVisible()
      await expect(page.getByText("Flagged by Aisha", { exact: false })).toBeVisible()
    })

    await test.step("switch to shared fridge thread", async () => {
      const fridgeRow = page.getByRole("row", { name: /Shared fridge etiquette/ })
      await fridgeRow.click()
      await expect(page.getByRole("heading", { name: "Shared fridge etiquette" })).toBeVisible()
      await expect(page.getByText("Monitoring", { exact: false })).toBeVisible()
      await expect(page.getByRole("button", { name: "Archive thread" })).toBeVisible()
    })
  })
})
