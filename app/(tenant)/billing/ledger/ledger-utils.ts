export type LedgerInvoice = {
  id: string
  member_id: string
  amount_due: number
  due_date: string | null
  status: 'open' | 'partial' | 'paid' | 'void'
  description?: string | null
  late_fee_per_day?: number | null
}

export type LedgerPayment = {
  id: string
  member_id: string
  invoice_id: string | null
  amount: number
  created_at: string
  method?: string | null
  status?: string | null
}

export type LedgerPadMandate = {
  id: string
  member_id: string
  status: 'active' | 'pending' | 'revoked' | 'none'
  bank_name?: string | null
  account_last4?: string | null
  last_confirmed_at?: string | null
}

export type LedgerMember = {
  id: string
  full_name: string | null
  email: string | null
}

export type LedgerInvoiceSummary = LedgerInvoice & {
  amount_paid: number
  remaining_balance: number
  late_fee_amount: number
}

export type LedgerPartialBreakdown = {
  invoice_id: string
  description: string
  due_date: string | null
  amount_due: number
  amount_paid: number
  remaining_balance: number
  late_fee_amount: number
}

export type LedgerSummary = {
  member: {
    id: string
    name: string
    email: string | null
  }
  invoices: LedgerInvoiceSummary[]
  payments: LedgerPayment[]
  padMandate?: LedgerPadMandate | null
  outstandingBalance: number
  lateFeesAccrued: number
  partialPayments: LedgerPartialBreakdown[]
}

const MS_IN_DAY = 1000 * 60 * 60 * 24

function normaliseDate(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export function calculateLateFee({
  dueDate,
  lateFeePerDay,
  outstanding,
  now = new Date(),
}: {
  dueDate: string | null | undefined
  lateFeePerDay: number | null | undefined
  outstanding: number
  now?: Date
}): number {
  if (!dueDate || !lateFeePerDay || lateFeePerDay <= 0 || outstanding <= 0) {
    return 0
  }

  const due = normaliseDate(new Date(dueDate))
  if (Number.isNaN(due.getTime())) {
    return 0
  }

  const today = normaliseDate(now)
  if (today <= due) {
    return 0
  }

  const diffMs = today.getTime() - due.getTime()
  const daysLate = Math.max(Math.floor(diffMs / MS_IN_DAY), 0)
  return daysLate * lateFeePerDay
}

export function formatCurrency(value: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value: string | null | undefined, locale: string = 'en-CA'): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export function buildLedgerSummaries({
  members,
  invoices,
  payments,
  padMandates,
  now = new Date(),
}: {
  members: LedgerMember[]
  invoices: LedgerInvoice[]
  payments: LedgerPayment[]
  padMandates: LedgerPadMandate[]
  now?: Date
}): LedgerSummary[] {
  const memberMap = new Map(members.map(member => [member.id, member]))
  const padMap = new Map(padMandates.map(mandate => [mandate.member_id, mandate]))

  const memberIds = new Set<string>([
    ...members.map(member => member.id),
    ...invoices.map(invoice => invoice.member_id),
    ...payments.map(payment => payment.member_id),
    ...padMandates.map(mandate => mandate.member_id),
  ])

  const paymentsByInvoice = payments.reduce<Record<string, LedgerPayment[]>>((acc, payment) => {
    if (!payment.invoice_id) {
      return acc
    }

    if (!acc[payment.invoice_id]) {
      acc[payment.invoice_id] = []
    }

    acc[payment.invoice_id].push(payment)
    return acc
  }, {})

  const paymentsByMember = payments.reduce<Record<string, LedgerPayment[]>>((acc, payment) => {
    if (!acc[payment.member_id]) {
      acc[payment.member_id] = []
    }

    acc[payment.member_id].push(payment)
    return acc
  }, {})

  const summaries: LedgerSummary[] = []

  for (const memberId of memberIds) {
    const member = memberMap.get(memberId) ?? {
      id: memberId,
      full_name: null,
      email: null,
    }

    const memberInvoices = invoices
      .filter(invoice => invoice.member_id === memberId)
      .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime())

    const invoiceSummaries: LedgerInvoiceSummary[] = []
    const partialPayments: LedgerPartialBreakdown[] = []

    let outstanding = 0
    let lateFees = 0

    for (const invoice of memberInvoices) {
      const relatedPayments = paymentsByInvoice[invoice.id] ?? []
      const amountPaid = relatedPayments.reduce((total, payment) => total + payment.amount, 0)
      const remaining = Math.max(invoice.amount_due - amountPaid, 0)
      const lateFee = calculateLateFee({
        dueDate: invoice.due_date,
        lateFeePerDay: invoice.late_fee_per_day,
        outstanding: remaining,
        now,
      })

      invoiceSummaries.push({
        ...invoice,
        amount_paid: amountPaid,
        remaining_balance: remaining,
        late_fee_amount: lateFee,
      })

      if (amountPaid > 0 && remaining > 0) {
        partialPayments.push({
          invoice_id: invoice.id,
          description: invoice.description ?? `Invoice ${invoice.id}`,
          due_date: invoice.due_date,
          amount_due: invoice.amount_due,
          amount_paid: amountPaid,
          remaining_balance: remaining,
          late_fee_amount: lateFee,
        })
      }

      outstanding += remaining + lateFee
      lateFees += lateFee
    }

    partialPayments.sort((a, b) => {
      const aTime = new Date(a.due_date ?? 0).getTime()
      const bTime = new Date(b.due_date ?? 0).getTime()
      return aTime - bTime
    })

    const memberPaymentsList = (paymentsByMember[memberId] ?? []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    summaries.push({
      member: {
        id: member.id,
        name: member.full_name ?? 'Unnamed member',
        email: member.email,
      },
      invoices: invoiceSummaries,
      payments: memberPaymentsList,
      padMandate: padMap.get(memberId),
      outstandingBalance: outstanding,
      lateFeesAccrued: lateFees,
      partialPayments,
    })
  }

  return summaries.sort((a, b) => a.member.name.localeCompare(b.member.name))
}
