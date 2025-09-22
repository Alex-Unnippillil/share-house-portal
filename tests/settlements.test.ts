import { beforeEach, describe, expect, it, vi } from "vitest"

const paymentIntentCreateMock = vi.fn()

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: {
        create: paymentIntentCreateMock,
      },
    })),
  }
})

import { POST } from "@/app/api/billing/settlements/route"
import { __resetLedgerForTesting, listPayments } from "@/lib/payments-ledger"

describe("billing settlements API", () => {
  beforeEach(() => {
    __resetLedgerForTesting()
    paymentIntentCreateMock.mockReset()
    paymentIntentCreateMock.mockResolvedValue({
      id: "pi_default",
      client_secret: "secret_default",
    })
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
  })

  it("creates invoice adjustments and records a ledger entry", async () => {
    const request = new Request("http://localhost/api/billing/settlements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "invoice",
        supply: {
          vendor: "Costco",
          purchaseDate: "2024-07-14",
          total: 120.5,
          memo: "Household supplies",
          adjustments: [
            { roommate: "Alex", amount: 60.25, memo: "Paper goods" },
            { roommate: "Sam", amount: 60.25 },
          ],
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe("queued_for_invoice")
    expect(payload.invoiceAdjustmentRows).toHaveLength(2)
    expect(payload.totalAdjustmentAmount).toBeCloseTo(120.5)

    const ledger = listPayments()
    expect(ledger).toHaveLength(1)
    expect(ledger[0].status).toBe("queued_for_invoice")
    expect(ledger[0].adjustments).toHaveLength(2)
    expect(ledger[0].total).toBeCloseTo(120.5)
  })

  it("creates a Stripe PaymentIntent and records the result", async () => {
    paymentIntentCreateMock.mockResolvedValueOnce({
      id: "pi_123",
      client_secret: "secret_123",
    })

    const request = new Request("http://localhost/api/billing/settlements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "payment_intent",
        supply: {
          vendor: "Home Depot",
          purchaseDate: "2024-07-10",
          total: 90.5,
          memo: "Tool rental",
          adjustments: [{ roommate: "Taylor", amount: 45.25 }],
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe("payment_intent_created")
    expect(payload.paymentIntentId).toBe("pi_123")
    expect(payload.paymentIntentClientSecret).toBe("secret_123")

    expect(paymentIntentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 9050,
        currency: "usd",
      }),
    )

    const ledger = listPayments()
    expect(ledger).toHaveLength(1)
    expect(ledger[0].reference).toBe("pi_123")
    expect(ledger[0].status).toBe("payment_intent_created")
    expect(ledger[0].total).toBeCloseTo(90.5)
  })
})
