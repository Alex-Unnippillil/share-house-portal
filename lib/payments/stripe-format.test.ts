import type Stripe from 'stripe';

import { buildReceiptPayload } from './stripe-format';

describe('buildReceiptPayload', () => {
  const chargeBase: Partial<Stripe.Charge> = {
    id: 'ch_test',
    amount_captured: 15000,
    currency: 'usd',
    created: 1_710_000_000,
    paid: true,
    billing_details: {
      email: 'tenant@example.com',
      name: 'Taylor Tenant',
    },
  };

  it('maps charge and invoice data into receipt props', () => {
    const charge = {
      ...chargeBase,
      invoice: null,
    } as Stripe.Charge;

    const invoice = {
      id: 'in_test',
      subtotal: 15000,
      total: 15000,
      tax: null,
      total_discount_amounts: [],
      lines: {
        data: [
          {
            id: 'il_1',
            amount: 15000,
            description: 'Monthly rent',
            quantity: 1,
            price: {
              id: 'price_1',
              unit_amount: 15000,
              nickname: 'Rent',
            },
          },
        ],
      },
    } as unknown as Stripe.Invoice;

    const payload = buildReceiptPayload({ charge, invoice });

    expect(payload.customerEmail).toBe('tenant@example.com');
    expect(payload.amountPaid).toBeCloseTo(150);
    expect(payload.items?.[0]?.description).toBe('Monthly rent');
    expect(payload.items?.[0]?.totalAmount).toBeCloseTo(150);
  });

  it('throws when no customer email can be derived', () => {
    const charge = {
      ...chargeBase,
      billing_details: {},
      receipt_email: null,
      customer: null,
      invoice: null,
    } as unknown as Stripe.Charge;

    expect(() => buildReceiptPayload({ charge, invoice: null })).toThrow();
  });
});
