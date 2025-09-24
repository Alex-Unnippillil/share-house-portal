import { test, expect } from "./fixtures"

const demoEmail = "synthetic.tenant+onboarding@roomsily.test"
const demoPassword = "Sup3rSecure!"

test.describe("Onboarding journey", () => {
  test("tenant can review onboarding options and start registration", async ({ page }) => {
    await test.step("navigate to onboarding portal", async () => {
      await page.goto("/onboarding")
      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Login" })).toBeVisible()
    })

    await test.step("switch to the registration tab", async () => {
      await expect(page.getByRole("tab", { name: "SignIn" })).toHaveAttribute("data-state", "active")
      await page.getByRole("tab", { name: "Register" }).click()
      await expect(page.getByRole("tab", { name: "Register" })).toHaveAttribute("data-state", "active")
    })

    await test.step("complete registration form fields", async () => {
      await page.getByLabel("Email").fill(demoEmail)
      await page.getByLabel("Password").fill(demoPassword)
      await page.getByLabel("Confirm Password").fill(demoPassword)
      await expect(page.getByRole("button", { name: "Register" })).toBeEnabled()
    })
  })
})
