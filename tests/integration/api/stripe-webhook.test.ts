import { beforeEach, describe, expect, it, vi } from "vitest"

const constructEvent = vi.fn()
const retrieveCheckoutSession = vi.fn()
const retrieveSubscription = vi.fn()
const sendEmailNotification = vi.fn()
const sendInAppNotification = vi.fn()
const createClient = vi.fn()
const mockHeadersGet = vi.fn()
const incrementOperationalMetric = vi.fn()
const recordWebhookDeliveryMetric = vi.fn()

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

vi.mock("@/lib/observability/metrics", () => ({
  incrementOperationalMetric,
  recordWebhookDeliveryMetric,
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

  function createSupabaseMock(options?: {
    mappedTenantId?: string | null
    profileEmail?: string | null
  }) {
    const mappedTenantId = options?.mappedTenantId ?? null
    const profileEmail = options?.profileEmail ?? "tenant@example.com"

    const rentPaymentsInsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const rentPaymentsUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const webhookEventsInsert = vi.fn().mockResolvedValue({ data: null, error: null })

    const updateEqEventId = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateEqProvider = vi.fn(() => ({ eq: updateEqEventId }))
    const update = vi.fn(() => ({ eq: updateEqProvider }))

    const subscriptionsMaybeSingle = vi.fn().mockResolvedValue({
      data: mappedTenantId ? { user_id: mappedTenantId } : null,
      error: null,
    })

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { full_name: "Taylor Tenant", email: profileEmail },
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: subscriptionsMaybeSingle,
              order: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: subscriptionsMaybeSingle })) })),
            })),
          })),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          update,
        }
      }

      if (table === "webhook_events") {
        return {
          insert: webhookEventsInsert,
          update,
        }
      }

      if (table === "rent_payments") {
        return {
          insert: rentPaymentsInsert,
          upsert: rentPaymentsUpsert,
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          select: vi.fn(() => ({
            contains: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })),
          })),
        }
      }

      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update,
        select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      }
    })

    createClient.mockReturnValue({ from })

    return {
      rentPaymentsInsert,
      webhookEventsInsert,
      updateEqProvider,
      updateEqEventId,
    }
  }

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
    const { rentPaymentsInsert } = createSupabaseMock({
      mappedTenantId: "11111111-1111-4111-8111-111111111111",
    })

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
      payment_status: "paid",
      customer: "cus_123",
      metadata: { tenant_id: "11111111-1111-4111-8111-111111111111", unit_id: "unit-1" },
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
    expect(rentPaymentsInsert).toHaveBeenCalled()
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "tenant@example.com",
        template: "payment-receipt",
      })
    )
    expect(sendInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        title: "Payment update",
      })
    )
  })

  it("queues unmapped checkout events when metadata and mapping are missing", async () => {
    const { rentPaymentsInsert, updateEqProvider, updateEqEventId } = createSupabaseMock()

    constructEvent.mockReturnValue({
      id: "evt_missing_map",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_missing",
          payment_intent: "pi_missing",
          customer: "cus_missing",
          payment_status: "paid",
        },
      },
    })

    retrieveCheckoutSession.mockResolvedValue({
      id: "cs_test_missing",
      mode: "payment",
      payment_status: "paid",
      customer: "cus_missing",
      metadata: {},
      line_items: {
        data: [
          {
            amount_total: 150000,
            currency: "usd",
            description: "September rent",
            price: { nickname: "Rent" },
          },
        ],
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify({ id: "evt_missing_map" }),
      })
    )

    expect(response.status).toBe(200)
    expect(rentPaymentsInsert).not.toHaveBeenCalled()
    expect(updateEqProvider).toHaveBeenCalledWith("provider", "stripe")
    expect(updateEqEventId).toHaveBeenCalledWith("event_id", "evt_missing_map")
    expect(incrementOperationalMetric).toHaveBeenCalledWith(
      "unmapped_payment_events_total",
      expect.objectContaining({
        reason: "tenant_mapping_missing",
      })
    )
  })

  it("marks unhandled events as processed", async () => {
    const { updateEqProvider, updateEqEventId } = createSupabaseMock()

    constructEvent.mockReturnValue({
      id: "evt_unhandled",
      type: "payment_method.attached",
      data: { object: {} },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify({ id: "evt_unhandled" }),
      })
    )

    expect(response.status).toBe(200)
    expect(updateEqProvider).toHaveBeenCalledWith("provider", "stripe")
    expect(updateEqEventId).toHaveBeenCalledWith("event_id", "evt_unhandled")
  })
})
