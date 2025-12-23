import { describe, expect, it } from "vitest"

import { POST as checkoutPost } from "@/app/api/stripe/checkout/route"
import { POST as billingPortalPost } from "@/app/api/stripe/billing-portal/route"
import { POST as notificationsPost } from "@/app/api/notifications/route"

const API_BASE_URL = "http://localhost/api"

describe("API request validation", () => {
  it("returns a validation error for invalid checkout payloads", async () => {
    const response = await checkoutPost(
      new Request(`${API_BASE_URL}/stripe/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: 2 }),
      })
    )

    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: { code: string; details?: { fieldErrors?: Record<string, string[]> } }
    }

    expect(payload.error.code).toBe("REQUEST_VALIDATION_ERROR")
    expect(payload.error.details?.fieldErrors?.priceId?.[0]).toMatch(
      /priceId is required/i
    )
  })

  it("returns a validation error for invalid billing portal payloads", async () => {
    const response = await billingPortalPost(
      new Request(`${API_BASE_URL}/stripe/billing-portal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: { code: string; details?: { fieldErrors?: Record<string, string[]> } }
    }

    expect(payload.error.code).toBe("REQUEST_VALIDATION_ERROR")
    expect(payload.error.details?.fieldErrors?.customerId?.[0]).toMatch(
      /customerId is required/i
    )
  })

  it("returns a validation error for invalid notification payloads", async () => {
    const response = await notificationsPost(
      new Request(`${API_BASE_URL}/notifications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "email" }),
      })
    )

    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: { code: string; details?: { fieldErrors?: Record<string, string[]> } }
    }

    expect(payload.error.code).toBe("REQUEST_VALIDATION_ERROR")
    expect(payload.error.details?.fieldErrors?.notification?.[0]).toMatch(
      /required/i
    )
  })
})
