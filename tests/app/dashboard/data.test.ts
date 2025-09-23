import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supaone', () => ({
  createSupbaseServerClientReadOnly: vi.fn(),
}))

vi.mock('@/lib/data/property-management', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/data/property-management')
  >('@/lib/data/property-management')
  return {
    ...actual,
    fetchMemberHousingContext: vi.fn(),
    fetchManagerPortfolio: vi.fn(),
  }
})

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: actual.cache ?? ((fn: any) => fn),
  }
})

type SupabaseStubOptions = {
  documents?: any[]
  maintenanceRows?: any[]
}

function createSupabaseStub({
  documents = [],
  maintenanceRows = [],
}: SupabaseStubOptions = {}) {
  const documentsBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: documents, error: null }),
  }

  const maintenanceBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockImplementation(() => maintenanceBuilder),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: maintenanceRows, error: null }),
  }

  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'documents') {
        return documentsBuilder
      }
      if (table === 'maintenance_requests') {
        return maintenanceBuilder
      }
      throw new Error(`Unexpected table access: ${table}`)
    }),
  }
}

const tenantContext = {
  profile: {
    id: 'user-1',
    email: 'tenant@example.com',
    full_name: 'Tenant One',
    role: 'tenant' as const,
    unit_id: 'unit-1',
    rent_share: 50,
  },
  role: 'tenant' as const,
  unit: {
    id: 'unit-1',
    propertyId: 'prop-1',
    unitNumber: '3A',
    floor: 3,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1200,
    rentAmount: 3200,
    rentFrequency: 'monthly' as const,
    metadata: null,
  },
  property: {
    id: 'prop-1',
    name: 'Maple Manor',
    slug: 'maple-manor',
    addressLine1: '123 Maple Street',
    addressLine2: null,
    city: 'Portland',
    state: 'OR',
    postalCode: '97201',
    country: 'USA',
    propertyManagerId: 'manager-1',
    propertyManagerName: 'Manager Name',
    propertyManagerEmail: 'manager@example.com',
    metadata: null,
  },
  roommates: [],
  propertyManager: {
    id: 'manager-1',
    email: 'manager@example.com',
    full_name: 'Manager Name',
    role: 'property_manager' as const,
    unit_id: null,
    rent_share: null,
  },
}

const managerContext = {
  profile: {
    id: 'manager-1',
    email: 'manager@example.com',
    full_name: 'Manager Name',
    role: 'property_manager' as const,
    unit_id: null,
    rent_share: null,
  },
  role: 'property_manager' as const,
  unit: null,
  property: null,
  roommates: [],
  propertyManager: null,
}

const managerPortfolio = {
  properties: [
    {
      summary: {
        id: 'prop-1',
        name: 'Maple Manor',
        slug: 'maple-manor',
        addressLine1: '123 Maple Street',
        addressLine2: null,
        city: 'Portland',
        state: 'OR',
        postalCode: '97201',
        country: 'USA',
        propertyManagerId: 'manager-1',
        propertyManagerName: 'Manager Name',
        propertyManagerEmail: 'manager@example.com',
        metadata: null,
      },
      units: [
        {
          summary: {
            id: 'unit-1',
            propertyId: 'prop-1',
            unitNumber: '1A',
            floor: 1,
            bedrooms: 3,
            bathrooms: 2,
            squareFeet: 900,
            rentAmount: 3000,
            rentFrequency: 'monthly' as const,
            metadata: null,
          },
          members: [
            {
              id: 'tenant-1',
              email: 'tenant@example.com',
              full_name: 'Tenant One',
              role: 'tenant' as const,
              unit_id: 'unit-1',
              rent_share: 50,
            },
          ],
        },
      ],
      metrics: {
        totalUnits: 1,
        occupiedUnits: 1,
        totalResidents: 1,
      },
    },
  ],
  totals: {
    propertyCount: 1,
    unitCount: 1,
    occupiedUnits: 1,
    totalResidents: 1,
  },
}

