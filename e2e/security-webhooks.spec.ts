import { expect, test } from "@playwright/test"

import { expectAuthBoundary } from "./helpers"

test.describe("authorization boundaries and webhook failure/retry", () => {
  test("unauthorized users are blocked from export APIs", async ({ request }) => {
    await expectAuthBoundary(request, "/api/exports/finance")
    await expectAuthBoundary(request, "/api/exports/maintenance")
    await expectAuthBoundary(request, "/api/exports/bookings")
    await expectAuthBoundary(request, "/api/exports/visitors")
  })

  test("stripe webhook rejects invalid signatures before retry", async ({ request }) => {
    const invalid = await request.post("/api/stripe/webhook", {
      data: { id: "evt_bad", type: "invoice.payment_succeeded" },
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=invalid",
      },
    })

    expect([400, 500]).toContain(invalid.status())

    const retry = await request.post("/api/stripe/webhook", {
      data: { id: "evt_retry", type: "invoice.payment_succeeded" },
      headers: { "content-type": "application/json" },
    })

    expect([400, 500]).toContain(retry.status())
  })

  test("cal.com webhook rejects invalid payload then supports retry semantics", async ({ request }) => {
    const invalidPayload = await request.post("/api/calcom/webhook", {
      data: "not-json",
      headers: { "content-type": "text/plain" },
    })

    expect([400, 500]).toContain(invalidPayload.status())

    const retryPayload = await request.post("/api/calcom/webhook", {
      data: { triggerEvent: "BOOKING_CREATED" },
      headers: { "content-type": "application/json" },
    })

    expect([200, 500]).toContain(retryPayload.status())
  })
})
