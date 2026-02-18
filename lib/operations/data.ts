import 'server-only'

import { unstable_cache, unstable_noStore } from 'next/cache'

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

const financeRows: FinanceRow[] = [
  { payment_id: 'pay_1001', tenant: 'Jordan Reed', unit: '3B', amount: 1260, status: 'succeeded', processed_at: '2025-02-01T09:10:00.000Z' },
  { payment_id: 'pay_1002', tenant: 'Avery Stone', unit: '2A', amount: 980, status: 'failed', processed_at: '2025-02-03T11:00:00.000Z' },
  { payment_id: 'pay_1003', tenant: 'Sam Lee', unit: '3B', amount: 1260, status: 'pending', processed_at: '2025-02-04T14:30:00.000Z' },
]

const maintenanceRows: MaintenanceRow[] = [
  { request_id: 'mnt_201', title: 'Leaky kitchen faucet', priority: 'high', status: 'in_progress', unit: '3B', updated_at: '2025-02-05T08:15:00.000Z' },
  { request_id: 'mnt_202', title: 'Hallway light outage', priority: 'normal', status: 'pending', unit: '2A', updated_at: '2025-02-05T09:45:00.000Z' },
  { request_id: 'mnt_203', title: 'AC filter replacement', priority: 'low', status: 'completed', unit: '1C', updated_at: '2025-02-03T12:20:00.000Z' },
]

const bookingRows: BookingRow[] = [
  { booking_id: 'bk_301', amenity: 'Kitchen', unit: '3B', status: 'confirmed', start_time: '2025-02-07T18:00:00.000Z', end_time: '2025-02-07T19:30:00.000Z' },
  { booking_id: 'bk_302', amenity: 'Parking Spot 2', unit: '2A', status: 'pending', start_time: '2025-02-08T20:00:00.000Z', end_time: '2025-02-09T08:00:00.000Z' },
  { booking_id: 'bk_303', amenity: 'TV Room', unit: '1C', status: 'cancelled', start_time: '2025-02-06T21:00:00.000Z', end_time: '2025-02-06T22:00:00.000Z' },
]

const moderationRows: ModerationRow[] = [
  { message_id: 'msg_401', thread: 'Quiet hours policy', author: 'Taylor Kim', flag_reason: 'Harassment', status: 'open', created_at: '2025-02-05T10:30:00.000Z' },
  { message_id: 'msg_402', thread: 'Parking swap request', author: 'Chris Park', flag_reason: 'Spam', status: 'resolved', created_at: '2025-02-04T16:40:00.000Z' },
  { message_id: 'msg_403', thread: 'Maintenance updates', author: 'Jamie Fox', flag_reason: 'Abusive language', status: 'open', created_at: '2025-02-05T12:00:00.000Z' },
]

const visitorRows: VisitorRow[] = [
  { visitor_id: 'vis_501', guest_name: 'Nina Ortiz', host: 'Jordan Reed', status: 'approved', check_in_date: '2025-02-09', check_out_date: '2025-02-11' },
  { visitor_id: 'vis_502', guest_name: 'Luis Grant', host: 'Avery Stone', status: 'pending', check_in_date: '2025-02-10', check_out_date: '2025-02-10' },
  { visitor_id: 'vis_503', guest_name: 'Mia Wong', host: 'Sam Lee', status: 'completed', check_in_date: '2025-02-01', check_out_date: '2025-02-03' },
]

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

const getCachedOperationsKpis = unstable_cache(
  async (): Promise<KpiModule[]> => {
    const successRate = Math.round((financeRows.filter((row) => row.status === 'succeeded').length / financeRows.length) * 100)
    const openMaintenance = maintenanceRows.filter((row) => row.status !== 'completed').length
    const bookingUtilization = Math.round((bookingRows.filter((row) => row.status === 'confirmed').length / bookingRows.length) * 100)
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

export async function getFinanceRows(options?: PaginationOptions) {
  unstable_noStore()
  return paginateRows(financeRows, options)
}

const getCachedMaintenanceRows = unstable_cache(async () => maintenanceRows, ['maintenance-rows'], {
  revalidate: 300,
  tags: ['maintenance-rows'],
})
const getCachedBookingRows = unstable_cache(async () => bookingRows, ['booking-rows'], {
  revalidate: 120,
  tags: ['booking-rows'],
})
const getCachedModerationRows = unstable_cache(async () => moderationRows, ['moderation-rows'], {
  revalidate: 120,
  tags: ['moderation-rows'],
})
const getCachedVisitorRows = unstable_cache(async () => visitorRows, ['visitor-rows'], {
  revalidate: 300,
  tags: ['visitor-rows'],
})

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

  const allMaintenanceRows = await getCachedMaintenanceRows()
  const allBookingRows = await getCachedBookingRows()
  const allVisitorRows = await getCachedVisitorRows()

  const tenants = Array.from(
    new Set([...financeRows.map((row) => row.tenant), ...allVisitorRows.map((row) => row.host)])
  )
    .filter((name) => name.toLowerCase().includes(q))
    .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }))

  const units = Array.from(
    new Set([
      ...financeRows.map((row) => row.unit),
      ...allMaintenanceRows.map((row) => row.unit),
      ...allBookingRows.map((row) => row.unit),
    ])
  )
    .filter((unit) => unit.toLowerCase().includes(q))
    .map((unit) => ({ id: unit.toLowerCase(), unit }))

  const requests = allMaintenanceRows
    .filter((row) => row.title.toLowerCase().includes(q) || row.request_id.toLowerCase().includes(q))
    .map((row) => ({ id: row.request_id, title: row.title, status: row.status }))

  const payments = financeRows
    .filter((row) => row.payment_id.toLowerCase().includes(q) || row.tenant.toLowerCase().includes(q))
    .map((row) => ({ id: row.payment_id, tenant: row.tenant, amount: row.amount, status: row.status }))

  const documents = [
    { id: 'doc_lease_3b', title: 'Lease Agreement - Unit 3B', status: 'signed' },
    { id: 'doc_house_rules', title: 'House Rules - February', status: 'draft' },
    { id: 'doc_notice_2a', title: 'Maintenance Notice - Unit 2A', status: 'pending_signature' },
  ].filter((doc) => doc.title.toLowerCase().includes(q) || doc.id.toLowerCase().includes(q))

  return { tenants, units, requests, payments, documents }
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
