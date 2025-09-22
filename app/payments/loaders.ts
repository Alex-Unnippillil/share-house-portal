import { cookies } from 'next/headers'

import type {
  CatchUpBalance,
  CatchUpCharge,
  CatchUpChargeCategory,
} from '@/types/payments'
import type {
  NextDueInvoiceCharge,
  NextDueInvoiceSummary,
  RpcNextDueInvoiceCharge,
  RpcNextDueInvoiceRow,
} from '@/types/supabase'
import { createClient } from '@/utils/supa-server-actions'

export type CatchUpOverview = {
  balances: CatchUpBalance[]
  roommateSummaries: Array<{
    balance: CatchUpBalance
    outstanding: number
    nextCharge: NextDueInvoiceCharge | null
  }>
  outstandingTotal: number
  autopay: {
    active: number
    paused: number
    disabled: number
    coverage: number
  }
  defaultCurrency: string
}

function coerceNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseFloat(value)
  return 0
}

function parseCharges(charges: unknown): NextDueInvoiceCharge[] {
  if (!Array.isArray(charges)) {
    return []
  }

  return (charges as RpcNextDueInvoiceCharge[]).map((charge) => ({
    id: charge.id,
    description: charge.description,
    category: charge.category,
    dueDate: charge.due_date,
    originalAmount: coerceNumber(charge.original_amount),
    outstandingAmount: coerceNumber(charge.outstanding_amount),
    status: charge.status,
  }))
}

function parseNextCharge(nextCharge: unknown): NextDueInvoiceCharge | null {
  if (!nextCharge || typeof nextCharge !== 'object') {
    return null
  }

  const charge = nextCharge as RpcNextDueInvoiceCharge
  return {
    id: charge.id,
    description: charge.description,
    category: charge.category,
    dueDate: charge.due_date,
    originalAmount: coerceNumber(charge.original_amount),
    outstandingAmount: coerceNumber(charge.outstanding_amount),
    status: charge.status,
  }
}

function toChargeCategory(category: string): CatchUpChargeCategory {
  const allowed: CatchUpChargeCategory[] = [
    'rent',
    'utilities',
    'fees',
    'deposit',
    'maintenance',
    'parking',
    'other',
  ]

  return allowed.includes(category as CatchUpChargeCategory)
    ? (category as CatchUpChargeCategory)
    : 'other'
}

function parseContacts(
  metadata: Record<string, unknown> | null,
  summary: NextDueInvoiceSummary,
): CatchUpBalance['contacts'] {
  const contactsMetadata = (metadata?.contacts ?? null) as
    | {
        primary?: { name?: string; email?: string }
        roommates?: Array<{ name?: string; email?: string }>
        propertyManager?: { name?: string; email?: string }
      }
    | null

  const primaryName = contactsMetadata?.primary?.name ?? summary.roommateName
  const primaryEmail =
    contactsMetadata?.primary?.email ?? `${summary.roommateId}@roomsily.test`

  const roommates = (contactsMetadata?.roommates ?? [])
    .map((roommate) => {
      if (!roommate?.email) return null
      return {
        name: roommate.name ?? 'Roommate',
        email: roommate.email,
      }
    })
    .filter(Boolean) as CatchUpBalance['contacts']['roommates']

  const propertyManager = contactsMetadata?.propertyManager?.email
    ? {
        name: contactsMetadata.propertyManager.name ?? 'Property Manager',
        email: contactsMetadata.propertyManager.email,
      }
    : undefined

  return {
    primary: { name: primaryName, email: primaryEmail },
    roommates,
    propertyManager,
  }
}

export function toCatchUpBalance(row: RpcNextDueInvoiceRow): CatchUpBalance {
  const summary: NextDueInvoiceSummary = {
    balanceId: row.balance_id,
    roommateId: row.roommate_id,
    roommateName: row.roommate_name,
    unitLabel: row.unit_label,
    currency: row.currency,
    monthlyShare: coerceNumber(row.monthly_share),
    autopayDay: row.autopay_day,
    autopayStatus: row.autopay_status,
    lastPaymentDate: row.last_payment_date,
    lastPaymentAmount: row.last_payment_amount
      ? coerceNumber(row.last_payment_amount)
      : null,
    outstandingTotal: coerceNumber(row.outstanding_total),
    nextCharge: parseNextCharge(row.next_charge),
    charges: parseCharges(row.charges),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  }

  const contacts = parseContacts(summary.metadata, summary)
  const charges: CatchUpCharge[] = summary.charges.map((charge) => ({
    id: charge.id,
    description: charge.description,
    category: toChargeCategory(charge.category),
    dueDate: charge.dueDate,
    originalAmount: charge.originalAmount,
    outstandingAmount: charge.outstandingAmount,
  }))

  return {
    roommateId: summary.roommateId,
    roommateName: summary.roommateName,
    unitLabel: summary.unitLabel,
    currency: summary.currency,
    monthlyShare: summary.monthlyShare,
    autopayDay: summary.autopayDay,
    autopayStatus: summary.autopayStatus,
    lastPaymentDate: summary.lastPaymentDate ?? '1970-01-01',
    lastPaymentAmount: summary.lastPaymentAmount ?? 0,
    charges,
    contacts,
  }
}

export function summarizeInvoices(rows: RpcNextDueInvoiceRow[]): CatchUpOverview {
  const balances = rows.map(toCatchUpBalance)

  const roommateSummaries = rows.map((row, index) => ({
    balance: balances[index],
    outstanding: coerceNumber(row.outstanding_total),
    nextCharge: parseNextCharge(row.next_charge),
  }))

  const outstandingTotal = roommateSummaries.reduce(
    (sum, entry) => sum + entry.outstanding,
    0,
  )

  const autopayCounts = balances.reduce(
    (acc, balance) => {
      acc[balance.autopayStatus] += 1
      return acc
    },
    { active: 0, paused: 0, disabled: 0 } as Record<'active' | 'paused' | 'disabled', number>,
  )

  const roommateCount = balances.length
  const autopayCoverage = roommateCount
    ? Math.round((autopayCounts.active / roommateCount) * 100)
    : 0

  return {
    balances,
    roommateSummaries: roommateSummaries.sort((a, b) => b.outstanding - a.outstanding),
    outstandingTotal,
    autopay: {
      active: autopayCounts.active,
      paused: autopayCounts.paused,
      disabled: autopayCounts.disabled,
      coverage: autopayCoverage,
    },
    defaultCurrency: balances[0]?.currency ?? 'USD',
  }
}

export async function loadCatchUpOverview(options?: {
  householdId?: string | null
}): Promise<CatchUpOverview> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.rpc('get_next_due_invoices', {
    p_household_id: options?.householdId ?? null,
  })

  if (error) {
    throw new Error(`Failed to load next due invoices: ${error.message}`)
  }

  const rows = (data ?? []) as RpcNextDueInvoiceRow[]
  return summarizeInvoices(rows)
}
