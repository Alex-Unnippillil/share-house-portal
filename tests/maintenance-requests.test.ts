import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchMaintenanceRequests,
  publishMaintenanceRequest,
  type MaintenanceRequestWithVersions,
} from '@/lib/maintenance/requests'

type MaintenanceRequestRow = MaintenanceRequestWithVersions

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

type SupabaseFetchStub = {
  from: ReturnType<typeof vi.fn>
  builder: QueryBuilder
}

type PublishSupabaseStub = {
  supabase: { from: ReturnType<typeof vi.fn> }
  getCurrentRequest: () => MaintenanceRequestRow
  getInsertedVersions: () => any[]
}

function createFetchSupabaseStub(data: MaintenanceRequestRow[]): SupabaseFetchStub {
  const builder: Partial<QueryBuilder> = {}

  const promiseLike = {
    then(onFulfilled: (value: { data: MaintenanceRequestRow[]; error: null }) => unknown) {
      onFulfilled({ data, error: null })
      return Promise.resolve({ data, error: null })
    },
    catch() {
      return Promise.resolve({ data, error: null })
    },
    finally(onFinally?: () => unknown) {
      onFinally?.()
      return Promise.resolve()
    },
  }

  builder.select = vi.fn(() => builder as QueryBuilder)
  builder.or = vi.fn(() => builder as QueryBuilder)
  builder.eq = vi.fn(() => builder as QueryBuilder)
  builder.order = vi.fn(() => promiseLike)

  const from = vi.fn(() => builder)

  return { from, builder: builder as QueryBuilder }
}

function createPublishSupabaseStub(request: MaintenanceRequestRow): PublishSupabaseStub {
  let currentRequest: MaintenanceRequestRow = { ...request }
  const insertedVersions: any[] = []

  const maintenanceRequestsBuilder = {
    update: vi.fn((payload: Partial<MaintenanceRequestRow>) => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            currentRequest = { ...currentRequest, ...payload }
            return { data: currentRequest, error: null }
          }),
        })),
      })),
    })),
  }

  const versionsBuilder = {
    insert: vi.fn(async (payload: any) => {
      insertedVersions.push(payload)
      return { data: null, error: null }
    }),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'maintenance_requests') {
        return maintenanceRequestsBuilder
      }

      if (table === 'maintenance_request_versions') {
        return versionsBuilder
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return {
    supabase,
    getCurrentRequest: () => currentRequest,
    getInsertedVersions: () => insertedVersions,
  }
}

describe('maintenance request data helpers', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('only includes drafts for the author while sharing published requests within a unit', async () => {
    const sampleRequests: MaintenanceRequestRow[] = [
      {
        id: 'req-1',
        title: 'Leaky faucet',
        description: 'The kitchen faucet is leaking steadily.',
        priority: 'normal',
        status: 'pending',
        state: 'draft',
        category: null,
        location: 'Kitchen',
        requested_by: 'user-1',
        assigned_to: null,
        unit_id: 'unit-1',
        created_at: new Date('2024-03-01T10:00:00Z').toISOString(),
        updated_at: new Date('2024-03-01T10:00:00Z').toISOString(),
        completed_at: null,
        notes: null,
        attachments: [],
        metadata: {},
        version: 1,
        versions: [
          {
            id: 'ver-1',
            request_id: 'req-1',
            version: 1,
            state: 'draft',
            status: 'pending',
            snapshot: {},
            created_at: new Date('2024-03-01T10:00:00Z').toISOString(),
            created_by: 'user-1',
            published_at: null,
          },
          {
            id: 'ver-2',
            request_id: 'req-1',
            version: 3,
            state: 'published',
            status: 'pending',
            snapshot: {},
            created_at: new Date('2024-03-02T10:00:00Z').toISOString(),
            created_by: 'user-1',
            published_at: new Date('2024-03-02T12:00:00Z').toISOString(),
          },
          {
            id: 'ver-3',
            request_id: 'req-1',
            version: 2,
            state: 'draft',
            status: 'pending',
            snapshot: {},
            created_at: new Date('2024-03-01T18:00:00Z').toISOString(),
            created_by: 'user-1',
            published_at: null,
          },
        ],
      },
      {
        id: 'req-2',
        title: 'HVAC noise',
        description: 'Loud rattling noise when the heater starts.',
        priority: 'high',
        status: 'pending',
        state: 'published',
        category: 'HVAC',
        location: 'Hallway',
        requested_by: 'user-2',
        assigned_to: null,
        unit_id: 'unit-1',
        created_at: new Date('2024-02-15T09:00:00Z').toISOString(),
        updated_at: new Date('2024-02-15T09:15:00Z').toISOString(),
        completed_at: null,
        notes: null,
        attachments: [],
        metadata: {},
        version: 4,
        versions: [
          {
            id: 'ver-4',
            request_id: 'req-2',
            version: 4,
            state: 'published',
            status: 'pending',
            snapshot: {},
            created_at: new Date('2024-02-15T09:15:00Z').toISOString(),
            created_by: 'user-2',
            published_at: new Date('2024-02-15T09:16:00Z').toISOString(),
          },
        ],
      },
    ]

    const supabaseStub = createFetchSupabaseStub(sampleRequests)

    const results = await fetchMaintenanceRequests({
      client: supabaseStub as unknown as { from: SupabaseFetchStub['from'] },
      userId: 'user-1',
      unitId: 'unit-1',
    })

    expect(supabaseStub.builder.or).toHaveBeenCalledWith(
      'requested_by.eq.user-1,and(state.eq.published,unit_id.eq.unit-1)'
    )
    expect(results).toHaveLength(2)
    expect(results[0].versions.map((version) => version.version)).toEqual([3, 2, 1])
    expect(results[1].versions.map((version) => version.version)).toEqual([4])
  })

  it('increments version history when publishing a request', async () => {
    const request: MaintenanceRequestRow = {
      id: 'req-1',
      title: 'Fix broken window',
      description: 'Window latch snapped during storm.',
      priority: 'normal',
      status: 'pending',
      state: 'draft',
      category: null,
      location: 'Bedroom 2',
      requested_by: 'user-1',
      assigned_to: null,
      unit_id: 'unit-1',
      created_at: new Date('2024-01-10T11:00:00Z').toISOString(),
      updated_at: new Date('2024-01-10T11:00:00Z').toISOString(),
      completed_at: null,
      notes: null,
      attachments: [],
      metadata: {},
      version: 1,
      versions: [],
    }

    const { supabase, getCurrentRequest, getInsertedVersions } = createPublishSupabaseStub(request)

    const result = await publishMaintenanceRequest({
      client: supabase as unknown as { from: PublishSupabaseStub['supabase']['from'] },
      request,
      userId: 'user-1',
    })

    expect(result.state).toBe('published')
    expect(result.version).toBe(2)

    const insertedVersions = getInsertedVersions()
    expect(insertedVersions).toHaveLength(1)
    expect(insertedVersions[0]).toMatchObject({
      request_id: 'req-1',
      version: 2,
      state: 'published',
      created_by: 'user-1',
    })
    expect(insertedVersions[0].published_at).toBeTruthy()

    const updatedRequest = getCurrentRequest()
    expect(updatedRequest.state).toBe('published')
    expect(updatedRequest.version).toBe(2)
  })
})
