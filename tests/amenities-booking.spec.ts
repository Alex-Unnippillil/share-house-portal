import { test, expect } from "@playwright/test"

test.describe("Amenities booking experience", () => {
  test("resident can search, book, and cancel a slot", async ({ page }) => {
    await page.goto("/web/features/amenities")

    await expect(
      page.getByRole("heading", { name: /calendar-driven amenity reservations/i })
    ).toBeVisible()

    await expect(page.getByTestId("download-ics-booking-sky-1")).toBeEnabled()

    const searchInput = page.getByTestId("slot-search")
    await searchInput.fill("Sunset")

    const slotCard = page.getByTestId("slot-card-sunset-social")
    await expect(slotCard).toBeVisible()

    const bookButton = page.getByTestId("book-slot-sunset-social")
    await expect(bookButton).toBeEnabled()
    await bookButton.click()

    await page.getByTestId("confirm-booking").click()

    const myBookings = page.getByTestId("my-bookings")
    const newBookingCard = myBookings
      .locator('[data-testid^="my-booking-"]')
      .filter({ hasText: "Sunset Social reservation" })
    await expect(newBookingCard).toContainText("Pending approval")

    await newBookingCard.getByRole("button", { name: "Cancel booking" }).click()
    await expect(newBookingCard).toContainText("Cancelled")

    await expect(page.getByTestId("book-slot-sunset-social")).toBeEnabled()
  })

  test("admins can approve bookings and view updated status", async ({ page }) => {
    await page.goto("/web/features/amenities")

    await page.getByRole("tab", { name: "Admin approvals & governance" }).click()

    const pendingCard = page.getByTestId("pending-booking-booking-sky-2")
    await expect(pendingCard).toContainText("Birthday celebration")

    await page.getByTestId("approve-booking-booking-sky-2").click()

    await expect(page.getByTestId("pending-approvals")).toContainText("All caught up")

    const adminCard = page
      .getByTestId("all-bookings")
      .locator('[data-testid^="admin-booking-"]')
      .filter({ hasText: "Birthday celebration" })

    await expect(adminCard).toContainText("Confirmed")
    await expect(adminCard).toContainText("Handled by Community Manager")
  })
})
