import { cookies } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/utils/supa-server-actions'

const ledgerFilterSchema = z.object({
  month: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional(),
})

export type SupplyLedgerFilters = z.infer<typeof ledgerFilterSchema>

type LedgerEntryRow = {
  share_id: string
  supply_id: string
  item_name: string | null
  total_cost: string | number | null
  share_amount: string | number | null
  due_date: string | null
  status: string
  note: string | null
  purchased_at: string
  purchased_month: string | null
  creditor_id: string | null
  creditor_name: string | null
  creditor_email: string | null
  creditor_avatar_url: string | null
  debtor_id: string | null
  debtor_name: string | null
  debtor_email: string | null
  debtor_avatar_url: string | null
}

type LedgerBalanceRow = {
  profile_id: string | null
  period_start: string | null
  full_name: string | null
  email: string | null
  avatar_url: string | null
  total_owed: string | number | null
  total_owing: string | number | null
  net_balance: string | number | null
}

export interface LedgerParty {
  id: string | null
  name: string
  email: string | null
  avatarUrl: string | null
}

export interface SupplyLedgerEntry {
  shareId: string
  supplyId: string
  supplyName: string
  totalCost: number
  amount: number
  dueDate: string | null
  status: string
  note: string | null
  purchasedAt: string
  purchasedMonth: string | null
  debtor: LedgerParty
  creditor: LedgerParty
}

export interface SupplyLedgerMemberPosition {
  profileId: string
  displayName: string
  email: string | null
  avatarUrl: string | null
  totalOwed: number
  totalOwing: number
  netBalance: number
  owedEntries: SupplyLedgerEntry[]
  owingEntries: SupplyLedgerEntry[]
}

export interface SupplyLedgerTotals {
  totalEntries: number
  totalOutstanding: number
  roommatesWhoOwe: number
  roommatesOwedTo: number
}

export interface SupplyLedgerData {
  entries: SupplyLedgerEntry[]
  positions: SupplyLedgerMemberPosition[]
  totals: SupplyLedgerTotals
  availableMonths: string[]
  selectedMonth?: string
}

export class LedgerDataError extends Error {
  constructor(message: string, public status = 500) {
    super(message)
    this.name = 'LedgerDataError'
  }
}

function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normaliseMonth(month: string): string {
  const [year, rawMonth] = month.split('-')
  return `${year}-${rawMonth.padStart(2, '0')}`
}

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export function supplyLedgerToCsv(entries: SupplyLedgerEntry[]): string {
  const header = [
    'share_id',
    'purchased_at',
    'item_name',
    'share_amount',
    'debtor_name',
    'debtor_email',
    'creditor_name',
    'creditor_email',
    'due_date',
    'note',
  ]

  const rows = entries.map((entry) => [
    entry.shareId,
    entry.purchasedAt,
    entry.supplyName,
    entry.amount.toFixed(2),
    entry.debtor.name,
    entry.debtor.email ?? '',
    entry.creditor.name,
    entry.creditor.email ?? '',
    entry.dueDate ?? '',
    entry.note ?? '',
  ])

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvField(value)).join(','))
    .join('\n')
}

