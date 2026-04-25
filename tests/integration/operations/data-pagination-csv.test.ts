import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  unstable_noStore: vi.fn(),
}))

type Row = Record<string, unknown>

const seeded = {
  rent_payments: [
    {
      id: 'pay_003',
      amount: 1200,
      status: 'pending',
      processed_at: '2026-03-03T12:00:00.000Z',
      created_at: '2026-03-03T12:00:00.000Z',
      payer_name: null,
      user_id: 'user-3',
      tenant_id: null,
      unit: null,
      unit_id: null,
    },
    {
      id: 'pay_002',
      amount: 1200,
      status: 'failed',
      processed_at: '2026-03-02T12:00:00.000Z',
      created_at: '2026-03-02T12:00:00.000Z',
      payer_name: 'Avery Stone',
      user_id: 'user-2',
      tenant_id: null,
      unit: '2A',
      unit_id: null,
    },
    {
      id: 'pay_001',
      amount: 1260,
      status: 'succeeded',
      processed_at: '2026-03-01T12:00:00.000Z',
      created_at: '2026-03-01T12:00:00.000Z',
      payer_name: null,
      user_id: 'user-1',
      tenant_id: null,
      unit: null,
      unit_id: null,
    },
  ],
  maintenance_requests: [
    {
      id: 'mnt_1',
      title: 'Leaky faucet',
      priority: 'high',
      status: 'in_progress',
      unit_label: '3B',
      unit_id: null,
      updated_at: '2026-03-04T00:00:00.000Z',
      created_at: '2026-03-03T00:00:00.000Z',
    },
  ],
  bookings: [],
  threads: [],
  messages: [],
  visitor_logs: [],
  documents: [],
  profiles: [
    { id: 'user-1', full_name: 'Jordan Reed', unit_id: '3B' },
    { id: 'user-2', full_name: 'Avery Stone', unit_id: '2A' },
    { id: 'user-3', full_name: 'Sam Lee', unit_id: '1C' },
  ],
} as const

function createSupabaseStub() {
  return {
    from(table: keyof typeof seeded) {
      const state: { selectedRows: Row[] } = {
        selectedRows: [...(seeded[table] as unknown as Row[])],
      }

      const builder: any = {
        select() {
          return builder
        },
        in(column: string, values: string[]) {
          state.selectedRows = state.selectedRows.filter((row) => values.includes(String(row[column] ?? '')))
          return Promise.resolve({ data: state.selectedRows, error: null })
        },
        then(resolve: (value: { data: Row[]; error: null }) => unknown) {
          return Promise.resolve(resolve({ data: state.selectedRows, error: null }))
        },
      }

      return builder
    },
  }
}

vi.mock('@/utils/supaone', () => ({
  createSupbaseServerClientReadOnly: vi.fn(async () => createSupabaseStub()),
}))

describe('operations data integration: pagination + csv', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('paginates live finance rows from seeded Supabase data', async () => {
    const { getFinanceRows } = await import('@/lib/operations/data')

    const page1 = await getFinanceRows({ page: 1, pageSize: 2 })
    const page2 = await getFinanceRows({ page: 2, pageSize: 2 })

    expect(page1.totalRows).toBe(3)
    expect(page1.totalPages).toBe(2)
    expect(page1.rows.map((row) => row.payment_id)).toEqual(['pay_003', 'pay_002'])
    expect(page2.rows.map((row) => row.payment_id)).toEqual(['pay_001'])
    expect(page2.rows[0]).toMatchObject({ tenant: 'Jordan Reed', unit: '3B' })
  })

  it('exports correctly escaped csv from seeded operations rows', async () => {
    const { toCsv } = await import('@/lib/operations/data')

    const csv = toCsv([
      {
        request_id: 'mnt_10',
        title: 'Kitchen "sink" leak',
        priority: 'urgent',
        status: 'pending',
        unit: '2A',
        updated_at: '2026-03-04T00:00:00.000Z',
      },
    ])

    expect(csv).toContain('request_id,title,priority,status,unit,updated_at')
    expect(csv).toContain('"Kitchen ""sink"" leak"')
  })
})
