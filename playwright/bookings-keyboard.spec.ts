import { expect, test, type Locator } from "@playwright/test"

test.describe("Bookings keyboard navigation", () => {
  test("supports switching tabs and booking via keyboard only", async ({ page }) => {
    await page.goto("/bookings")

    const tabTo = async (roleLocator: Locator) => {
      await roleLocator.first().waitFor({ state: "visible" })

      for (let i = 0; i < 50; i++) {
        const isFocused = await roleLocator.evaluate(
          (element) => element === document.activeElement
        )

        if (isFocused) {
          return
        }

        await page.keyboard.press("Tab")
      }

      throw new Error("Failed to focus element using keyboard navigation")
    }

    const bookAmenityTab = page.getByRole("tab", { name: "Book Amenity" })
    await tabTo(bookAmenityTab)
    await expect(bookAmenityTab).toBeFocused()

    await page.keyboard.press("ArrowRight")

    const bookingHistoryTab = page.getByRole("tab", { name: "Booking History" })
    await expect(bookingHistoryTab).toHaveAttribute("data-state", "active")
    await expect(page.getByText("Yesterday 6–8pm")).toBeVisible()

    await page.keyboard.press("ArrowLeft")
    await expect(bookAmenityTab).toHaveAttribute("data-state", "active")

    const bookNowButton = page.getByRole("button", { name: "Book now" }).first()
    await tabTo(bookNowButton)
    await expect(bookNowButton).toBeFocused()

    await page.keyboard.press("Enter")
    await expect(page.getByText("Opening booking flow for Kitchen")).toBeVisible()
  })
})
