import { describe, expect, it, vi, beforeEach } from "vitest";
import Stripe from "stripe";

import { handleStripeEvent } from "@/app/api/stripe/webhook/route";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

type SupabaseStub = Pick<SupabaseClient<Database>, "from">;

type RentPaymentCall = Record<string, unknown>;

const createSupabaseStub = (options?: { existingPayment?: RentPaymentCall }) => {
  const stripeCustomerSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { profile_id: "profile-123" } }),
    }),
  });

  const rentPaymentsSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: options?.existingPayment ?? null }),
    }),
  });

  const rentPaymentsInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const rentPaymentsUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const tenantSettingsSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { metadata: {} } }),
    }),
  });

  const tenantSettingsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const from = vi.fn((table: string) => {
    switch (table) {
      case "stripe_customers":
        return {
          select: stripeCustomerSelect,
        } as unknown as ReturnType<SupabaseClient<Database>["from"]>;
      case "rent_payments":
        return {
          select: rentPaymentsSelect,
          insert: rentPaymentsInsert,
          update: rentPaymentsUpdate,
        } as unknown as ReturnType<SupabaseClient<Database>["from"]>;
      case "tenant_billing_settings":
        return {
          select: tenantSettingsSelect,
          upsert: tenantSettingsUpsert,
        } as unknown as ReturnType<SupabaseClient<Database>["from"]>;
      default:
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
          }),
        } as unknown as ReturnType<SupabaseClient<Database>["from"]>;
    }
  });

  return {
    supabase: { from } as unknown as SupabaseStub,
    rentPaymentsInsert,
    rentPaymentsUpdate,
    tenantSettingsUpsert,
  };
};

describe("handleStripeEvent", () => {
  const stripe = new Stripe("sk_test_123", { apiVersion: "2024-06-20" });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("records successful payment intents", async () => {
    const { supabase, rentPaymentsInsert, tenantSettingsUpsert } = createSupabaseStub();

    const event = {
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          amount_received: 250000,
          currency: "usd",
          customer: "cus_123",
          created: Math.floor(Date.now() / 1000),
          metadata: {
            checkout_mode: "subscription",
            billing_period_start: "2024-07-01",
            billing_period_end: "2024-07-31",
          },
          charges: {
            data: [
              {
                receipt_url: "https://stripe.test/receipts/pi_123",
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeEvent(event, { supabase, stripe });

    expect(rentPaymentsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "profile-123",
        amount: 2500,
        currency: "USD",
        status: "succeeded",
      }),
    );

    expect(tenantSettingsUpsert).toHaveBeenCalled();
  });

  it("updates failed payment intents", async () => {
    const { supabase, rentPaymentsUpdate } = createSupabaseStub({ existingPayment: { id: "payment-1" } });

    const event = {
      id: "evt_2",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_failed",
          amount: 180000,
          currency: "usd",
          customer: "cus_123",
          metadata: {
            checkout_mode: "subscription",
          },
          last_payment_error: {
            message: "Card declined",
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeEvent(event, { supabase, stripe });

    expect(rentPaymentsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
      }),
    );
  });

  it("enables autopay after checkout session completion", async () => {
    const { supabase, tenantSettingsUpsert } = createSupabaseStub();

    const event = {
      id: "evt_3",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          customer: "cus_123",
          mode: "subscription",
          subscription: "sub_123",
          payment_method: "pm_123",
          metadata: {
            initiated_from: "test",
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeEvent(event, { supabase, stripe });

    expect(tenantSettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "profile-123",
        autopay_enabled: true,
      }),
      expect.any(Object),
    );
  });
});
