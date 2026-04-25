import 'server-only'

import { unstable_cache, unstable_noStore } from 'next/cache'

import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

type KpiModule = {
  id: 'payments' | 'maintenance' | 'bookings' | 'moderation'
  title: string
  value: string
  helper: string
  href: string
}

export type FinanceRow = {
  payment_id: string
  tenant: string
  unit: string
  amount: number
  status: 'succeeded' | 'failed' | 'pending'
  processed_at: string
}

export type MaintenanceRow = {
  request_id: string
  title: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  unit: string
  updated_at: string
}

export type BookingRow = {
  booking_id: string
  amenity: string
  unit: string
  status: 'confirmed' | 'pending' | 'cancelled'
  start_time: string
  end_time: string
}

export type ModerationRow = {
  message_id: string
  thread: string
  author: string
  flag_reason: string
  status: 'open' | 'resolved'
  created_at: string
}

export type VisitorRow = {
  visitor_id: string
  guest_name: string
  host: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  check_in_date: string
  check_out_date: string
}

export type PaginationOptions = {
  page?: number
  pageSize?: number
}

export type PaginatedResult<T> = {
  rows: T[]
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

function paginateRows<T>(rows: T[], options: PaginationOptions = {}): PaginatedResult<T> {
  const pageSize = Number.isFinite(options.pageSize) ? Math.min(Math.max(options.pageSize ?? 20, 1), 100) : 20
  const totalRows = rows.length
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1)
  const page = Number.isFinite(options.page) ? Math.min(Math.max(options.page ?? 1, 1), totalPages) : 1

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize

  return {
    rows: rows.slice(startIndex, endIndex),
    page,
    pageSize,
    totalRows,
    totalPages,
  }
}

async function fetchProfilesMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { full_name: string | null; unit_id: string | null }>()

  const supabase = await createSupbaseServerClientReadOnly()
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, unit_id')
    .in('id', userIds)

  return new Map<string, { full_name: string | null; unit_id: string | null }>(
    ((data ?? []) as Array<{ id: string; full_name: string | null; unit_id: string | null }>).map((profile) => [
      profile.id,
      { full_name: profile.full_name, unit_id: profile.unit_id },
    ])
  )
}

function normalizePaymentStatus(status: string | null): FinanceRow['status'] {
  if (status === 'succeeded' || status === 'completed') return 'succeeded'
  if (status === 'failed' || status === 'cancelled') return 'failed'
  return 'pending'
}

async function fetchFinanceRows(): Promise<FinanceRow[]> {
  const supabase = await createSupbaseServerClientReadOnly()
  const { data } = await (supabase as any)
    .from('rent_payments')
    .select('id, amount, status, processed_at, created_at, payer_name, user_id, tenant_id, unit, unit_id')

  const payments = (data ?? []) as Array<{
    id: string
    amount: number | null
    status: string | null
    processed_at: string | null
    created_at: string | null
    payer_name: string | null
    user_id: string | null
    tenant_id: string | null
    unit: string | null
    unit_id: string | null
  }>

  const userIds = Array.from(new Set(payments.flatMap((payment) => [payment.tenant_id, payment.user_id]).filter(Boolean) as string[]))
  const profiles = await fetchProfilesMap(userIds)

  return payments
    .map((payment) => {
      const actorId = payment.tenant_id ?? payment.user_id ?? ''
      const profile = profiles.get(actorId)
      const processedAt = payment.processed_at ?? payment.created_at ?? new Date(0).toISOString()

      return {
        payment_id: payment.id,
        tenant: payment.payer_name ?? profile?.full_name ?? 'Unknown tenant',
        unit: payment.unit ?? payment.unit_id ?? profile?.unit_id ?? 'Unknown unit',
        amount: Number(payment.amount ?? 0),
        status: normalizePaymentStatus(payment.status),
        processed_at: processedAt,
      }
    })
    .sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime())
}

