import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

import { processStripeEvent } from "@/app/api/stripe/webhook/route"
import type { Database } from "@/lib/supabase"
import { getStripe } from "@/lib/stripe"

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}))

vi.mock("@/lib/notifications", () => ({
  sendEmailNotification: vi.fn().mockResolvedValue(undefined),
  sendInAppNotification: vi.fn().mockResolvedValue(undefined),
}))

describe("Stripe webhook idempotency", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("avoids duplicate rent payments for repeated invoice events", async () => {
    const rentPaymentsUpsert = vi
      .fn()
      .mockResolvedValue({ data: null, error: null })
    const processedEventsInsert = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "23505" } })
    const subscriptionEq = vi
      .fn()
      .mockResolvedValue({ data: null, error: null })
    const subscriptionUpdate = vi
      .fn()
      .mockReturnValue({
        eq: subscriptionEq,
      })

    const supabase = {
      from: vi.fn((table: string) => {
        switch (table) {
          case "stripe_processed_events":
            return { insert: processedEventsInsert }
          case "rent_payments":
            return { upsert: rentPaymentsUpsert }
          case "subscriptions":
            return { update: subscriptionUpdate }
          default:
            throw new Error(`Unexpected table: ${table}`)
        }
      }),
    } as unknown as SupabaseClient<Database>

    const invoiceRetrieve = vi.fn().mockResolvedValue({
      id: "in_123",
      amount_paid: 150000,
      currency: "usd",
      customer: "cus_123",
      hosted_invoice_url: "https://example.com/invoice",
      payment_intent: "pi_123",
      subscription: {
        id: "sub_123",
        metadata: {
          tenant_id: "tenant-1",
          unit_id: "unit-1",
          unit_label: "Unit 1",
        },
        status: "active",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2_592_000,
      },
      billing_reason: "subscription_cycle",
    })

    vi.mocked(getStripe).mockReturnValue({
      invoices: { retrieve: invoiceRetrieve },
      checkout: { sessions: { retrieve: vi.fn() } },
    } as any)

    const event = {
      id: "evt_1",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_123",
          amount_paid: 150000,
          currency: "usd",
          customer: "cus_123",
          hosted_invoice_url: "https://example.com/invoice",
          payment_intent: "pi_123",
        },
      },
    }

    const firstProcessed = await processStripeEvent(supabase, event)
    const secondProcessed = await processStripeEvent(supabase, event)

    expect(firstProcessed).toBe(true)
    expect(secondProcessed).toBe(false)
    expect(processedEventsInsert).toHaveBeenCalledTimes(2)
    expect(rentPaymentsUpsert).toHaveBeenCalledTimes(1)
    expect(rentPaymentsUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onConflict: "stripe_invoice_id" })
    )
    expect(subscriptionUpdate).toHaveBeenCalledTimes(1)
  })

  it("avoids duplicate rent payments for repeated checkout events", async () => {
    const rentPaymentsUpsert = vi
      .fn()
      .mockResolvedValue({ data: null, error: null })
    const processedEventsInsert = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "23505" } })
    const profileSingle = vi
      .fn()
      .mockResolvedValue({
        data: { full_name: "Taylor Tenant", email: "tenant@example.com" },
        error: null,
      })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const supabase = {
      from: vi.fn((table: string) => {
        switch (table) {
          case "stripe_processed_events":
            return { insert: processedEventsInsert }
          case "rent_payments":
            return { upsert: rentPaymentsUpsert }
          case "profiles":
            return { select: profileSelect }
          default:
            throw new Error(`Unexpected table: ${table}`)
        }
      }),
    } as unknown as SupabaseClient<Database>

    const checkoutRetrieve = vi.fn().mockResolvedValue({
      id: "cs_test",
      mode: "payment",
      line_items: {
        data: [
          {
            amount_total: 150000,
            currency: "usd",
            description: "March rent",
            price: { nickname: "March rent" },
          },
        ],
      },
      metadata: {
        tenant_id: "tenant-1",
        unit_id: "unit-1",
      },
    })

    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { retrieve: checkoutRetrieve } },
      invoices: { retrieve: vi.fn() },
    } as any)

    const event = {
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          payment_intent: "pi_test",
          customer: "cus_123",
          receipt_url: "https://example.com/receipt",
          metadata: {
            tenant_id: "tenant-1",
            unit_id: "unit-1",
          },
        },
      },
    }

    const firstProcessed = await processStripeEvent(supabase, event)
    const secondProcessed = await processStripeEvent(supabase, event)

    expect(firstProcessed).toBe(true)
    expect(secondProcessed).toBe(false)
    expect(processedEventsInsert).toHaveBeenCalledTimes(2)
    expect(rentPaymentsUpsert).toHaveBeenCalledTimes(1)
    expect(rentPaymentsUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onConflict: "stripe_payment_intent_id" })
    )
  })
})
