import { test, expect } from "./fixtures"

test.describe("Payments monitoring", () => {
  test("tenant can review balances and launch Stripe helpers", async ({ page }) => {
    await test.step("open payments workspace", async () => {
      await page.goto("/payments")
      await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible()
      await expect(page.getByText("Catch-up snapshot")).toBeVisible()
      await expect(page.getByText("Roommate balances")).toBeVisible()
    })

    await test.step("inspect autopay summary", async () => {
      await expect(page.getByText("Outstanding total")).toBeVisible()
      await expect(page.getByText("Autopay coverage")).toBeVisible()
      await expect(page.getByText("Catch-up required")).toBeVisible()
    })

    await test.step("exercise Stripe helper actions", async () => {
      await page.getByPlaceholder("price_123 (test price id)").fill("price_synthetic")
      await page.getByRole("button", { name: "Create Checkout" }).click()

      await page.getByPlaceholder("cus_123 (Stripe customer id)").fill("cus_synthetic")
      await page.getByRole("button", { name: "Open Billing Portal" }).click()

      await expect(page.getByText("Receipt history", { exact: false })).toBeVisible()
    })
  })
})
