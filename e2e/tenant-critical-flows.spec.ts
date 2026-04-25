import { expect, test } from "@playwright/test"

import {
  installDeterministicClock,
  mockSupabaseBrowserRoutes,
  mockWebhookAcks,
} from "./fixtures/deterministic-backends"

test.describe("deterministic tenant critical flows", () => {
  test.beforeEach(async ({ page }) => {
    await installDeterministicClock(page)
    await mockWebhookAcks(page)
  })

  test("@smoke onboarding completion surfaces all required steps", async ({ page }) => {
    await page.goto("/onboarding")

    await expect(page.getByRole("heading", { name: /onboarding|finish your onboarding/i })).toBeVisible()
    await expect(page.getByText(/step 1 .*unit assignment/i)).toBeVisible()
    await expect(page.getByText(/step 2 .*rent share/i)).toBeVisible()
    await expect(page.getByText(/step 3 .*emergency contacts/i)).toBeVisible()
    await expect(page.getByText(/step 4 .*vehicle details/i)).toBeVisible()
    await expect(page.getByLabel(/onboarding completion progress/i)).toBeVisible()
  })

  test("@smoke successful Stripe checkout return path lands on payments summary", async ({ page }) => {
    await page.route("**/api/stripe/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cs_test_success_0001",
          url: "http://127.0.0.1:3000/payments?status=success&session_id=cs_test_success_0001",
        }),
      })
    })

    await page.goto("/payments")
    await page.getByPlaceholder(/price_123/i).fill("price_test_123")
    await page.getByRole("button", { name: /create one-time checkout/i }).click()

    await expect(page).toHaveURL(/\/payments\?status=success&session_id=cs_test_success_0001/)
    await expect(page.getByRole("heading", { name: /^payments$/i })).toBeVisible()
  })

  test("failed payment recovery flow supports retry after checkout failure", async ({ page }) => {
    let attempts = 0

    await page.route("**/api/stripe/checkout", async (route) => {
      attempts += 1
      if (attempts === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: "stripe temporary outage" }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cs_test_recovered_0002",
          url: "http://127.0.0.1:3000/payments?status=success&session_id=cs_test_recovered_0002",
        }),
      })
    })

    await page.goto("/payments")
    await page.getByPlaceholder(/price_123/i).fill("price_test_retry")
    await page.getByRole("button", { name: /create one-time checkout/i }).click()
    await expect(page).toHaveURL(/\/payments$/)

    await page.getByRole("button", { name: /create one-time checkout/i }).click()
    await expect(page).toHaveURL(/session_id=cs_test_recovered_0002/)
  })

  test("@smoke amenity booking conflict handling blocks overlapping reservations", async ({ page }) => {
    await page.route("**/api/bookings/validate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          allowed: false,
          errors: [],
          warnings: ["Another booking starts in this window"],
          conflicts: [{ id: "booking_existing_1" }],
        }),
      })
    })

    await page.goto("/bookings")
    await page.getByRole("button", { name: /^validate booking$/i }).first().click()

    await expect(page.getByText(/validation warnings to review/i)).toBeVisible()
    await expect(page.getByText(/1 overlapping booking\(s\) detected in local mirror/i)).toBeVisible()
  })

  test("@smoke overnight visitor policy limit enforcement returns deterministic violations", async ({ page }) => {
    await mockSupabaseBrowserRoutes(page)
    await page.route("**/api/visitors", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message: "Visitor request violates policy",
            details: {
              violations: ["Exceeds max consecutive nights (3)", "Conflicts with existing approved stay"],
            },
          },
        }),
      })
    })

    await page.goto("/visitors")
    await page.getByLabel(/guest full name/i).fill("Casey Visitor")
    await page.getByLabel(/guest email/i).fill("casey.visitor@example.com")
    await page.getByRole("button", { name: /pick arrival date/i }).click()
    await page.locator("button.rdp-day:not([disabled])").first().click()
    await page.getByRole("button", { name: /pick departure date/i }).click()
    await page.locator("button.rdp-day:not([disabled])").nth(4).click()
    await page.getByLabel(/reason for stay/i).fill("Visiting from out of town for a family event and check-in support.")

    await page.getByRole("button", { name: /submit visitor request/i }).click()

    await expect(page.getByText(/exceeds max consecutive nights/i)).toBeVisible()
    await expect(page.getByText(/conflicts with existing approved stay/i)).toBeVisible()
  })
})
