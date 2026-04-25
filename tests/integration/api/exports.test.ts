import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>

class QueryBuilder {
  private filters: Array<(row: Row) => boolean> = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private rangeBounds: { from: number; to: number } | null = null

  constructor(private readonly rows: Row[]) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  range(from: number, to: number) {
    this.rangeBounds = { from, to }
    return this
  }

  maybeSingle() {
    const rows = this.getRows()
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }

  then(onFulfilled: (value: { data: Row[]; error: null; count: number }) => unknown) {
    const rows = this.getRows()
    return Promise.resolve(onFulfilled({ data: rows, error: null, count: rows.length }))
  }

  private getRows() {
    let output = [...this.rows]

    for (const filter of this.filters) {
      output = output.filter(filter)
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy
      output.sort((a, b) => {
        const aValue = String(a[column] ?? '')
        const bValue = String(b[column] ?? '')
        return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      })
    }

    if (this.rangeBounds) {
      output = output.slice(this.rangeBounds.from, this.rangeBounds.to + 1)
    }

    return output
  }
}

function createSupabaseFixture(role: 'property_manager' | 'admin') {
  const fixtures: Record<string, Row[]> = {
    profiles: [
      {
        id: 'manager-1',
        role,
        unit_id: 'unit-a',
        metadata: { property_id: 'property-1' },
      },
    ],
    rent_payments: [
      {
        id: 'pay-a',
        property_id: 'property-1',
        unit_id: 'unit-a',
        payer_name: 'Scoped User',
        unit: 'Unit A',
        amount: 1200,
        status: 'succeeded',
        processed_at: '2026-01-10T00:00:00.000Z',
      },
      {
        id: 'pay-b',
        property_id: 'property-2',
        unit_id: 'unit-b',
        payer_name: 'Out of Scope',
        unit: 'Unit B',
        amount: 1400,
        status: 'failed',
        processed_at: '2026-01-09T00:00:00.000Z',
      },
    ],
    bookings: [
      {
        id: 'booking-a',
        property_id: 'property-1',
        unit_id: 'unit-a',
        amenity_name: 'Kitchen',
        status: 'confirmed',
        start_time: '2026-01-14T16:00:00.000Z',
        end_time: '2026-01-14T17:00:00.000Z',
      },
      {
        id: 'booking-b',
        property_id: 'property-2',
        unit_id: 'unit-b',
        amenity_name: 'Parking',
        status: 'pending',
        start_time: '2026-01-13T16:00:00.000Z',
        end_time: '2026-01-13T17:00:00.000Z',
      },
    ],
    maintenance_requests: [],
    visitor_logs: [],
    messages: [],
  }

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'manager-1' } } })),
    },
    from: vi.fn((table: string) => new QueryBuilder(fixtures[table] ?? [])),
  }
}

const writeAuditRecord = vi.fn(async () => undefined)
const fetchMemberRole = vi.fn(async () => 'property_manager')

vi.mock('@/lib/audit', () => ({
  writeAuditRecord,
}))

vi.mock('@/lib/data/members', () => ({
  fetchMemberRole,
}))

describe('operations export routes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('exports finance CSV rows from DB fixtures and applies manager scope filters', async () => {
    const supabase = createSupabaseFixture('property_manager')

    vi.doMock('@/utils/supaone', () => ({
      createSupbaseServerClientReadOnly: vi.fn(async () => supabase),
    }))

    const { GET } = await import('@/app/api/exports/finance/route')
    const response = await GET()
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(csv).toContain('pay-a')
    expect(csv).not.toContain('pay-b')
    expect(fetchMemberRole).toHaveBeenCalledWith(supabase, 'manager-1')
    expect(writeAuditRecord).toHaveBeenCalledTimes(1)
  })

  it('exports bookings for admins without forcing unit-only scope', async () => {
    fetchMemberRole.mockResolvedValueOnce('admin')
    const supabase = createSupabaseFixture('admin')

    vi.doMock('@/utils/supaone', () => ({
      createSupbaseServerClientReadOnly: vi.fn(async () => supabase),
    }))

    const { GET } = await import('@/app/api/exports/bookings/route')
    const response = await GET()
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(csv).toContain('booking-a')
    expect(csv).toContain('booking-b')
  })
})
