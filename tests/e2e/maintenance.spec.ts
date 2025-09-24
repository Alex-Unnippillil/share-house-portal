import { test, expect } from "./fixtures"

test.describe("Maintenance request synthetic monitor", () => {
  test("roommate can submit a maintenance ticket", async ({ page }) => {
    await test.step("open maintenance workspace", async () => {
      await page.goto("/maintenance")
      await expect(page.getByRole("heading", { name: "Maintenance Requests" })).toBeVisible()
      await expect(page.getByText("Submit Maintenance Request")).toBeVisible()
    })

    await test.step("fill out issue details", async () => {
      await page.getByLabel("Issue Title *").fill("Dishwasher leaks during rinse cycle")
      await page
        .getByLabel("Detailed Description *")
        .fill(
          "Water pools on the floor during rinse cycle and there is a burning smell. Happens every run since Monday."
        )

      await page.getByRole("button", { name: /Normal - Standard priority/ }).click()
      await page.getByRole("option", { name: /Urgent - Emergency fix needed/ }).click()

      await page.getByRole("button", { name: "Select category" }).click()
      await page.getByRole("option", { name: "Appliance" }).click()

      await page.getByLabel("Location (Optional)").fill("Kitchen")
    })

    await test.step("submit request and verify confirmation", async () => {
      await page.getByRole("button", { name: "Submit Maintenance Request" }).click()
      await expect(page.getByText("Maintenance request submitted")).toBeVisible()
    })
  })
})
