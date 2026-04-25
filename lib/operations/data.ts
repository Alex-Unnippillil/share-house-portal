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

export type OperationsActorRole = 'tenant' | 'roommate' | 'property_manager' | 'admin' | 'user'

export type OperationsDataContext = {
  actorId: string
  actorRole: OperationsActorRole
  unitIds?: string[]
  propertyId?: string
  client?: {
    from: (table: string) => any
  }
}

export type PaginatedResult<T> = {
  rows: T[]
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

const PRIVILEGED_ROLES = new Set<OperationsActorRole>(['property_manager', 'admin'])

function normalizePagination(options: PaginationOptions = {}) {
  const pageSize = Number.isFinite(options.pageSize) ? Math.min(Math.max(options.pageSize ?? 20, 1), 100) : 20
  const page = Number.isFinite(options.page) ? Math.max(options.page ?? 1, 1) : 1
  return { page, pageSize }
}

function mapPaymentStatus(status: string | null | undefined): FinanceRow['status'] {
  if (status === 'succeeded' || status === 'completed') return 'succeeded'
  if (status === 'failed' || status === 'cancelled') return 'failed'
  return 'pending'
}

function mapMaintenancePriority(priority: string | null | undefined): MaintenanceRow['priority'] {
  if (priority === 'low' || priority === 'normal' || priority === 'high' || priority === 'urgent') return priority
  if (priority === 'medium') return 'normal'
  return 'normal'
}

function mapMaintenanceStatus(status: string | null | undefined): MaintenanceRow['status'] {
  if (status === 'pending' || status === 'in_progress' || status === 'completed') return status
  if (status === 'open') return 'pending'
  if (status === 'cancelled') return 'completed'
  return 'pending'
}

function mapModerationStatus(status: string | null | undefined): ModerationRow['status'] {
  if (status === 'flagged') return 'open'
  return 'resolved'
}

function resolveScope(context?: OperationsDataContext) {
  if (!context) {
    return {
      isPrivileged: true,
      propertyId: undefined as string | undefined,
      unitIds: [] as string[],
      actorId: undefined as string | undefined,
      actorRole: 'admin' as OperationsActorRole,
    }
  }

  const actorRole = context.actorRole
  const isPrivileged = PRIVILEGED_ROLES.has(actorRole)

  return {
    isPrivileged,
    propertyId: context.propertyId,
    unitIds: context.unitIds ?? [],
    actorId: context.actorId,
    actorRole,
  }
}

function assertPrivilegedScope(context?: OperationsDataContext) {
  const scope = resolveScope(context)

  if (!scope.isPrivileged) {
    throw new Error('Only property managers and admins can access operations exports.')
  }

  if (scope.actorRole === 'property_manager' && !scope.propertyId && !scope.unitIds.length) {
    throw new Error('Property manager export scope is missing propertyId or unitIds.')
  }

  return scope
}

function applyManagerScopeFilters(query: any, context?: OperationsDataContext) {
  const scope = assertPrivilegedScope(context)

  if (scope.actorRole === 'admin') {
    if (scope.propertyId) {
      query = query.eq('property_id', scope.propertyId)
    }
    if (scope.unitIds.length) {
      query = query.in('unit_id', scope.unitIds)
    }
    return query
  }

  if (scope.propertyId) {
    query = query.eq('property_id', scope.propertyId)
  }

  if (scope.unitIds.length) {
    query = query.in('unit_id', scope.unitIds)
  }

  return query
}

async function getClient(context?: OperationsDataContext) {
  if (context?.client) return context.client
  return createSupbaseServerClientReadOnly()
}

async function runPaginatedQuery<T>(
  options: PaginationOptions | undefined,
  fetchPage: (page: number, pageSize: number) => Promise<{ data: T[] | null; count: number | null; error: { message: string } | null }>
): Promise<PaginatedResult<T>> {
  const { page, pageSize } = normalizePagination(options)

  let result = await fetchPage(page, pageSize)

  if (result.error) {
    throw new Error(result.error.message)
  }

  const totalRows = result.count ?? result.data?.length ?? 0
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1)
  const clampedPage = Math.min(page, totalPages)

  if (clampedPage !== page) {
    result = await fetchPage(clampedPage, pageSize)
    if (result.error) {
      throw new Error(result.error.message)
    }
  }

  return {
    rows: result.data ?? [],
    page: clampedPage,
    pageSize,
    totalRows,
    totalPages,
  }
}

