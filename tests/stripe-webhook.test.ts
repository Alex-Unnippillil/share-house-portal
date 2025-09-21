import { describe, expect, it, vi } from "vitest";

import { webhookTestHelpers } from "@/app/api/stripe/webhook/route";
import type Stripe from "stripe";

const { handleInvoicePaymentSucceeded } = webhookTestHelpers;

describe("Stripe webhook handlers", () => {
  it("updates rent payment and billing metadata when invoice succeeds", async () => {
    const rentPayment = {
      id: "rp_1",
      amount_due_cents: 120000,
      amount_paid_cents: null,
      currency: "usd",
      tenant_id: "tenant-1",
      stripe_payment_intent_id: "pi_123",
      stripe_subscription_id: null,
      metadata: {},
      receipt_url: null,
    } as const;

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: rentPayment, error: null });

    const tenantUpsertMock = vi.fn().mockResolvedValue({ error: null });

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "rent_payments") {
          return {
            select: selectMock,
            eq: eqMock,
            maybeSingle: maybeSingleMock,
            update: updateMock,
          };
        }
        if (table === "tenant_billing_metadata") {
          return {
            upsert: tenantUpsertMock,
          };
        }
        if (table === "stripe_customers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: rentPayment.tenant_id }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    } as const;

    const invoice = {
      id: "inv_1",
      amount_due: 120000,
      amount_paid: 120000,
      currency: "usd",
      payment_intent: "pi_123",
      subscription: "sub_1",
      status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
      hosted_invoice_url: "https://stripe.example/receipt",
      invoice_pdf: null,
      metadata: { reference: "rent" },
      lines: {
        data: [
          {
            description: "Monthly rent",
            quantity: 1,
            amount: 120000,
            price: { unit_amount: 120000, recurring: { interval: "month" } },
            period: { start: Math.floor(Date.now() / 1000), end: Math.floor(Date.now() / 1000) },
          },
        ],
      },
      default_payment_method: "pm_1",
      next_payment_attempt: Math.floor(Date.now() / 1000),
    } as unknown as Stripe.Invoice;

    await handleInvoicePaymentSucceeded(supabaseMock as any, invoice);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid", stripe_invoice_id: invoice.id }),
    );
    expect(updateEqMock).toHaveBeenCalledWith("id", rentPayment.id);
    expect(tenantUpsertMock).toHaveBeenCalled();
  });
});
