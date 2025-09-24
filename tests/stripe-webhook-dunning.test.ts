import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const constructEvent = vi.fn()
const retrieveInvoice = vi.fn()
const sendEmailNotification = vi.fn().mockResolvedValue({ success: true })
const sendInAppNotification = vi.fn().mockResolvedValue({ success: true })
const scheduleDunningCadence = vi.fn().mockResolvedValue({
  notifications: [
    {
      stageId: "retry_1",
      sendAt: "2024-06-02T12:00:00.000Z",
      subject: "",
      template: "payment-retry",
      scheduled: true,
    },
  ],
  retrySchedule: ["2024-06-02T12:00:00.000Z"],
})

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve({ get: () => "signature" })),
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent },
    invoices: { retrieve: retrieveInvoice },
    checkout: { sessions: { retrieve: vi.fn() } },
  })),
}))

vi.mock("@/lib/notifications", () => ({
  sendEmailNotification,
  sendInAppNotification,
  scheduleDunningCadence,
}))

const rentPaymentsInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const subscriptionsEq = vi.fn().mockResolvedValue({ data: null, error: null })
const subscriptionsUpdate = vi.fn(() => ({ eq: subscriptionsEq }))
const profilesSingle = vi
  .fn()
  .mockResolvedValue({ data: { full_name: "Taylor Tenant", email: "tenant@example.com" } })
const profilesEq = vi.fn(() => ({ single: profilesSingle }))
const profilesSelect = vi.fn(() => ({ eq: profilesEq }))

const supabaseMock = {
  from: vi.fn((table: string) => {
    switch (table) {
      case "rent_payments":
        return { insert: rentPaymentsInsert }
      case "subscriptions":
        return { update: subscriptionsUpdate }
      case "profiles":
        return { select: profilesSelect }
      default:
        throw new Error(`Unexpected table ${table}`)
    }
  }),
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => supabaseMock),
}))

describe("stripe webhook - invoice.payment_failed", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role"

    const now = new Date("2024-06-01T00:00:00.000Z").getTime()

    const baseInvoice = {
      id: "in_123",
      amount_due: 120000,
      currency: "usd",
      next_payment_attempt: Math.floor((now + 24 * 3600 * 1000) / 1000),
      last_payment_error: { message: "Card declined", code: "card_declined" },
    }

    const subscription = {
      id: "sub_123",
      metadata: {
        tenant_id: "tenant_123",
        unit_id: "unit_456",
        unit_label: "Unit 4B",
        tenant_email: "tenant@example.com",
      },
      status: "active",
    }

    const fullInvoice = {
      ...baseInvoice,
      customer: "cus_123",
      customer_email: "invoice@example.com",
      customer_name: "Taylor Tenant",
      hosted_invoice_url: "https://stripe.example/invoices/in_123",
      payment_intent: "pi_123",
      subscription,
    }

    constructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: baseInvoice },
    })

    retrieveInvoice.mockResolvedValue(fullInvoice)
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it("records failed payments, schedules dunning, and notifies tenants", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route")

    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(rentPaymentsInsert).toHaveBeenCalledTimes(1)
    const inserted = rentPaymentsInsert.mock.calls[0][0]
    expect(inserted.status).toBe("failed")
    expect(inserted.metadata.dunning_plan.retrySchedule).toHaveLength(1)
    expect(inserted.metadata.failure.code).toBe("card_declined")
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "payment-failed",
        to: "tenant@example.com",
      })
    )
    expect(scheduleDunningCadence).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "tenant@example.com",
        paymentReference: "in_123",
      })
    )
    expect(sendInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "tenant_123",
        type: "error",
      })
    )
    expect(subscriptionsUpdate).toHaveBeenCalled()
  })
})
