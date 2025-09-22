import { expect, test } from "@playwright/test"
import fs from "fs"
import path from "path"

const seededEmail = process.env.PLAYWRIGHT_SEEDED_EMAIL || "tenant.e2e@roomsily.dev"
const seededPassword = process.env.PLAYWRIGHT_SEEDED_PASSWORD || "Roomsily!123"
const pendingDocumentTitle =
  process.env.PLAYWRIGHT_SEEDED_DOCUMENT_TITLE || "E2E Lease Agreement"

const hasSupabaseConfig = Boolean(
  (process.env.PLAYWRIGHT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    seededEmail &&
    seededPassword,
)

const describeSmoke = hasSupabaseConfig ? test.describe : test.describe.skip
const authStoragePath = path.join(__dirname, ".auth", "tenant.json")

describeSmoke("Roomsily tenant smoke flows", () => {
  test.describe.configure({ mode: "serial" })

  test("onboarding: seeded tenant signs in from the onboarding flow", async ({ page }) => {
    fs.mkdirSync(path.dirname(authStoragePath), { recursive: true })

    await page.goto("/onboarding")
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible()
    await page.getByRole("tab", { name: /signin/i }).click()
    await page.getByLabel("Email").fill(seededEmail)
    await page.getByLabel("Password").fill(seededPassword)
    await page.getByRole("button", { name: /sign in/i }).click()

    await expect(page.getByText(/Successful login/)).toBeVisible({ timeout: 15_000 })

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()

    await page.context().storageState({ path: authStoragePath })
  })

  test.describe("authenticated experience", () => {
    test.use({ storageState: authStoragePath })

    test("rent payments: surfaces autopay status and outstanding balances", async ({ page }) => {
      await page.goto("/payments")

      await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible()
      await expect(page.getByText("Catch-up snapshot")).toBeVisible()
      await expect(page.getByText("Roommate balances")).toBeVisible()
      await expect(page.getByText("Avery Chen")).toBeVisible()
    })

    test("amenity bookings: allows a roommate to launch the booking flow", async ({ page }) => {
      await page.goto("/bookings")

      await expect(page.getByRole("heading", { name: "Amenity Bookings" })).toBeVisible()
      const bookKitchen = page.getByRole("button", { name: "Book now" }).first()
      await bookKitchen.click()
      await expect(page.getByText("Opening booking flow for Kitchen")).toBeVisible()
    })

    test("documents: shows pending signatures and relevant actions", async ({ page }) => {
      await page.goto("/documents")

      await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible()
      await expect(page.getByText(pendingDocumentTitle)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText("Pending Signatures")).toBeVisible()

      const pendingCard = page
        .locator("div")
        .filter({ has: page.getByRole("heading", { name: pendingDocumentTitle }) })
        .first()

      const menuButton = pendingCard.getByRole("button", { name: "Open menu" })
      await expect(menuButton).toBeVisible()
      await menuButton.click()
      await expect(page.getByRole("menuitem", { name: "Sign Document" })).toBeVisible()
    })

    test("messaging: highlights realtime roommate collaboration", async ({ page }) => {
      await page.goto("/messaging")

      await expect(page.getByRole("heading", { name: "Messaging" })).toBeVisible()
      await expect(page.getByText("Threaded conversations")).toBeVisible()
      await expect(page.getByText("Realtime presence")).toBeVisible()
    })
  })
})