describe('dashboard data loaders', () => {
  it('loads recent documents with formatted labels', async () => {
    vi.resetModules()
    const supabase = createSupabaseStub({
      documents: [
        {
          id: 'doc-1',
          title: 'Lease 2025',
          document_type: 'lease',
          status: 'pending_signature',
          updated_at: '2025-02-01T00:00:00.000Z',
          requires_signature: true,
          unit: {
            unit_number: '3A',
            property: {
              name: 'Maple Manor',
            },
          },
        },
      ],
    })

    const supaModule = await import('@/utils/supaone')
    const mockedCreateClient = vi.mocked(
      supaModule.createSupbaseServerClientReadOnly
    )
    const propertyModule = await import('@/lib/data/property-management')
    const mockedFetchMemberHousingContext = vi.mocked(
      propertyModule.fetchMemberHousingContext
    )
    const mockedFetchManagerPortfolio = vi.mocked(
      propertyModule.fetchManagerPortfolio
    )

    mockedCreateClient.mockResolvedValue(supabase as any)
    mockedFetchMemberHousingContext.mockResolvedValue(tenantContext)
    mockedFetchManagerPortfolio.mockResolvedValue({
      properties: [],
      totals: { propertyCount: 0, unitCount: 0, occupiedUnits: 0, totalResidents: 0 },
    })

    const dataModule = await import('@/app/dashboard/(dashboard)/data')

    const documents = await dataModule.loadRecentDocumentsUncached()

    expect(documents).toHaveLength(1)
    expect(documents[0].category).toBe('Lease • Maple Manor • Unit 3A')
    expect(documents[0].status).toBe('action_required')
  })

  it('returns maintenance tickets scoped to the manager portfolio', async () => {
    vi.resetModules()
    const supabase = createSupabaseStub({
      maintenanceRows: [
        {
          id: 'maint-1',
          title: 'Fix sink',
          status: 'pending',
          priority: 'high',
          updated_at: '2025-02-01T00:00:00.000Z',
          created_at: '2025-01-28T00:00:00.000Z',
          unit_id: 'unit-1',
        },
      ],
    })

    const supaModule = await import('@/utils/supaone')
    const mockedCreateClient = vi.mocked(
      supaModule.createSupbaseServerClientReadOnly
    )
    const propertyModule = await import('@/lib/data/property-management')
    const mockedFetchMemberHousingContext = vi.mocked(
      propertyModule.fetchMemberHousingContext
    )
    const mockedFetchManagerPortfolio = vi.mocked(
      propertyModule.fetchManagerPortfolio
    )

    mockedCreateClient.mockResolvedValue(supabase as any)
    mockedFetchMemberHousingContext.mockResolvedValue(managerContext)
    mockedFetchManagerPortfolio.mockResolvedValue(managerPortfolio)

    const dataModule = await import('@/app/dashboard/(dashboard)/data')

    const tickets = await dataModule.loadMaintenanceTicketsUncached()

    expect(tickets).toHaveLength(1)
    expect(tickets[0].unitLabel).toContain('Maple Manor')
    expect(tickets[0].status).toBe('scheduled')
  })

  it('builds a resident unit overview with roommates and manager details', async () => {
    vi.resetModules()
    const supabase = createSupabaseStub()
    const supaModule = await import('@/utils/supaone')
    const mockedCreateClient = vi.mocked(
      supaModule.createSupbaseServerClientReadOnly
    )
    const propertyModule = await import('@/lib/data/property-management')
    const mockedFetchMemberHousingContext = vi.mocked(
      propertyModule.fetchMemberHousingContext
    )
    const mockedFetchManagerPortfolio = vi.mocked(
      propertyModule.fetchManagerPortfolio
    )

    mockedCreateClient.mockResolvedValue(supabase as any)
    mockedFetchMemberHousingContext.mockResolvedValue({
      ...tenantContext,
      roommates: [
        {
          id: 'user-2',
          email: 'roommate@example.com',
          full_name: 'Roommate Two',
          role: 'roommate',
          unit_id: 'unit-1',
          rent_share: 50,
        },
      ],
    })
    mockedFetchManagerPortfolio.mockResolvedValue({
      properties: [],
      totals: { propertyCount: 0, unitCount: 0, occupiedUnits: 0, totalResidents: 0 },
    })

    const dataModule = await import('@/app/dashboard/(dashboard)/data')

    const overview = await dataModule.loadUnitOverviewUncached()

    expect(overview.status).toBe('assigned')
    expect(overview.members).toHaveLength(2)
    expect(overview.highlight).toContain('Manager Name')
  })

  it('summarises manager portfolio metrics', async () => {
    vi.resetModules()
    const supabase = createSupabaseStub()
    const supaModule = await import('@/utils/supaone')
    const mockedCreateClient = vi.mocked(
      supaModule.createSupbaseServerClientReadOnly
    )
    const propertyModule = await import('@/lib/data/property-management')
    const mockedFetchMemberHousingContext = vi.mocked(
      propertyModule.fetchMemberHousingContext
    )
    const mockedFetchManagerPortfolio = vi.mocked(
      propertyModule.fetchManagerPortfolio
    )

    mockedCreateClient.mockResolvedValue(supabase as any)
    mockedFetchMemberHousingContext.mockResolvedValue(managerContext)
    mockedFetchManagerPortfolio.mockResolvedValue(managerPortfolio)

    const dataModule = await import('@/app/dashboard/(dashboard)/data')

    const overview = await dataModule.loadPortfolioOverviewUncached()

    expect(overview.propertyCount).toBe(1)
    expect(overview.occupancyRate).toBe(100)
    expect(overview.featuredProperty?.name).toBe('Maple Manor')
  })
})
