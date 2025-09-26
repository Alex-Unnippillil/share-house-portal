import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/stripe/webhook/route"

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSession: vi.fn(),
}))

const sentryMocks = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  startSpan: vi.fn(
    async (
      _context: unknown,
      callback: (...args: unknown[]) => unknown
    ) => await callback()
  ),
}))

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: stripeMocks.constructEvent,
    },
    checkout: {
      sessions: {
        retrieve: stripeMocks.retrieveSession,
      },
    },
    invoices: {
      retrieve: vi.fn(),
    },
  }),
}))

vi.mock("@/lib/notifications", () => ({
  sendEmailNotification: vi.fn(),
  sendInAppNotification: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: sentryMocks.addBreadcrumb,
  captureException: sentryMocks.captureException,
  startSpan: sentryMocks.startSpan,
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: supabaseMocks.from,
  })),
}))

describe("Stripe webhook observability", () => {
  beforeEach(() => {
    stripeMocks.constructEvent.mockReset()
    stripeMocks.retrieveSession.mockReset()
    supabaseMocks.insert.mockReset()
    supabaseMocks.from.mockReset()
    sentryMocks.addBreadcrumb.mockClear()
    sentryMocks.captureException.mockClear()
    sentryMocks.startSpan.mockClear()

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"

    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === "rent_payments") {
        return {
          insert: supabaseMocks.insert,
        }
      }

      return {}
    })
  })

  it("records breadcrumbs when Supabase mutations fail", async () => {
    const eventPayload = {
      type: "checkout.session.completed",
      id: "evt_1",
      data: {
        object: {
          id: "cs_test",
          mode: "payment",
          payment_intent: "pi_test",
          customer: "cus_test",
          metadata: {},
          payment_status: "paid",
          receipt_url: "https://stripe.test/receipt",
        },
      },
    }

    stripeMocks.constructEvent.mockReturnValue(eventPayload)

    stripeMocks.retrieveSession.mockResolvedValue({
      id: "cs_test",
      mode: "payment",
      payment_intent: "pi_test",
      customer: "cus_test",
      payment_status: "paid",
      receipt_url: "https://stripe.test/receipt",
      line_items: {
        data: [
          {
            amount_total: 2599,
            currency: "usd",
            description: "Monthly rent",
            price: { nickname: "Rent" },
          },
        ],
      },
      metadata: {},
    })

    supabaseMocks.insert.mockRejectedValue(new Error("insert failed"))

    const response = await POST(
      new Request("http://example.com/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "signature",
          "x-request-id": "req-123",
        },
        body: "{}",
      })
    )

    expect(response.status).toBe(500)

    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "stripe.webhook",
        data: expect.objectContaining({
          eventId: "evt_1",
          customer: "cus_test",
          type: "checkout.session.completed",
        }),
      })
    )

    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "supabase.mutation",
        data: expect.objectContaining({
          table: "rent_payments",
          action: "insert",
        }),
      })
    )

    expect(sentryMocks.captureException).toHaveBeenCalled()
  })
})
