import { ApplicationError } from '@/lib/errors'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { normalizePagination, normalizeSearchTerm } from './utils'
import type {
  BuildingCreateInput,
  BuildingListParams,
  BuildingUpdateInput,
  DirectoryBuilding,
  DirectoryRepository,
  DirectoryResident,
  DirectoryStaff,
  DirectoryUnit,
  PaginatedResult,
  ResidentCreateInput,
  ResidentListParams,
  ResidentUpdateInput,
  StaffCreateInput,
  StaffListParams,
  StaffUpdateInput,
  UnitCreateInput,
  UnitListParams,
  UnitUpdateInput,
} from './types'

export class SupabaseDirectoryRepository implements DirectoryRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async listBuildings(
    tenantId: string,
    params: BuildingListParams = {}
  ): Promise<PaginatedResult<DirectoryBuilding>> {
    const { page, pageSize } = normalizePagination(params)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = this.client
      .from('directory_buildings')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
      .range(from, to)

    const search = normalizeSearchTerm(params.search)

    if (search) {
      query = query.or(
        ['name', 'city', 'state', 'postal_code', 'country', 'address_line1']
          .map(column => `${column}.ilike.${search}`)
          .join(',')
      )
    }

    if (params.city?.length) {
      query = query.in('city', params.city)
    }

    if (params.status?.length) {
      query = query.in('status', params.status)
    }

    const { data, error, count } = await query

    if (error) {
      throw new ApplicationError('Failed to list buildings', { error })
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getBuilding(tenantId: string, id: string) {
    const { data, error } = await this.client
      .from('directory_buildings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to fetch building', { error, id })
    }

    return data as DirectoryBuilding | null
  }

  async createBuilding(payload: BuildingCreateInput) {
    const { data, error } = await this.client
      .from('directory_buildings')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new ApplicationError('Failed to create building', { error })
    }

    return data as DirectoryBuilding
  }

  async updateBuilding(tenantId: string, id: string, updates: BuildingUpdateInput) {
    const { data, error } = await this.client
      .from('directory_buildings')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to update building', { error, id })
    }

    if (!data) {
      throw new ApplicationError('Building not found', { id })
    }

    return data as DirectoryBuilding
  }

  async deleteBuilding(tenantId: string, id: string) {
    const { error } = await this.client
      .from('directory_buildings')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) {
      throw new ApplicationError('Failed to delete building', { error, id })
    }
  }

  async findBuildingByName(tenantId: string, name: string) {
    const { data, error } = await this.client
      .from('directory_buildings')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('name', name)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to check building duplicate', { error })
    }

    return data as DirectoryBuilding | null
  }

  async listUnits(tenantId: string, params: UnitListParams = {}) {
    const { page, pageSize } = normalizePagination(params)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = this.client
      .from('directory_units')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('unit_number', { ascending: true })
      .range(from, to)

    const search = normalizeSearchTerm(params.search)

    if (search) {
      query = query.or(
        ['unit_number', 'floor', 'status']
          .map(column => `${column}.ilike.${search}`)
          .join(',')
      )
    }

    if (params.buildingIds?.length) {
      query = query.in('building_id', params.buildingIds)
    }

    if (params.status?.length) {
      query = query.in('status', params.status)
    }

    const { data, error, count } = await query

    if (error) {
      throw new ApplicationError('Failed to list units', { error })
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getUnit(tenantId: string, id: string) {
    const { data, error } = await this.client
      .from('directory_units')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to fetch unit', { error, id })
    }

    return data as DirectoryUnit | null
  }

  async createUnit(payload: UnitCreateInput) {
    const { data, error } = await this.client
      .from('directory_units')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new ApplicationError('Failed to create unit', { error })
    }

    return data as DirectoryUnit
  }

  async updateUnit(tenantId: string, id: string, updates: UnitUpdateInput) {
    const { data, error } = await this.client
      .from('directory_units')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to update unit', { error, id })
    }

    if (!data) {
      throw new ApplicationError('Unit not found', { id })
    }

    return data as DirectoryUnit
  }

  async deleteUnit(tenantId: string, id: string) {
    const { error } = await this.client
      .from('directory_units')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) {
      throw new ApplicationError('Failed to delete unit', { error, id })
    }
  }

  async findUnitByNumber(tenantId: string, buildingId: string, unitNumber: string) {
    const { data, error } = await this.client
      .from('directory_units')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('building_id', buildingId)
      .ilike('unit_number', unitNumber)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to check unit duplicate', { error })
    }

    return data as DirectoryUnit | null
  }

  async listResidents(tenantId: string, params: ResidentListParams = {}) {
    const { page, pageSize } = normalizePagination(params)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = this.client
      .from('directory_residents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('last_name', { ascending: true })
      .range(from, to)

    const search = normalizeSearchTerm(params.search)

    if (search) {
      query = query.or(
        ['first_name', 'last_name', 'email', 'phone']
          .map(column => `${column}.ilike.${search}`)
          .join(',')
      )
    }

    if (params.unitIds?.length) {
      query = query.in('unit_id', params.unitIds)
    }

    if (params.buildingIds?.length) {
      query = query.in('building_id', params.buildingIds)
    }

    if (params.status?.length) {
      query = query.in('status', params.status)
    }

    const { data, error, count } = await query

    if (error) {
      throw new ApplicationError('Failed to list residents', { error })
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getResident(tenantId: string, id: string) {
    const { data, error } = await this.client
      .from('directory_residents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to fetch resident', { error, id })
    }

    return data as DirectoryResident | null
  }

  async createResident(payload: ResidentCreateInput) {
    const { data, error } = await this.client
      .from('directory_residents')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new ApplicationError('Failed to create resident', { error })
    }

    return data as DirectoryResident
  }

  async updateResident(tenantId: string, id: string, updates: ResidentUpdateInput) {
    const { data, error } = await this.client
      .from('directory_residents')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to update resident', { error, id })
    }

    if (!data) {
      throw new ApplicationError('Resident not found', { id })
    }

    return data as DirectoryResident
  }

  async deleteResident(tenantId: string, id: string) {
    const { error } = await this.client
      .from('directory_residents')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) {
      throw new ApplicationError('Failed to delete resident', { error, id })
    }
  }

  async findResidentByEmail(tenantId: string, email: string) {
    const { data, error } = await this.client
      .from('directory_residents')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to check resident duplicate', { error })
    }

    return data as DirectoryResident | null
  }

  async listStaff(tenantId: string, params: StaffListParams = {}) {
    const { page, pageSize } = normalizePagination(params)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = this.client
      .from('directory_staff')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('last_name', { ascending: true })
      .range(from, to)

    const search = normalizeSearchTerm(params.search)

    if (search) {
      query = query.or(
        ['first_name', 'last_name', 'email', 'phone', 'role']
          .map(column => `${column}.ilike.${search}`)
          .join(',')
      )
    }

    if (params.buildingIds?.length) {
      query = query.in('building_id', params.buildingIds)
    }

    if (params.roles?.length) {
      query = query.in('role', params.roles)
    }

    if (params.status?.length) {
      query = query.in('status', params.status)
    }

    const { data, error, count } = await query

    if (error) {
      throw new ApplicationError('Failed to list staff', { error })
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getStaff(tenantId: string, id: string) {
    const { data, error } = await this.client
      .from('directory_staff')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to fetch staff member', { error, id })
    }

    return data as DirectoryStaff | null
  }

  async createStaff(payload: StaffCreateInput) {
    const { data, error } = await this.client
      .from('directory_staff')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw new ApplicationError('Failed to create staff member', { error })
    }

    return data as DirectoryStaff
  }

  async updateStaff(tenantId: string, id: string, updates: StaffUpdateInput) {
    const { data, error } = await this.client
      .from('directory_staff')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to update staff member', { error, id })
    }

    if (!data) {
      throw new ApplicationError('Staff member not found', { id })
    }

    return data as DirectoryStaff
  }

  async deleteStaff(tenantId: string, id: string) {
    const { error } = await this.client
      .from('directory_staff')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) {
      throw new ApplicationError('Failed to delete staff member', { error, id })
    }
  }

  async findStaffByEmail(tenantId: string, email: string) {
    const { data, error } = await this.client
      .from('directory_staff')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      throw new ApplicationError('Failed to check staff duplicate', { error })
    }

    return data as DirectoryStaff | null
  }
}
