import { NextRequest } from 'next/server'
import { parse } from 'csv-parse/sync'
import {
  AuthContext,
  DirectoryRole,
  SupabaseDirectoryRepository,
  createBuilding,
  createResident,
  createStaff,
  createUnit,
  BuildingCreateInput,
  ResidentCreateInput,
  StaffCreateInput,
  UnitCreateInput,
} from '@/services/directory'
import { createSupbaseServerClient } from '@/utils/supaone'
import { UserError } from '@/lib/errors'
import type { Json } from '@/lib/supabase'

type ImportEntity = 'buildings' | 'units' | 'residents' | 'staff'

interface ImportRequestBody {
  entity: ImportEntity
  csv: string
  tenantId?: string
  dryRun?: boolean
}

interface ImportIssue {
  row: number
  message: string
  identifier?: string
}

interface ImportSummary {
  total: number
  inserted: number
  planned: number
  duplicates: ImportIssue[]
  errors: ImportIssue[]
  dryRun: boolean
}

const SUPPORTED_ENTITIES: ImportEntity[] = ['buildings', 'units', 'residents', 'staff']

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ImportRequestBody

  if (!body.entity || !SUPPORTED_ENTITIES.includes(body.entity)) {
    return Response.json({ error: 'Unsupported entity type.' }, { status: 400 })
  }

  if (!body.csv || typeof body.csv !== 'string') {
    return Response.json({ error: 'A CSV payload is required.' }, { status: 400 })
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, public_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return Response.json({ error: 'Unable to resolve user profile.' }, { status: 500 })
  }

  if (!profile) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  const tenantId = profile.public_id ?? body.tenantId

  if (!tenantId) {
    return Response.json({ error: 'A tenant scope is required.' }, { status: 400 })
  }

  if (body.tenantId && body.tenantId !== tenantId) {
    return Response.json({ error: 'Tenant scope mismatch.' }, { status: 403 })
  }

  const context: AuthContext = {
    role: resolveRole(profile.role),
    tenantId,
    userId: user.id,
  }

  if (context.role !== 'admin' && context.role !== 'manager') {
    return Response.json(
      { error: 'Insufficient permissions to import directory data.' },
      { status: 403 }
    )
  }

  const repository = new SupabaseDirectoryRepository(supabase)

  let records: Record<string, string>[]

  try {
    records = parse(body.csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to parse CSV payload.', details: getErrorMessage(error) },
      { status: 400 }
    )
  }

  const dryRun = Boolean(body.dryRun)
  const duplicates: ImportIssue[] = []
  const errors: ImportIssue[] = []
  let planned = 0
  let inserted = 0

  for (const [index, row] of records.entries()) {
    const rowNumber = index + 2

    try {
      switch (body.entity) {
        case 'buildings': {
          const payload = mapBuildingRow(row)
          const duplicate = await repository.findBuildingByName(context.tenantId, payload.name)

          if (duplicate) {
            duplicates.push({
              row: rowNumber,
              message: 'Building already exists.',
              identifier: duplicate.id,
            })
            continue
          }

          planned += 1
          if (!dryRun) {
            await createBuilding(repository, context, payload)
            inserted += 1
          }
          break
        }
        case 'units': {
          const payload = mapUnitRow(row)
          const duplicate = await repository.findUnitByNumber(
            context.tenantId,
            payload.building_id,
            payload.unit_number
          )

          if (duplicate) {
            duplicates.push({
              row: rowNumber,
              message: 'Unit already exists for this building.',
              identifier: duplicate.id,
            })
            continue
          }

          planned += 1
          if (!dryRun) {
            await createUnit(repository, context, payload)
            inserted += 1
          }
          break
        }
        case 'residents': {
          const payload = mapResidentRow(row)
          const duplicate = await repository.findResidentByEmail(context.tenantId, payload.email)

          if (duplicate) {
            duplicates.push({
              row: rowNumber,
              message: 'Resident already exists for this tenant.',
              identifier: duplicate.id,
            })
            continue
          }

          planned += 1
          if (!dryRun) {
            await createResident(repository, context, payload)
            inserted += 1
          }
          break
        }
        case 'staff': {
          const payload = mapStaffRow(row)
          const duplicate = await repository.findStaffByEmail(context.tenantId, payload.email)

          if (duplicate) {
            duplicates.push({
              row: rowNumber,
              message: 'Staff member already exists for this tenant.',
              identifier: duplicate.id,
            })
            continue
          }

          planned += 1
          if (!dryRun) {
            await createStaff(repository, context, payload)
            inserted += 1
          }
          break
        }
      }
    } catch (error) {
      errors.push({ row: rowNumber, message: getErrorMessage(error) })
    }
  }

  const summary: ImportSummary = {
    total: records.length,
    inserted,
    planned,
    duplicates,
    errors,
    dryRun,
  }

  return Response.json(summary)
}

