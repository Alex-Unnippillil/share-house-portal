import { expect, test } from "@playwright/test"

test.describe("amenity booking embed", () => {
  test("renders the Cal.com embed container when an event type is available", async ({ page }) => {
    await page.goto("/amenities/mock-amenity")

    const embed = page.getByTestId("cal-embed-container")

    await expect(embed).toBeVisible()
    await expect(embed).toHaveAttribute("data-event-type-id", "team/mock-event")
  })
})
