import { beforeEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"

import {
  buildReconciliationLog,
  getCustomerCreditBalance,
  previewSubscriptionProration,
} from "@/lib/payments/stripe-billing"
import type {
  BillingCreditBalanceSummary,
  BillingProrationPreview,
} from "@/types/payments"

const mockRetrieveSubscription = vi.fn()
const mockRetrieveUpcoming = vi.fn()
const mockRetrieveCustomer = vi.fn()

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { retrieve: mockRetrieveSubscription },
    invoices: { retrieveUpcoming: mockRetrieveUpcoming },
    customers: { retrieve: mockRetrieveCustomer },
  }),
}))

beforeEach(() => {
  mockRetrieveSubscription.mockReset()
  mockRetrieveUpcoming.mockReset()
  mockRetrieveCustomer.mockReset()
})

describe("stripe billing proration", () => {
  it("calculates proration adjustments for plan upgrades", async () => {
    mockRetrieveSubscription.mockResolvedValue({
      id: "sub_123",
      items: { data: [{ id: "si_123", quantity: 1 }] },
      currency: "usd",
    } as unknown as Stripe.Subscription)

    mockRetrieveUpcoming.mockResolvedValue({
      currency: "usd",
      subtotal: 2200,
      total: 2200,
      amount_due: 2200,
      next_payment_attempt: 1_720_000_000,
      lines: {
        data: [
          {
            id: "line_unused_basic",
            amount: -1200,
            description: "Unused Basic plan time",
            proration: true,
            period: { start: 1_719_000_000, end: 1_719_200_000 },
          },
          {
            id: "line_premium",
            amount: 3400,
            description: "Premium plan remainder",
            proration: true,
            period: { start: 1_719_200_000, end: 1_719_800_000 },
          },
        ],
      },
    } as unknown as Stripe.UpcomingInvoice)

    const preview = await previewSubscriptionProration({
      customerId: "cus_123",
      subscriptionId: "sub_123",
      newPriceId: "price_premium",
    })

    expect(mockRetrieveSubscription).toHaveBeenCalledWith("sub_123", {
      expand: ["items.data.price"],
    })

    expect(mockRetrieveUpcoming).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        subscription: "sub_123",
        subscription_proration_behavior: "create_prorations",
        subscription_items: [
          expect.objectContaining({ id: "si_123", price: "price_premium", quantity: 1 }),
        ],
      }),
    )

    expect(preview.currency).toBe("USD")
    expect(preview.prorationAmount).toBe(22)
    expect(preview.lineItems).toHaveLength(2)
    expect(preview.lineItems[0]).toMatchObject({
      description: "Unused Basic plan time",
      amount: -12,
      isProration: true,
    })
  })

  it("surfaces credits when downgrading a plan", async () => {
    mockRetrieveSubscription.mockResolvedValue({
      id: "sub_456",
      items: { data: [{ id: "si_456", quantity: 3 }] },
      currency: "usd",
    } as unknown as Stripe.Subscription)

    mockRetrieveUpcoming.mockResolvedValue({
      currency: "usd",
      subtotal: -1800,
      total: -1800,
      amount_due: -1800,
      period_end: 1_720_050_000,
      lines: {
        data: [
          {
            id: "line_unused_premium",
            amount: -4200,
            description: "Credit for unused Premium",
            proration: true,
            period: { start: 1_719_400_000, end: 1_719_800_000 },
          },
          {
            id: "line_basic",
            amount: 2400,
            description: "Remaining Basic plan",
            proration: true,
            period: { start: 1_719_800_000, end: 1_720_050_000 },
          },
        ],
      },
    } as unknown as Stripe.UpcomingInvoice)

    const preview = await previewSubscriptionProration({
      customerId: "cus_456",
      subscriptionId: "sub_456",
      newPriceId: "price_basic",
    })

    expect(preview.prorationAmount).toBe(-18)
    expect(preview.total).toBe(-18)
    expect(preview.lineItems[0].amount).toBe(-42)
    expect(preview.lineItems[1].amount).toBe(24)
  })
})

describe("stripe billing credit summaries", () => {
  it("aggregates customer and cash balances", async () => {
    mockRetrieveCustomer.mockResolvedValue({
      id: "cus_credit",
      currency: "usd",
      balance: -5000,
      cash_balance: { available: { usd: 2500 } },
    } as unknown as Stripe.Customer)

    const summary = await getCustomerCreditBalance("cus_credit")

    expect(summary.currency).toBe("USD")
    expect(summary.customerBalance).toBe(50)
    expect(summary.cashBalance).toBe(25)
    expect(summary.totalAvailable).toBe(75)
  })
})

describe("reconciliation logs", () => {
  it("combines proration adjustments and applied credits", () => {
    const proration: BillingProrationPreview = {
      currency: "USD",
      subtotal: 22,
      total: 7,
      prorationAmount: 22,
      nextInvoiceDate: "2024-07-01T12:00:00.000Z",
      lineItems: [
        {
          id: "line_unused",
          description: "Unused Basic time",
          amount: -12,
          isProration: true,
          periodStart: "2024-06-01T00:00:00.000Z",
          periodEnd: "2024-06-15T00:00:00.000Z",
        },
        {
          id: "line_new",
          description: "Premium remainder",
          amount: 34,
          isProration: true,
          periodStart: "2024-06-15T00:00:00.000Z",
          periodEnd: "2024-07-01T00:00:00.000Z",
        },
      ],
    }

    const credits: BillingCreditBalanceSummary = {
      currency: "USD",
      customerBalance: 10,
      cashBalance: 5,
      totalAvailable: 15,
    }

    const log = buildReconciliationLog(proration, credits)

    expect(log).toHaveLength(3)
    const creditEntry = log.find((entry) => entry.source === "credit_balance")
    expect(creditEntry).toMatchObject({ amount: 15, direction: "credit" })

    const chargeEntries = log.filter(
      (entry) => entry.source === "proration" && entry.direction === "charge",
    )
    expect(chargeEntries).toHaveLength(1)

    const creditProration = log.find((entry) => entry.id === "proration_line_unused")
    expect(creditProration?.direction).toBe("credit")
  })

  it("retains proration credits when no balances are available", () => {
    const proration: BillingProrationPreview = {
      currency: "USD",
      subtotal: -18,
      total: -18,
      prorationAmount: -18,
      nextInvoiceDate: "2024-08-01T12:00:00.000Z",
      lineItems: [
        {
          id: "line_credit",
          description: "Unused Premium",
          amount: -42,
          isProration: true,
          periodEnd: "2024-07-15T00:00:00.000Z",
        },
        {
          id: "line_charge",
          description: "Basic remainder",
          amount: 24,
          isProration: true,
          periodEnd: "2024-08-01T00:00:00.000Z",
        },
      ],
    }

    const credits: BillingCreditBalanceSummary = {
      currency: "USD",
      customerBalance: 0,
      cashBalance: 0,
      totalAvailable: 0,
    }

    const log = buildReconciliationLog(proration, credits)

    expect(log.filter((entry) => entry.source === "credit_balance")).toHaveLength(0)
    expect(log.filter((entry) => entry.direction === "credit")).toHaveLength(1)
  })
})