const getCachedOperationsKpis = unstable_cache(
  async (): Promise<KpiModule[]> => {
    const [finance, maintenance, bookings, moderation] = await Promise.all([
      getFinanceRows({ page: 1, pageSize: 100 }),
      getMaintenanceRows({ page: 1, pageSize: 100 }),
      getBookingRows({ page: 1, pageSize: 100 }),
      getModerationRows({ page: 1, pageSize: 100 }),
    ])

    const successRate =
      finance.totalRows > 0
        ? Math.round((finance.rows.filter((row) => row.status === 'succeeded').length / finance.totalRows) * 100)
        : 0
    const openMaintenance = maintenance.rows.filter((row) => row.status !== 'completed').length
    const bookingUtilization =
      bookings.totalRows > 0
        ? Math.round((bookings.rows.filter((row) => row.status === 'confirmed').length / bookings.totalRows) * 100)
        : 0
    const unresolvedModeration = moderation.rows.filter((row) => row.status === 'open').length

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

export async function getFinanceRows(options?: PaginationOptions, context?: OperationsDataContext) {
  unstable_noStore()
  const client = await getClient(context)

  const result = await runPaginatedQuery(options, async (page, pageSize) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('rent_payments')
      .select('id, amount, status, paid_at, processed_at, created_at, tenant_id, payer_name, unit, unit_id, property_id', {
        count: 'exact',
      })
      .order('processed_at', { ascending: false, nullsFirst: false })

    query = applyManagerScopeFilters(query, context)

    return query.range(from, to)
  })

  return {
    ...result,
    rows: result.rows.map((row: any) => ({
      payment_id: String(row.id),
      tenant: String(row.payer_name ?? row.tenant_name ?? row.tenant_id ?? 'Unknown'),
      unit: String(row.unit ?? row.unit_label ?? row.unit_id ?? 'Unknown'),
      amount: Number(row.amount ?? 0),
      status: mapPaymentStatus(row.status),
      processed_at: String(row.processed_at ?? row.paid_at ?? row.created_at ?? new Date(0).toISOString()),
    } satisfies FinanceRow)),
  }
}

export async function getMaintenanceRows(options?: PaginationOptions, context?: OperationsDataContext) {
  const client = await getClient(context)

  const result = await runPaginatedQuery(options, async (page, pageSize) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('maintenance_requests')
      .select('id, title, priority, status, unit_id, unit_label, updated_at, property_id', { count: 'exact' })
      .order('updated_at', { ascending: false, nullsFirst: false })

    query = applyManagerScopeFilters(query, context)

    return query.range(from, to)
  })

  return {
    ...result,
    rows: result.rows.map((row: any) => ({
      request_id: String(row.id),
      title: String(row.title ?? 'Untitled request'),
      priority: mapMaintenancePriority(row.priority),
      status: mapMaintenanceStatus(row.status),
      unit: String(row.unit_label ?? row.unit_id ?? 'Unknown'),
      updated_at: String(row.updated_at ?? new Date(0).toISOString()),
    } satisfies MaintenanceRow)),
  }
}

