import { describe, expect, it } from 'vitest';

import {
  createPaymentHistoryCsv,
  formatReceiptPeriod,
} from '@/lib/payments/receipts';
import type { PaymentReceiptHistoryEntry } from '@/types/payments';

describe('formatReceiptPeriod', () => {
  it('formats ranges and single dates to the display string', () => {
    expect(formatReceiptPeriod('2024-06-01', '2024-06-30')).toBe('Jun 1 – Jun 30, 2024');
    expect(formatReceiptPeriod(undefined, '2024-05-15')).toBe('May 15, 2024');
    expect(formatReceiptPeriod(undefined, undefined)).toBe('—');
  });
});

describe('createPaymentHistoryCsv', () => {
  it('builds rows using the same columns as the receipt history table', () => {
    const receipts: PaymentReceiptHistoryEntry[] = [
      {
        id: 'rcpt_1',
        issuedTo: 'Alex Johnson',
        paymentDate: '2024-06-01',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        currency: 'USD',
        amount: 1305,
        status: 'paid',
        paymentMethod: 'Visa •••• 4242',
        receiptUrl: 'https://receipts.example/rcpt_1.pdf',
        invoiceUrl: 'https://invoices.example/rcpt_1',
        memo: 'Rent for June',
        lineItems: [
          {
            id: 'item-1',
            description: 'June rent share',
            category: 'rent',
            quantity: 1,
            unitAmount: 1260,
            totalAmount: 1260,
          },
          {
            id: 'item-2',
            description: 'Wi-Fi reimbursement',
            category: 'utilities',
            quantity: 1,
            unitAmount: 45,
            totalAmount: 45,
          },
        ],
      },
      {
        id: 'rcpt_2',
        issuedTo: 'Taylor Singh',
        paymentDate: '2024-05-15',
        periodStart: undefined,
        periodEnd: '2024-05-15',
        currency: 'USD',
        amount: -45,
        status: 'refunded',
        paymentMethod: 'ACH Refund',
        receiptUrl: 'https://receipts.example/rcpt_2.pdf',
        invoiceUrl: null,
        memo: undefined,
        lineItems: [
          {
            id: 'item-3',
            description: 'Utility adjustment',
            category: 'utilities',
            quantity: 1,
            unitAmount: -45,
            totalAmount: -45,
          },
        ],
      },
    ];

    const csv = createPaymentHistoryCsv(receipts);

    const expected = [
      '"Payment","Period","Line items","Amount","Status","Actions"',
      '"Alex Johnson\nJun 1, 2024 · Visa •••• 4242\nRent for June","Jun 1 – Jun 30, 2024","June rent share — $1,260.00\nWi-Fi reimbursement — $45.00","$1,305.00","Paid","Receipt: https://receipts.example/rcpt_1.pdf\nInvoice: https://invoices.example/rcpt_1"',
      '"Taylor Singh\nMay 15, 2024 · ACH Refund","May 15, 2024","Utility adjustment — -$45.00","-$45.00\nCredit issued","Refunded","Receipt: https://receipts.example/rcpt_2.pdf"',
    ].join('\n');

    expect(csv).toBe(expected);
  });
});
