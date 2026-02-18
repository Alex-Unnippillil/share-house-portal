import { beforeEach, describe, expect, it, vi } from "vitest"

const constructEvent = vi.fn()
const retrieveCheckoutSession = vi.fn()
const sendEmailNotification = vi.fn()
const sendInAppNotification = vi.fn()
const createClient = vi.fn()
const mockHeadersGet = vi.fn()

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: mockHeadersGet,
  }),
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent,
    },
    checkout: {
      sessions: {
        retrieve: retrieveCheckoutSession,
      },
    },
  }),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}))

vi.mock("@/lib/notifications", () => ({
  sendEmailNotification,
  sendInAppNotification,
}))

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role"
    mockHeadersGet.mockReturnValue("sig_123")
  })

  it("rejects requests when webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST" }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFIGURATION_ERROR",
      },
    })
  })

  it("persists checkout payments and dispatches notifications", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockResolvedValue({ data: null, error: null })
    const single = vi.fn().mockResolvedValue({
      data: { full_name: "Taylor Tenant", email: "tenant@example.com" },
      error: null,
    })

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) }
      }

      return {
        insert,
        update: vi.fn(() => ({ eq })),
      }
    })

    createClient.mockReturnValue({ from })

    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_123",
          customer: "cus_123",
          payment_status: "paid",
          receipt_url: "https://stripe.test/receipt",
        },
      },
    })

    retrieveCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      mode: "payment",
      metadata: { tenant_id: "tenant-1", unit_id: "unit-1" },
      line_items: {
        data: [
          {
            amount_total: 135000,
            currency: "usd",
            description: "August rent",
            price: { nickname: "Rent" },
          },
        ],
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify({ id: "evt_123" }),
      })
    )

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalled()
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "tenant@example.com",
        template: "payment-receipt",
      })
    )
    expect(sendInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "tenant-1",
        title: "Payment Successful",
      })
    )
  })
})