export async function getBookingRows(options?: PaginationOptions, context?: OperationsDataContext) {
  const client = await getClient(context)

  const result = await runPaginatedQuery(options, async (page, pageSize) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('bookings')
      .select('id, amenity_name, amenity_id, unit_id, unit_label, status, start_time, end_time, property_id', {
        count: 'exact',
      })
      .order('start_time', { ascending: false, nullsFirst: false })

    query = applyManagerScopeFilters(query, context)

    return query.range(from, to)
  })

  return {
    ...result,
    rows: result.rows.map((row: any) => ({
      booking_id: String(row.id),
      amenity: String(row.amenity_name ?? row.amenity_id ?? 'Amenity'),
      unit: String(row.unit_label ?? row.unit_id ?? 'Unknown'),
      status: row.status === 'pending' || row.status === 'cancelled' ? row.status : 'confirmed',
      start_time: String(row.start_time),
      end_time: String(row.end_time),
    } satisfies BookingRow)),
  }
}

export async function getModerationRows(options?: PaginationOptions, context?: OperationsDataContext) {
  const client = await getClient(context)

  const result = await runPaginatedQuery(options, async (page, pageSize) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('messages')
      .select('id, thread_id, author_name, status, created_at, metadata, property_id, unit_id, threads!inner(title)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false, nullsFirst: false })

    query = query.eq('status', 'flagged')
    query = applyManagerScopeFilters(query, context)

    return query.range(from, to)
  })

  return {
    ...result,
    rows: result.rows.map((row: any) => ({
      message_id: String(row.id),
      thread: String(row.threads?.title ?? row.thread_id ?? 'Thread'),
      author: String(row.author_name ?? 'Unknown'),
      flag_reason: String(row.metadata?.flag_reason ?? row.metadata?.reason ?? 'Flagged content'),
      status: mapModerationStatus(row.status),
      created_at: String(row.created_at ?? new Date(0).toISOString()),
    } satisfies ModerationRow)),
  }
}

export async function getVisitorRows(options?: PaginationOptions, context?: OperationsDataContext) {
  const client = await getClient(context)

  const result = await runPaginatedQuery(options, async (page, pageSize) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('visitor_logs')
      .select('id, guest_name, host_id, host_name, status, check_in_date, check_out_date, arrival_date, departure_date, unit_id, property_id', {
        count: 'exact',
      })
      .order('check_in_date', { ascending: false, nullsFirst: false })

    query = applyManagerScopeFilters(query, context)

    return query.range(from, to)
  })

  return {
    ...result,
    rows: result.rows.map((row: any) => ({
      visitor_id: String(row.id),
      guest_name: String(row.guest_name ?? 'Guest'),
      host: String(row.host_name ?? row.host_id ?? 'Host'),
      status:
        row.status === 'approved' || row.status === 'rejected' || row.status === 'completed'
          ? row.status
          : 'pending',
      check_in_date: String(row.check_in_date ?? row.arrival_date ?? ''),
      check_out_date: String(row.check_out_date ?? row.departure_date ?? ''),
    } satisfies VisitorRow)),
  }
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

  const [finance, maintenance, bookings, visitors] = await Promise.all([
    getFinanceRows({ page: 1, pageSize: 100 }),
    getMaintenanceRows({ page: 1, pageSize: 100 }),
    getBookingRows({ page: 1, pageSize: 100 }),
    getVisitorRows({ page: 1, pageSize: 100 }),
  ])

  const tenants = Array.from(new Set([...finance.rows.map((row) => row.tenant), ...visitors.rows.map((row) => row.host)]))
    .filter((name) => name.toLowerCase().includes(q))
    .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }))

  const units = Array.from(new Set([...finance.rows.map((row) => row.unit), ...maintenance.rows.map((row) => row.unit), ...bookings.rows.map((row) => row.unit)]))
    .filter((unit) => unit.toLowerCase().includes(q))
    .map((unit) => ({ id: unit.toLowerCase(), unit }))

  const requests = maintenance.rows
    .filter((row) => row.title.toLowerCase().includes(q) || row.request_id.toLowerCase().includes(q))
    .map((row) => ({ id: row.request_id, title: row.title, status: row.status }))

  const payments = finance.rows
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