async function fetchMaintenanceRows(): Promise<MaintenanceRow[]> {
  const supabase = await createSupbaseServerClientReadOnly()
  const { data } = await (supabase as any)
    .from('maintenance_requests')
    .select('id, title, priority, status, unit_label, unit_id, updated_at, created_at')

  return ((data ?? []) as Array<{
    id: string
    title: string
    priority: MaintenanceRow['priority']
    status: MaintenanceRow['status'] | 'cancelled'
    unit_label: string | null
    unit_id: string | null
    updated_at: string | null
    created_at: string | null
  }>)
    .filter((row) => row.status !== 'cancelled')
    .map((row) => ({
      request_id: row.id,
      title: row.title,
      priority: row.priority,
      status: row.status as MaintenanceRow['status'],
      unit: row.unit_label ?? row.unit_id ?? 'Unknown unit',
      updated_at: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

async function fetchBookingRows(): Promise<BookingRow[]> {
  const supabase = await createSupbaseServerClientReadOnly()
  const { data } = await (supabase as any)
    .from('bookings')
    .select('id, amenity_name, tenant_id, status, start_time, end_time')

  const bookings = (data ?? []) as Array<{
    id: string
    amenity_name: string
    tenant_id: string | null
    status: BookingRow['status']
    start_time: string
    end_time: string
  }>

  const tenantIds = Array.from(new Set(bookings.map((booking) => booking.tenant_id).filter(Boolean) as string[]))
  const profiles = await fetchProfilesMap(tenantIds)

  return bookings
    .map((booking) => ({
      booking_id: booking.id,
      amenity: booking.amenity_name,
      unit: (booking.tenant_id ? profiles.get(booking.tenant_id)?.unit_id : null) ?? 'Unknown unit',
      status: booking.status,
      start_time: booking.start_time,
      end_time: booking.end_time,
    }))
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
}

async function fetchModerationRows(): Promise<ModerationRow[]> {
  const supabase = await createSupbaseServerClientReadOnly()

  const [{ data: threads }, { data: messages }] = await Promise.all([
    (supabase as any).from('threads').select('id, title, activity, flagged_at, deleted_at'),
    (supabase as any).from('messages').select('id, thread_id, author_name, created_at'),
  ])

  const flaggedThreads = new Map<string, { title: string; activity: string | null; resolved: boolean }>(
    ((threads ?? []) as Array<{
      id: string
      title: string
      activity: string | null
      flagged_at: string | null
      deleted_at: string | null
    }>)
      .filter((thread) => Boolean(thread.flagged_at))
      .map((thread) => [thread.id, { title: thread.title, activity: thread.activity, resolved: Boolean(thread.deleted_at) }])
  )

  return ((messages ?? []) as Array<{
    id: string
    thread_id: string
    author_name: string | null
    created_at: string
  }>)
    .filter((message) => flaggedThreads.has(message.thread_id))
    .map((message) => {
      const thread = flaggedThreads.get(message.thread_id)!
      return {
        message_id: message.id,
        thread: thread.title,
        author: message.author_name ?? 'Unknown author',
        flag_reason: thread.activity ?? 'Flagged thread activity',
        status: (thread.resolved ? 'resolved' : 'open') as ModerationRow['status'],
        created_at: message.created_at,
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

async function fetchVisitorRows(): Promise<VisitorRow[]> {
  const supabase = await createSupbaseServerClientReadOnly()
  const { data } = await (supabase as any)
    .from('visitor_logs')
    .select('id, guest_name, host_id, status, check_in_date, check_out_date, created_at')

  const visitors = (data ?? []) as Array<{
    id: string
    guest_name: string
    host_id: string
    status: VisitorRow['status']
    check_in_date: string
    check_out_date: string
    created_at: string | null
  }>

  const hostIds = Array.from(new Set(visitors.map((visitor) => visitor.host_id).filter(Boolean) as string[]))
  const profiles = await fetchProfilesMap(hostIds)

  return visitors
    .map((visitor) => ({
      visitor_id: visitor.id,
      guest_name: visitor.guest_name,
      host: profiles.get(visitor.host_id)?.full_name ?? 'Unknown host',
      status: visitor.status,
      check_in_date: visitor.check_in_date,
      check_out_date: visitor.check_out_date,
    }))
    .sort((a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime())
}

const getCachedOperationsKpis = unstable_cache(
  async (): Promise<KpiModule[]> => {
    const [financeRows, maintenanceRows, bookingRows, moderationRows] = await Promise.all([
      fetchFinanceRows(),
      fetchMaintenanceRows(),
      fetchBookingRows(),
      fetchModerationRows(),
    ])

    const successRate = financeRows.length
      ? Math.round((financeRows.filter((row) => row.status === 'succeeded').length / financeRows.length) * 100)
      : 0
    const openMaintenance = maintenanceRows.filter((row) => row.status !== 'completed').length
    const bookingUtilization = bookingRows.length
      ? Math.round((bookingRows.filter((row) => row.status === 'confirmed').length / bookingRows.length) * 100)
      : 0
    const unresolvedModeration = moderationRows.filter((row) => row.status === 'open').length

    return [
      { id: 'payments', title: 'Payment success', value: `${successRate}%`, helper: 'Successful rent payments this cycle', href: '/dashboard/operations/finance' },
      { id: 'maintenance', title: 'Open maintenance', value: `${openMaintenance}`, helper: 'Requests still needing intervention', href: '/dashboard/operations/maintenance' },
      { id: 'bookings', title: 'Booking utilization', value: `${bookingUtilization}%`, helper: 'Confirmed amenity usage ratio', href: '/dashboard/operations/bookings' },
      { id: 'moderation', title: 'Unresolved moderation', value: `${unresolvedModeration}`, helper: 'Flagged posts pending review', href: '/dashboard/operations/moderation' },
    ]
  },
  ['operations-kpis'],
  { revalidate: 300, tags: ['operations-kpis'] }
)

export const getOperationsKpis = async () => getCachedOperationsKpis()

const getCachedFinanceRows = unstable_cache(async () => fetchFinanceRows(), ['finance-rows'], {
  revalidate: 120,
  tags: ['finance-rows'],
})
const getCachedMaintenanceRows = unstable_cache(async () => fetchMaintenanceRows(), ['maintenance-rows'], {
  revalidate: 300,
  tags: ['maintenance-rows'],
})
const getCachedBookingRows = unstable_cache(async () => fetchBookingRows(), ['booking-rows'], {
  revalidate: 120,
  tags: ['booking-rows'],
})
const getCachedModerationRows = unstable_cache(async () => fetchModerationRows(), ['moderation-rows'], {
  revalidate: 120,
  tags: ['moderation-rows'],
})
const getCachedVisitorRows = unstable_cache(async () => fetchVisitorRows(), ['visitor-rows'], {
  revalidate: 300,
  tags: ['visitor-rows'],
})

export async function getFinanceRows(options?: PaginationOptions) {
  unstable_noStore()
  return paginateRows(await getCachedFinanceRows(), options)
}

export async function getMaintenanceRows(options?: PaginationOptions) {
  return paginateRows(await getCachedMaintenanceRows(), options)
}
export async function getBookingRows(options?: PaginationOptions) {
  return paginateRows(await getCachedBookingRows(), options)
}
export async function getModerationRows(options?: PaginationOptions) {
  return paginateRows(await getCachedModerationRows(), options)
}
export async function getVisitorRows(options?: PaginationOptions) {
  return paginateRows(await getCachedVisitorRows(), options)
}

export async function getGlobalSearchResults(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return {
      tenants: [],
      units: [],
      requests: [],
      payments: [],
      documents: [],
    }
  }

  const [allFinanceRows, allMaintenanceRows, allBookingRows, allVisitorRows, documents] = await Promise.all([
    getCachedFinanceRows(),
    getCachedMaintenanceRows(),
    getCachedBookingRows(),
    getCachedVisitorRows(),
    (async () => {
      const supabase = await createSupbaseServerClientReadOnly()
      const { data } = await (supabase as any).from('documents').select('id, title, status')
      return (data ?? []) as Array<{ id: string; title: string; status: string }>
    })(),
  ])

  const tenants = Array.from(
    new Set([...allFinanceRows.map((row) => row.tenant), ...allVisitorRows.map((row) => row.host)])
  )
    .filter((name) => name.toLowerCase().includes(q))
    .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }))

  const units = Array.from(
    new Set([
      ...allFinanceRows.map((row) => row.unit),
      ...allMaintenanceRows.map((row) => row.unit),
      ...allBookingRows.map((row) => row.unit),
    ])
  )
    .filter((unit) => unit.toLowerCase().includes(q))
    .map((unit) => ({ id: unit.toLowerCase(), unit }))

  const requests = allMaintenanceRows
    .filter((row) => row.title.toLowerCase().includes(q) || row.request_id.toLowerCase().includes(q))
    .map((row) => ({ id: row.request_id, title: row.title, status: row.status }))

  const payments = allFinanceRows
    .filter((row) => row.payment_id.toLowerCase().includes(q) || row.tenant.toLowerCase().includes(q))
    .map((row) => ({ id: row.payment_id, tenant: row.tenant, amount: row.amount, status: row.status }))

  const matchingDocuments = documents.filter(
    (doc) => doc.title.toLowerCase().includes(q) || doc.id.toLowerCase().includes(q)
  )

  return { tenants, units, requests, payments, documents: matchingDocuments }
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = rows.map((row) =>
    headers
      .map((key) => {
        const value = row[key]
        const formatted = value === null || value === undefined ? '' : String(value)
        return `"${formatted.replaceAll('"', '""')}"`
      })
      .join(',')
  )

  return [headers.join(','), ...lines].join('\n')
}
