import { describe, expect, it } from 'vitest'

import {
  summarizeInvoices,
  toCatchUpBalance,
} from '@/app/payments/loaders'
import type { RpcNextDueInvoiceRow } from '@/types/supabase'

describe('payments loader helpers', () => {
  const baseRow: RpcNextDueInvoiceRow = {
    balance_id: 'balance-1',
    roommate_id: 'roommate-1',
    roommate_name: 'Jordan Blake',
    unit_label: 'Unit 3B',
    currency: 'USD',
    monthly_share: 1260,
    autopay_day: 1,
    autopay_status: 'active',
    last_payment_date: '2024-05-28',
    last_payment_amount: 1260,
    metadata: {
      contacts: {
        primary: { email: 'jordan@example.com' },
        roommates: [{ name: 'Avery', email: 'avery@example.com' }],
      },
    },
    outstanding_total: 305,
    next_charge: {
      id: 'charge-1',
      description: 'June rent share',
      category: 'rent',
      due_date: '2024-06-01',
      original_amount: 1260,
      outstanding_amount: 260,
      status: 'open',
    },
    charges: [
      {
        id: 'charge-1',
        description: 'June rent share',
        category: 'rent',
        due_date: '2024-06-01',
        original_amount: 1260,
        outstanding_amount: 260,
        status: 'open',
      },
      {
        id: 'charge-2',
        description: 'Wi-Fi',
        category: 'utilities',
        due_date: '2024-06-10',
        original_amount: 45,
        outstanding_amount: 45,
        status: 'partial',
      },
    ],
  }

  it('transforms RPC invoice rows into catch-up balances', () => {
    const balance = toCatchUpBalance(baseRow)
    expect(balance.roommateName).toBe('Jordan Blake')
    expect(balance.charges).toHaveLength(2)
    expect(balance.charges[0]).toMatchObject({
      id: 'charge-1',
      category: 'rent',
      outstandingAmount: 260,
    })
    expect(balance.contacts.primary.email).toBe('jordan@example.com')
  })

  it('summarizeInvoices aggregates totals and autopay metrics', () => {
    const secondRow: RpcNextDueInvoiceRow = {
      ...baseRow,
      balance_id: 'balance-2',
      roommate_id: 'roommate-2',
      roommate_name: 'Avery Chen',
      autopay_status: 'paused',
      outstanding_total: 120,
      next_charge: null,
      charges: [],
    }

    const overview = summarizeInvoices([baseRow, secondRow])
    expect(overview.outstandingTotal).toBeCloseTo(425)
    expect(overview.autopay.active).toBe(1)
    expect(overview.autopay.paused).toBe(1)
    expect(overview.autopay.coverage).toBe(50)
    expect(overview.roommateSummaries[0].balance.roommateName).toBe('Jordan Blake')
  })
})
