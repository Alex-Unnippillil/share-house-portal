import { describe, expect, it } from 'vitest'
import {
  buildLedgerSummaries,
  calculateLateFee,
  formatCurrency,
} from '@/app/(tenant)/billing/ledger/ledger-utils'

describe('ledger utility helpers', () => {
  it('calculates late fees based on overdue days', () => {
    const now = new Date('2024-05-11T00:00:00Z')
    const fee = calculateLateFee({
      dueDate: '2024-05-01',
      lateFeePerDay: 5,
      outstanding: 600,
      now,
    })

    expect(fee).toBe(50)
  })

  it('skips late fees for invoices without balance or daily fee', () => {
    const now = new Date('2024-05-11T00:00:00Z')
    const zeroFee = calculateLateFee({
      dueDate: '2024-05-01',
      lateFeePerDay: null,
      outstanding: 600,
      now,
    })
    const zeroOutstanding = calculateLateFee({
      dueDate: '2024-05-01',
      lateFeePerDay: 5,
      outstanding: 0,
      now,
    })

    expect(zeroFee).toBe(0)
    expect(zeroOutstanding).toBe(0)
  })

  it('builds summaries with outstanding balances and partial payments', () => {
    const now = new Date('2024-05-11T00:00:00Z')
    const summaries = buildLedgerSummaries({
      members: [
        { id: 'member-1', full_name: 'Alex Tenant', email: 'alex@example.com' },
        { id: 'member-2', full_name: 'Jamie Roomie', email: null },
      ],
      invoices: [
        {
          id: 'inv-1',
          member_id: 'member-1',
          amount_due: 1000,
          due_date: '2024-05-01',
          status: 'partial',
          description: 'May Rent',
          late_fee_per_day: 5,
        },
        {
          id: 'inv-2',
          member_id: 'member-1',
          amount_due: 500,
          due_date: '2024-05-10',
          status: 'open',
          description: 'Parking',
          late_fee_per_day: 0,
        },
      ],
      payments: [
        {
          id: 'pay-1',
          member_id: 'member-1',
          invoice_id: 'inv-1',
          amount: 400,
          created_at: '2024-05-05T12:00:00Z',
          method: 'PAD',
          status: 'succeeded',
        },
        {
          id: 'pay-2',
          member_id: 'member-1',
          invoice_id: 'inv-2',
          amount: 200,
          created_at: '2024-05-09T12:00:00Z',
          method: 'Card',
          status: 'pending',
        },
      ],
      padMandates: [
        {
          id: 'pad-1',
          member_id: 'member-1',
          status: 'active',
          bank_name: 'RBC',
          account_last4: '4321',
          last_confirmed_at: '2024-04-01',
        },
      ],
      now,
    })

    expect(summaries).toHaveLength(2)

    const [alexSummary, jamieSummary] = summaries
    expect(alexSummary.member.name).toBe('Alex Tenant')
    expect(alexSummary.outstandingBalance).toBeCloseTo(950)
    expect(alexSummary.lateFeesAccrued).toBeCloseTo(50)
    expect(alexSummary.partialPayments).toHaveLength(2)
    expect(alexSummary.partialPayments[0]).toMatchObject({
      invoice_id: 'inv-1',
      amount_paid: 400,
      remaining_balance: 600,
      late_fee_amount: 50,
    })
    expect(alexSummary.partialPayments[1]).toMatchObject({
      invoice_id: 'inv-2',
      amount_paid: 200,
      remaining_balance: 300,
      late_fee_amount: 0,
    })
    expect(alexSummary.invoices[0].amount_paid).toBe(400)
    expect(alexSummary.payments[0].id).toBe('pay-2')
    expect(alexSummary.payments[1].id).toBe('pay-1')

    expect(jamieSummary.member.name).toBe('Jamie Roomie')
    expect(jamieSummary.outstandingBalance).toBe(0)
    expect(jamieSummary.partialPayments).toHaveLength(0)
  })

  it('formats currency with two decimal places', () => {
    expect(formatCurrency(1234)).toBe('$1,234.00')
  })
})
