import type { Database } from '@/lib/supabase'
import { fetchMemberProfile, fetchMembersByUnit, type MemberProfile, type MemberRole } from '@/lib/data/members'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

function handlePostgrestError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

function coalesceString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  return null
}

export type PropertySummary = {
  id: string
  name: string
  slug: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  propertyManagerId: string | null
  propertyManagerName: string | null
  propertyManagerEmail: string | null
  metadata: Database['public']['Tables']['properties']['Row']['metadata']
}

export type UnitSummary = {
  id: string
  propertyId: string
  unitNumber: string
  floor: number | null
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  rentAmount: number | null
  rentFrequency: Database['public']['Tables']['units']['Row']['rent_frequency']
  metadata: Database['public']['Tables']['units']['Row']['metadata']
}

export type MemberHousingContext = {
  profile: MemberProfile | null
  role: MemberRole | null
  unit: UnitSummary | null
  property: PropertySummary | null
  roommates: MemberProfile[]
  propertyManager: MemberProfile | null
}

type PortfolioUnit = {
  summary: UnitSummary
  members: MemberProfile[]
}

type PortfolioProperty = {
  summary: PropertySummary
  units: PortfolioUnit[]
  metrics: {
    totalUnits: number
    occupiedUnits: number
    totalResidents: number
  }
}

export type ManagerPortfolio = {
  properties: PortfolioProperty[]
  totals: {
    propertyCount: number
    unitCount: number
    occupiedUnits: number
    totalResidents: number
  }
}

function mapPropertyRow(row: any): PropertySummary {
  return {
    id: row.id,
    name: row.name,
    slug: coalesceString(row.slug),
    addressLine1: coalesceString(row.address_line1),
    addressLine2: coalesceString(row.address_line2),
    city: coalesceString(row.city),
    state: coalesceString(row.state),
    postalCode: coalesceString(row.postal_code),
    country: coalesceString(row.country),
    propertyManagerId: row.property_manager_id ?? null,
    propertyManagerName: coalesceString(row.property_manager?.full_name ?? row.property_manager?.email),
    propertyManagerEmail: coalesceString(row.property_manager?.email),
    metadata: row.metadata ?? null,
  }
}

function mapUnitRow(row: any): UnitSummary {
  return {
    id: row.id,
    propertyId: row.property_id,
    unitNumber: row.unit_number,
    floor: row.floor ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    squareFeet: row.square_feet ?? null,
    rentAmount: row.rent_amount ?? null,
    rentFrequency: row.rent_frequency,
    metadata: row.metadata ?? null,
  }
}

export async function fetchMemberHousingContext(
  client: TypedSupabaseClient,
  userId: string
): Promise<MemberHousingContext> {
  const profile = await fetchMemberProfile(client, userId)
  const role = profile?.role ?? null

  if (!profile?.unit_id) {
    return {
      profile,
      role,
      unit: null,
      property: null,
      roommates: [],
      propertyManager: null,
    }
  }

  const { data: unitRow, error: unitError } = await client
    .from('units')
    .select(
      `
        id,
        property_id,
        unit_number,
        floor,
        bedrooms,
        bathrooms,
        square_feet,
        rent_amount,
        rent_frequency,
        metadata,
        property:properties (
          id,
          name,
          slug,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          property_manager_id,
          metadata,
          property_manager:profiles!properties_property_manager_id_fkey (
            id,
            email,
            full_name,
            role,
            unit_id,
            rent_share
          )
        )
      `
    )
    .eq('id', profile.unit_id)
    .maybeSingle()

  handlePostgrestError(unitError, 'Failed to load unit details')

  const roommates = await fetchMembersByUnit(client, profile.unit_id)

  let propertyManager: MemberProfile | null = null
  const property = unitRow?.property ? mapPropertyRow(unitRow.property) : null

  if (property?.propertyManagerId) {
    const { data: managerRow, error: managerError } = await client
      .from('profiles')
      .select('id, email, full_name, role, unit_id, rent_share')
      .eq('id', property.propertyManagerId)
      .maybeSingle()

    handlePostgrestError(managerError, 'Failed to load property manager')
    propertyManager = (managerRow as MemberProfile | null) ?? null
  } else {
    propertyManager = roommates.find((member) => member.role === 'property_manager') ?? null
  }

  return {
    profile,
    role,
    unit: unitRow ? mapUnitRow(unitRow) : null,
    property,
    roommates,
    propertyManager,
  }
}

export async function fetchManagerPortfolio(
  client: TypedSupabaseClient,
  userId: string
): Promise<ManagerPortfolio> {
  const profile = await fetchMemberProfile(client, userId)
  const isAdmin = profile?.role === 'admin'

  let query = client
    .from('properties')
    .select(
      `
        id,
        name,
        slug,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        property_manager_id,
        metadata,
        property_manager:profiles!properties_property_manager_id_fkey (
          id,
          full_name,
          email
        ),
        units:units (
          id,
          property_id,
          unit_number,
          floor,
          bedrooms,
          bathrooms,
          square_feet,
          rent_amount,
          rent_frequency,
          metadata,
          members:profiles!profiles_unit_id_fkey (
            id,
            email,
            full_name,
            role,
            unit_id,
            rent_share
          )
        )
      `
    )
    .order('name', { ascending: true })

  if (!isAdmin) {
    query = query.eq('property_manager_id', userId)
  }

  const { data, error } = await query
  handlePostgrestError(error, 'Failed to load property portfolio')

  const properties: PortfolioProperty[] = (data ?? []).map((propertyRow: any) => {
    const summary = mapPropertyRow(propertyRow)
    const units: PortfolioUnit[] = (propertyRow.units ?? []).map((unitRow: any) => ({
      summary: mapUnitRow(unitRow),
      members: (unitRow.members ?? []) as MemberProfile[],
    }))

    const occupiedUnits = units.filter((unit) => unit.members.length > 0).length
    const totalResidents = units.reduce((acc, unit) => acc + unit.members.length, 0)

    return {
      summary,
      units,
      metrics: {
        totalUnits: units.length,
        occupiedUnits,
        totalResidents,
      },
    }
  })

  const totals = properties.reduce(
    (acc, property) => {
      acc.propertyCount += 1
      acc.unitCount += property.metrics.totalUnits
      acc.occupiedUnits += property.metrics.occupiedUnits
      acc.totalResidents += property.metrics.totalResidents
      return acc
    },
    { propertyCount: 0, unitCount: 0, occupiedUnits: 0, totalResidents: 0 }
  )

  return {
    properties,
    totals,
  }
}
