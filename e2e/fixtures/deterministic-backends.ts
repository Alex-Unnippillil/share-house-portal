import type { Page, Route } from "@playwright/test"

const FIXED_NOW_ISO = "2026-03-15T10:00:00.000Z"

const supabaseUser = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "tenant@example.com",
}

const roommateProfiles = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    unit_id: "unit-3b",
    full_name: "Jordan Blake",
    email: "tenant@example.com",
    role: "tenant",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    unit_id: "unit-3b",
    full_name: "Avery Chen",
    email: "avery@example.com",
    role: "roommate",
  },
]

export const stripeWebhookFixture = {
  id: "evt_test_checkout_paid",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_success_0001",
      metadata: { tenant_id: supabaseUser.id, unit_id: "unit-3b" },
      amount_total: 126000,
      currency: "usd",
    },
  },
}

export const calcomWebhookFixture = {
  triggerEvent: "BOOKING_CREATED",
  payload: {
    bookingId: 90210,
    startTime: "2026-03-16T18:00:00.000Z",
    endTime: "2026-03-16T20:00:00.000Z",
    metadata: { amenityId: "shoreline-kitchen", unitId: "unit-3b" },
  },
}

export async function installDeterministicClock(page: Page) {
  const now = new Date(FIXED_NOW_ISO).valueOf()
  await page.addInitScript((value) => {
    Date.now = () => value
  }, now)
}

export async function mockSupabaseBrowserRoutes(page: Page) {
  await page.route("**/auth/v1/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: supabaseUser }),
    })
  })

  await page.route("**/rest/v1/profiles*", async (route: Route) => {
    const requestUrl = new URL(route.request().url())
    const selectClause = requestUrl.searchParams.get("select") ?? ""

    if (selectClause.includes("unit_id") && !selectClause.includes("full_name")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ unit_id: "unit-3b" }]),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(roommateProfiles),
    })
  })
}

export async function mockWebhookAcks(page: Page) {
  await page.route("**/api/stripe/webhook", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, accepted: stripeWebhookFixture.id }),
    })
  })

  await page.route("**/api/calcom/webhook", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, accepted: calcomWebhookFixture.triggerEvent }),
    })
  })
}
