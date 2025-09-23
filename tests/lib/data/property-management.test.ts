import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchManagerPortfolio,
  fetchMemberHousingContext,
} from '@/lib/data/property-management'

vi.mock('@/lib/data/members', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/members')>(
    '@/lib/data/members'
  )
  return {
    ...actual,
    fetchMemberProfile: vi.fn(),
    fetchMembersByUnit: vi.fn(),
  }
})

const membersModule = await import('@/lib/data/members')
const mockedFetchMemberProfile = vi.mocked(membersModule.fetchMemberProfile)
const mockedFetchMembersByUnit = vi.mocked(membersModule.fetchMembersByUnit)

type MaybeSingleResult<T> = { data: T; error: { message: string } | null }

function createMaybeSingleBuilder<T>(result: MaybeSingleResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

type SelectResult<T> = { data: T; error: { message: string } | null }

function createSelectBuilder<T>(result: SelectResult<T>) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }

  builder.then = (resolve: (value: SelectResult<T>) => unknown) =>
    Promise.resolve(resolve(result))

  return builder
}

function createSupabaseStub(tableMap: Record<string, any[]>) {
  return {
    from: vi.fn((table: string) => {
      const builders = tableMap[table]
      if (!builders || builders.length === 0) {
        throw new Error(`Unexpected table access: ${table}`)
      }
      return builders.shift()
    }),
  }
}

describe('fetchMemberHousingContext', () => {
  beforeEach(() => {
    mockedFetchMemberProfile.mockReset()
    mockedFetchMembersByUnit.mockReset()
  })

  it('returns an empty context when the member has no unit assignment', async () => {
    mockedFetchMemberProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'User Example',
      role: 'tenant',
      unit_id: null,
      rent_share: null,
    })

    const supabase = createSupabaseStub({})

    const context = await fetchMemberHousingContext(supabase as any, 'user-1')

    expect(context.unit).toBeNull()
    expect(context.property).toBeNull()
    expect(context.roommates).toEqual([])
    expect(context.propertyManager).toBeNull()
    expect(mockedFetchMembersByUnit).not.toHaveBeenCalled()
  })

  it('maps unit, property, and manager details when available', async () => {
    mockedFetchMemberProfile.mockResolvedValue({
      id: 'user-1',
      email: 'tenant@example.com',
      full_name: 'Tenant One',
      role: 'tenant',
      unit_id: 'unit-1',
      rent_share: 40,
    })

    mockedFetchMembersByUnit.mockResolvedValue([
      {
        id: 'user-2',
        email: 'roommate@example.com',
        full_name: 'Roommate Two',
        role: 'roommate',
        unit_id: 'unit-1',
        rent_share: 60,
      },
    ])

    const unitRow = {
      id: 'unit-1',
      property_id: 'prop-1',
      unit_number: '3A',
      floor: 3,
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1200,
      rent_amount: 3200,
      rent_frequency: 'monthly',
      metadata: null,
      property: {
        id: 'prop-1',
        name: 'Maple Manor',
        slug: 'maple-manor',
        address_line1: '123 Maple Street',
        address_line2: null,
        city: 'Portland',
        state: 'OR',
        postal_code: '97201',
        country: 'USA',
        property_manager_id: 'manager-1',
        metadata: null,
        property_manager: {
          id: 'manager-1',
          email: 'manager@example.com',
          full_name: 'Manager Name',
          role: 'property_manager',
          unit_id: null,
          rent_share: null,
        },
      },
    }

    const propertyManagerRow = {
      id: 'manager-1',
      email: 'manager@example.com',
      full_name: 'Manager Name',
      role: 'property_manager',
      unit_id: null,
      rent_share: null,
    }

    const supabase = createSupabaseStub({
      units: [createMaybeSingleBuilder({ data: unitRow, error: null })],
      profiles: [
        createMaybeSingleBuilder({ data: propertyManagerRow, error: null }),
      ],
    })

    const context = await fetchMemberHousingContext(supabase as any, 'user-1')

    expect(context.unit?.id).toBe('unit-1')
    expect(context.property?.name).toBe('Maple Manor')
    expect(context.roommates).toHaveLength(1)
    expect(context.propertyManager?.email).toBe('manager@example.com')
    expect(mockedFetchMembersByUnit).toHaveBeenCalled()
    const [clientArg, unitArg] = mockedFetchMembersByUnit.mock.calls[0]
    expect(clientArg).toEqual(expect.anything())
    expect(unitArg).toBe('unit-1')
  })
})

describe('fetchManagerPortfolio', () => {
  beforeEach(() => {
    mockedFetchMemberProfile.mockReset()
  })

  it('filters properties by property manager for non-admin users', async () => {
    mockedFetchMemberProfile.mockResolvedValue({
      id: 'manager-1',
      email: 'manager@example.com',
      full_name: 'Manager Name',
      role: 'property_manager',
      unit_id: null,
      rent_share: null,
    })

    const propertyRow = {
      id: 'prop-1',
      name: 'Maple Manor',
      slug: 'maple-manor',
      address_line1: '123 Maple Street',
      address_line2: null,
      city: 'Portland',
      state: 'OR',
      postal_code: '97201',
      country: 'USA',
      property_manager_id: 'manager-1',
      metadata: null,
      property_manager: {
        id: 'manager-1',
        full_name: 'Manager Name',
        email: 'manager@example.com',
      },
      units: [
        {
          id: 'unit-1',
          property_id: 'prop-1',
          unit_number: '1A',
          floor: 1,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 900,
          rent_amount: 3000,
          rent_frequency: 'monthly',
          metadata: null,
          members: [
            {
              id: 'tenant-1',
              email: 'tenant@example.com',
              full_name: 'Tenant One',
              role: 'tenant',
              unit_id: 'unit-1',
              rent_share: 50,
            },
          ],
        },
        {
          id: 'unit-2',
          property_id: 'prop-1',
          unit_number: '1B',
          floor: 1,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 800,
          rent_amount: 2500,
          rent_frequency: 'monthly',
          metadata: null,
          members: [],
        },
      ],
    }

    const builder = createSelectBuilder({ data: [propertyRow], error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('properties')
        return builder
      }),
    }

    const portfolio = await fetchManagerPortfolio(supabase as any, 'manager-1')

    expect(builder.eq).toHaveBeenCalledWith('property_manager_id', 'manager-1')
    expect(portfolio.totals.propertyCount).toBe(1)
    expect(portfolio.totals.unitCount).toBe(2)
    expect(portfolio.totals.occupiedUnits).toBe(1)
    expect(portfolio.totals.totalResidents).toBe(1)
  })

  it('skips property filtering for admins', async () => {
    mockedFetchMemberProfile.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      unit_id: null,
      rent_share: null,
    })

    const builder = createSelectBuilder({ data: [], error: null })
    const supabase = {
      from: vi.fn(() => builder),
    }

    await fetchManagerPortfolio(supabase as any, 'admin-1')

    expect(builder.eq).not.toHaveBeenCalled()
  })
})
