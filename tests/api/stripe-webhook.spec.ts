import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const constructEventMock = vi.fn()
const createClientMock = vi.fn()

vi.mock("stripe", () => ({
  __esModule: true,
  default: class StripeMock {
    static webhooks = {
      constructEvent: constructEventMock,
    }
  },
}))

vi.mock("@supabase/supabase-js", () => ({
  __esModule: true,
  createClient: createClientMock,
}))

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.resetModules()
    constructEventMock.mockReset()
    createClientMock.mockReset()

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key"
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it("returns 400 when the Stripe signature header is missing", async () => {
    const supabase = createMockSupabase()
    createClientMock.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(constructEventMock).not.toHaveBeenCalled()
    expect(supabase.eventsInsert).not.toHaveBeenCalled()
  })

  it("rejects invalid webhook signatures", async () => {
    const supabase = createMockSupabase()
    createClientMock.mockReturnValue(supabase.client)
    constructEventMock.mockImplementationOnce(() => {
      throw new Error("invalid signature")
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "stripe-signature": "sig_header" },
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(supabase.eventsInsert).not.toHaveBeenCalled()
  })

  it("marks successful payment intents as paid and logs the event", async () => {
    const event = {
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          metadata: { invoice_id: "inv_db_1" },
          invoice: "in_123",
        },
      },
    }

    const supabase = createMockSupabase()
    createClientMock.mockReturnValue(supabase.client)
    constructEventMock.mockReturnValueOnce(event as any)

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "stripe-signature": "sig_header" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(constructEventMock).toHaveBeenCalledWith(expect.any(String), "sig_header", "whsec_test")
    expect(supabase.eventsInsert).toHaveBeenCalledWith([{ type: event.type, payload: event }])
    expect(supabase.paymentsUpdate).toHaveBeenCalledWith({ status: "succeeded" })
    expect(supabase.paymentsEq).toHaveBeenCalledWith("stripe_payment_intent_id", "pi_123")
    expect(supabase.invoicesUpdate).toHaveBeenCalledWith({ status: "paid" })
    expect(supabase.invoicesEq).toHaveBeenCalledWith("id", "inv_db_1")
  })

  it("handles failed payment intents", async () => {
    const event = {
      id: "evt_2",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_failed",
          metadata: { invoice_id: "inv_failed" },
          invoice: "in_failed",
        },
      },
    }

    const supabase = createMockSupabase()
    createClientMock.mockReturnValue(supabase.client)
    constructEventMock.mockReturnValueOnce(event as any)

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "stripe-signature": "sig_header" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(supabase.eventsInsert).toHaveBeenCalled()
    expect(supabase.paymentsUpdate).toHaveBeenCalledWith({ status: "failed" })
    expect(supabase.invoicesUpdate).toHaveBeenCalledWith({ status: "payment_failed" })
  })

  it("updates records for refunded charges using charge metadata", async () => {
    const event = {
      id: "evt_3",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_123",
          payment_intent: "pi_789",
          invoice: "in_789",
          metadata: {},
        },
      },
    }

    const supabase = createMockSupabase()
    createClientMock.mockReturnValue(supabase.client)
    constructEventMock.mockReturnValueOnce(event as any)

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "stripe-signature": "sig_header" },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(supabase.paymentsUpdate).toHaveBeenCalledWith({ status: "refunded" })
    expect(supabase.paymentsEq).toHaveBeenCalledWith("stripe_payment_intent_id", "pi_789")
    expect(supabase.invoicesUpdate).toHaveBeenCalledWith({ status: "refunded" })
    expect(supabase.invoicesEq).toHaveBeenCalledWith("stripe_invoice_id", "in_789")
  })

  it("returns 500 when payment updates fail", async () => {
    const event = {
      id: "evt_4",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_error",
          metadata: { invoice_id: "inv_error" },
        },
      },
    }

    const supabase = createMockSupabase()
    supabase.paymentsEq.mockResolvedValueOnce({ error: { message: "update failed" } })
    createClientMock.mockReturnValue(supabase.client)
    constructEventMock.mockReturnValueOnce(event as any)

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "stripe-signature": "sig_header" },
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})

function createMockSupabase() {
  const eventsInsert = vi.fn().mockResolvedValue({ data: null, error: null })
  const paymentsEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const paymentsUpdate = vi.fn(() => ({ eq: paymentsEq }))
  const invoicesEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const invoicesUpdate = vi.fn(() => ({ eq: invoicesEq }))

  const from = vi.fn((table: string) => {
    switch (table) {
      case "events":
        return { insert: eventsInsert }
      case "payments":
        return { update: paymentsUpdate }
      case "invoices":
        return { update: invoicesUpdate }
      default:
        throw new Error(`Unexpected table ${table}`)
    }
  })

  return {
    client: { from } as any,
    eventsInsert,
    paymentsUpdate,
    paymentsEq,
    invoicesUpdate,
    invoicesEq,
  }
}
