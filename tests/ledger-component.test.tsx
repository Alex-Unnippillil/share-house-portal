import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LedgerMemberSection } from '@/app/(tenant)/billing/ledger/ledger-member-section'
import { buildLedgerSummaries } from '@/app/(tenant)/billing/ledger/ledger-utils'

describe('LedgerMemberSection', () => {
  it('renders accessible tables with outstanding balances and partial breakdowns', () => {
    const now = new Date('2024-05-11T00:00:00Z')
    const summaries = buildLedgerSummaries({
      members: [{ id: 'member-1', full_name: 'Alex Tenant', email: 'alex@example.com' }],
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

    const summary = summaries[0]
    render(<LedgerMemberSection summary={summary} />)

    expect(screen.getByRole('heading', { name: 'Alex Tenant' })).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('Active PAD with RBC •••4321')).toBeInTheDocument()

    const invoiceTable = screen.getByRole('table', { name: /invoice ledger/i })
    expect(invoiceTable).toBeInTheDocument()
    expect(within(invoiceTable).getByText('May Rent')).toBeInTheDocument()
    expect(within(invoiceTable).getByText('May 1, 2024')).toBeInTheDocument()
    expect(within(invoiceTable).getByText('$1,000.00')).toBeInTheDocument()
    expect(within(invoiceTable).getByText('$400.00')).toBeInTheDocument()
    expect(within(invoiceTable).getByText('$600.00')).toBeInTheDocument()
    expect(within(invoiceTable).getByText('$50.00')).toBeInTheDocument()

    const paymentTable = screen.getByRole('table', { name: /payment history/i })
    expect(paymentTable).toBeInTheDocument()
    expect(within(paymentTable).getByText('PAD')).toBeInTheDocument()
    expect(within(paymentTable).getByText('$400.00')).toBeInTheDocument()

    const partialTable = screen.getByRole('table', { name: /partial payments/i })
    expect(partialTable).toBeInTheDocument()
    expect(within(partialTable).getByText('Partial payment breakdown')).toBeInTheDocument()
    expect(within(partialTable).getByText('$600.00')).toBeInTheDocument()
    expect(within(partialTable).getByText('$50.00')).toBeInTheDocument()

    expect(screen.getByText('$650.00')).toBeInTheDocument()
    expect(screen.getByText(/Late fees accrued: \$50.00/)).toBeInTheDocument()
  })
})
