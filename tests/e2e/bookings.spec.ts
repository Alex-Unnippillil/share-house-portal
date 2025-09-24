import { test, expect } from "./fixtures"

const pad = (value: number) => value.toString().padStart(2, "0")
const toInputDateTime = (offsetMinutes: number) => {
  const now = new Date()
  const future = new Date(now.getTime() + offsetMinutes * 60 * 1000)
  return `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`
}

test.describe("Amenity booking synthetic monitor", () => {
  test("roommate can validate availability and inspect booking history", async ({ page }) => {
    await test.step("open bookings hub", async () => {
      await page.goto("/bookings")
      await expect(page.getByRole("heading", { name: "Amenity Bookings" })).toBeVisible()
      await expect(page.getByRole("tab", { name: "Book Amenity" })).toHaveAttribute("data-state", "active")
    })

    await test.step("check availability for the first amenity", async () => {
      const startValue = toInputDateTime(90)
      const endValue = toInputDateTime(150)

      const firstForm = page
        .locator("form")
        .filter({ has: page.locator('button:has-text("Check availability")') })
        .first()
      await firstForm.getByLabel("Start time").fill(startValue)
      await firstForm.getByLabel("End time").fill(endValue)
      await firstForm.getByRole("button", { name: "Check availability" }).click()
      await expect(firstForm.getByText("All clear")).toBeVisible()
    })

    await test.step("review booking history tab", async () => {
      await page.getByRole("tab", { name: "Booking History" }).click()
      await expect(page.getByRole("heading", { name: "Kitchen" })).toBeVisible()
      await expect(page.getByText("Last Sat", { exact: false })).toBeVisible()
    })
  })
})