export async function getSupplyLedgerData(
  rawFilters?: Partial<SupplyLedgerFilters>
): Promise<SupplyLedgerData> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new LedgerDataError('You must be signed in to view the supply ledger.', 401)
  }

  const validatedFilters = ledgerFilterSchema.partial().parse(rawFilters ?? {})
  const selectedMonth = validatedFilters.month
    ? normaliseMonth(validatedFilters.month)
    : undefined
  const monthStart = selectedMonth ? `${selectedMonth}-01` : undefined

  const { data: monthRows, error: monthError } = await supabase
    .from('v_supply_ledger_months')
    .select('period_start')
    .order('period_start', { ascending: false })

  if (monthError) {
    throw new LedgerDataError('Unable to load ledger periods.')
  }

  const availableMonths = Array.from(
    new Set(
      (monthRows ?? [])
        .map((row) => row.period_start)
        .filter((value): value is string => Boolean(value))
        .map((value) => value.slice(0, 7))
    )
  ).sort((a, b) => b.localeCompare(a))

  if (selectedMonth && !availableMonths.includes(selectedMonth)) {
    availableMonths.push(selectedMonth)
    availableMonths.sort((a, b) => b.localeCompare(a))
  }

  let entriesQuery = supabase
    .from('v_supply_ledger_unsettled')
    .select('*')
    .order('purchased_at', { ascending: false })

  if (monthStart) {
    entriesQuery = entriesQuery.eq('purchased_month', monthStart)
  }

  const { data: entryRowsRaw, error: entryError } = await entriesQuery

  if (entryError) {
    throw new LedgerDataError('Failed to load unsettled supply shares.')
  }

  const entryRows = (entryRowsRaw ?? []) as LedgerEntryRow[]

  let balanceQuery = supabase.from('v_supply_ledger_member_balances').select('*')

  if (monthStart) {
    balanceQuery = balanceQuery.eq('period_start', monthStart)
  }

  const { data: balanceRowsRaw, error: balanceError } = await balanceQuery

  if (balanceError) {
    throw new LedgerDataError('Failed to load roommate balance summaries.')
  }

  const balanceRows = (balanceRowsRaw ?? []) as LedgerBalanceRow[]

  const entries: SupplyLedgerEntry[] = entryRows.map((row) => ({
    shareId: row.share_id,
    supplyId: row.supply_id,
    supplyName: row.item_name ?? 'Shared supply',
    totalCost: parseNumeric(row.total_cost),
    amount: parseNumeric(row.share_amount),
    dueDate: row.due_date,
    status: row.status,
    note: row.note,
    purchasedAt: row.purchased_at,
    purchasedMonth: row.purchased_month,
    creditor: {
      id: row.creditor_id,
      name: row.creditor_name ?? 'Unassigned roommate',
      email: row.creditor_email,
      avatarUrl: row.creditor_avatar_url,
    },
    debtor: {
      id: row.debtor_id,
      name: row.debtor_name ?? 'Unassigned roommate',
      email: row.debtor_email,
      avatarUrl: row.debtor_avatar_url,
    },
  }))

  const positionMap = new Map<string, SupplyLedgerMemberPosition>()

  for (const row of balanceRows) {
    if (!row.profile_id) {
      continue
    }

    const owed = parseNumeric(row.total_owed)
    const owing = parseNumeric(row.total_owing)

    const existing = positionMap.get(row.profile_id)
    if (existing) {
      existing.totalOwed += owed
      existing.totalOwing += owing
      existing.netBalance = existing.totalOwing - existing.totalOwed
      continue
    }

    positionMap.set(row.profile_id, {
      profileId: row.profile_id,
      displayName: row.full_name ?? 'Unassigned roommate',
      email: row.email,
      avatarUrl: row.avatar_url,
      totalOwed: owed,
      totalOwing: owing,
      netBalance: owing - owed,
      owedEntries: [],
      owingEntries: [],
    })
  }

  for (const entry of entries) {
    if (entry.debtor.id) {
      const existing = positionMap.get(entry.debtor.id) ?? {
        profileId: entry.debtor.id,
        displayName: entry.debtor.name,
        email: entry.debtor.email,
        avatarUrl: entry.debtor.avatarUrl,
        totalOwed: 0,
        totalOwing: 0,
        netBalance: 0,
        owedEntries: [],
        owingEntries: [],
      }

      existing.owedEntries.push(entry)
      positionMap.set(entry.debtor.id, existing)
    }

    if (entry.creditor.id) {
      const existing = positionMap.get(entry.creditor.id) ?? {
        profileId: entry.creditor.id,
        displayName: entry.creditor.name,
        email: entry.creditor.email,
        avatarUrl: entry.creditor.avatarUrl,
        totalOwed: 0,
        totalOwing: 0,
        netBalance: 0,
        owedEntries: [],
        owingEntries: [],
      }

      existing.owingEntries.push(entry)
      positionMap.set(entry.creditor.id, existing)
    }
  }

  const positions = Array.from(positionMap.values()).map((position) => {
    const owedFromEntries = position.owedEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0
    )
    const owingFromEntries = position.owingEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0
    )

    const totalOwed = position.totalOwed || owedFromEntries
    const totalOwing = position.totalOwing || owingFromEntries

    return {
      ...position,
      totalOwed,
      totalOwing,
      netBalance: totalOwing - totalOwed,
    }
  })

  const totals: SupplyLedgerTotals = {
    totalEntries: entries.length,
    totalOutstanding: entries.reduce((sum, entry) => sum + entry.amount, 0),
    roommatesWhoOwe: positions.filter((position) => position.totalOwed > 0).length,
    roommatesOwedTo: positions.filter((position) => position.totalOwing > 0).length,
  }

  return {
    entries,
    positions,
    totals,
    availableMonths,
    selectedMonth,
  }
}