function resolveRole(role: string | null): DirectoryRole {
  if (!role) {
    return 'viewer'
  }

  if (role === 'admin' || role === 'manager' || role === 'staff' || role === 'viewer') {
    return role
  }

  return 'viewer'
}

function mapBuildingRow(row: Record<string, string>): Omit<BuildingCreateInput, 'tenant_id'> {
  return {
    name: required(row, 'name', 'Building name'),
    address_line1: optional(row, 'address_line1'),
    address_line2: optional(row, 'address_line2'),
    city: optional(row, 'city'),
    state: optional(row, 'state'),
    postal_code: optional(row, 'postal_code'),
    country: optional(row, 'country'),
    status: optional(row, 'status'),
    metadata: parseJson(row.metadata),
  }
}

function mapUnitRow(row: Record<string, string>): Omit<UnitCreateInput, 'tenant_id'> {
  const bedrooms = optionalNumber(row, 'bedrooms')
  const bathrooms = optionalNumber(row, 'bathrooms')
  const squareFeet = optionalNumber(row, 'square_feet')

  return {
    building_id: required(row, 'building_id', 'Building ID'),
    unit_number: required(row, 'unit_number', 'Unit number'),
    floor: optional(row, 'floor'),
    bedrooms,
    bathrooms,
    square_feet: squareFeet,
    status: optional(row, 'status'),
    metadata: parseJson(row.metadata),
  }
}

function mapResidentRow(row: Record<string, string>): Omit<ResidentCreateInput, 'tenant_id'> {
  return {
    building_id: optional(row, 'building_id'),
    unit_id: optional(row, 'unit_id'),
    first_name: required(row, 'first_name', 'First name'),
    last_name: required(row, 'last_name', 'Last name'),
    email: required(row, 'email', 'Email'),
    phone: optional(row, 'phone'),
    status: optional(row, 'status'),
    move_in_date: optionalDate(row, 'move_in_date'),
    move_out_date: optionalDate(row, 'move_out_date'),
    metadata: parseJson(row.metadata),
  }
}

function mapStaffRow(row: Record<string, string>): Omit<StaffCreateInput, 'tenant_id'> {
  return {
    building_id: optional(row, 'building_id'),
    first_name: required(row, 'first_name', 'First name'),
    last_name: required(row, 'last_name', 'Last name'),
    email: required(row, 'email', 'Email'),
    phone: optional(row, 'phone'),
    role: optional(row, 'role'),
    status: optional(row, 'status'),
    metadata: parseJson(row.metadata),
  }
}

function required(row: Record<string, string>, key: string, label: string) {
  const value = row[key]

  if (!value || !value.trim()) {
    throw new UserError(`${label} is required.`)
  }

  return value.trim()
}

function optional(row: Record<string, string>, key: string) {
  const value = row[key]
  return value && value.trim() ? value.trim() : null
}

function optionalNumber(row: Record<string, string>, key: string) {
  const value = optional(row, key)

  if (!value) {
    return null
  }

  const parsed = Number(value)

  if (Number.isNaN(parsed)) {
    throw new UserError(`Invalid numeric value provided for ${key}.`)
  }

  return parsed
}

function optionalDate(row: Record<string, string>, key: string) {
  const value = optional(row, key)

  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new UserError(`Invalid date value provided for ${key}.`)
  }

  return parsed.toISOString()
}

function parseJson(value: string | undefined): Json | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch (error) {
    throw new UserError('Invalid metadata JSON payload.')
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof UserError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error'
}
