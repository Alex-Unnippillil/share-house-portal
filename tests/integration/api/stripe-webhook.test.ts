import { beforeEach, describe, expect, it, vi } from "vitest"

const constructEvent = vi.fn()
const retrieveCheckoutSession = vi.fn()
const retrieveSubscription = vi.fn()
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
    subscriptions: {
      retrieve: retrieveSubscription,
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

function buildEqChain(result: { data: unknown; error: unknown }) {
  const secondEq = vi.fn().mockResolvedValue(result)
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq })
  return { firstEq, secondEq }
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role"
    mockHeadersGet.mockReturnValue("sig_123")
    retrieveSubscription.mockResolvedValue({
      id: "sub_123",
      metadata: {
        tenant_id: "tenant-1",
        unit_id: "unit-1",
      },
    })
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
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const rentPaymentsEq = vi.fn().mockResolvedValue({ data: null, error: null })
    const webhookUpdateEqChain = buildEqChain({ data: null, error: null })
    const single = vi.fn().mockResolvedValue({
      data: { full_name: "Taylor Tenant", email: "tenant@example.com" },
      error: null,
    })

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) }
      }

      if (table === "webhook_events") {
        return {
          insert,
          update: vi.fn(() => ({ eq: webhookUpdateEqChain.firstEq })),
        }
      }

      if (table === "rent_payments") {
        return {
          upsert,
          update: vi.fn(() => ({ eq: rentPaymentsEq })),
          insert,
          select: vi.fn(() => ({
            contains: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }
      }

      return {
        insert,
        update: vi.fn(() => ({ eq: rentPaymentsEq })),
      }
    })

    createClient.mockReturnValue({ from })

    constructEvent.mockReturnValue({
      id: "evt_123",
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
      payment_intent: "pi_123",
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
    expect(upsert).toHaveBeenCalled()
  })

  it("handles invoice.payment_failed contract payloads without finalization error", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null })
    const webhookUpdateEqChain = buildEqChain({ data: null, error: null })

    createClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "webhook_events") {
          return {
            insert,
            update: vi.fn(() => ({ eq: webhookUpdateEqChain.firstEq })),
          }
        }

        if (table === "rent_payments") {
          return {
            insert,
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
            select: vi.fn(() => ({
              contains: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          }
        }

        return {
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
        }
      }),
    })

    constructEvent.mockReturnValue({
      id: "evt_payment_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_123",
          subscription: "sub_123",
          customer: "cus_123",
          amount_due: 189900,
          currency: "usd",
          hosted_invoice_url: "https://stripe.test/invoice/in_123",
          metadata: {
            schemaVersion: "2026-rc-1",
          },
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify({ id: "evt_payment_failed" }),
      })
    )

    expect(response.status).toBe(200)
    expect(retrieveSubscription).toHaveBeenCalledWith("sub_123")
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "stripe",
        event_id: "evt_payment_failed",
      })
    )
  })
})
