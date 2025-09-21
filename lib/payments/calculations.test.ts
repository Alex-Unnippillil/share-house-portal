import { calculateOutstandingBalance, formatCurrency } from './calculations';

describe('calculateOutstandingBalance', () => {
  it('sums open invoices and subtracts matching payments', () => {
    const invoices = [
      {
        id: 'invoice-1',
        amount_due: 1200,
        currency: 'usd',
        due_date: '2024-06-01',
        status: 'open',
        description: 'June rent',
      },
      {
        id: 'invoice-2',
        amount_due: 800,
        currency: 'usd',
        due_date: '2024-07-01',
        status: 'open',
        description: 'July rent',
      },
    ];

    const payments = [
      {
        id: 'payment-1',
        amount_paid: 1200,
        currency: 'usd',
        status: 'succeeded',
        paid_at: '2024-06-05T00:00:00.000Z',
        stripe_charge_id: 'ch_123',
        stripe_payment_intent_id: 'pi_123',
        tenant_id: 'tenant-1',
        invoice_id: 'invoice-1',
        metadata: {},
        created_at: '2024-06-05T00:00:00.000Z',
        updated_at: '2024-06-05T00:00:00.000Z',
      },
      {
        id: 'payment-2',
        amount_paid: 500,
        currency: 'usd',
        status: 'succeeded',
        paid_at: '2024-06-10T00:00:00.000Z',
        stripe_charge_id: 'ch_456',
        stripe_payment_intent_id: 'pi_456',
        tenant_id: 'tenant-1',
        invoice_id: 'other-invoice',
        metadata: {},
        created_at: '2024-06-10T00:00:00.000Z',
        updated_at: '2024-06-10T00:00:00.000Z',
      },
    ];

    const result = calculateOutstandingBalance(invoices, payments);
    expect(result).toBe(800);
  });
});

describe('formatCurrency', () => {
  it('formats numeric values with currency code', () => {
    expect(formatCurrency(123.45, 'usd')).toBe('$123.45');
  });

  it('falls back to simple formatting when Intl throws', () => {
    expect(formatCurrency(50, 'invalid')).toContain('50.00');
  });
});
