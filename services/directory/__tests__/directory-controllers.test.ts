import { describe, expect, it, beforeEach } from 'vitest'
import {
  createBuilding,
  createResident,
  createStaff,
  createUnit,
  deleteBuilding,
  listResidents,
  listBuildings,
  listUnits,
  listStaff,
  updateBuilding,
  DirectoryRepository,
  DirectoryBuilding,
  DirectoryUnit,
  DirectoryResident,
  DirectoryStaff,
  AuthContext,
  BuildingCreateInput,
  UnitCreateInput,
  ResidentCreateInput,
  StaffCreateInput,
} from '../index'
import { UserError } from '@/lib/errors'

class InMemoryDirectoryRepository implements DirectoryRepository {
  private buildings: DirectoryBuilding[] = []
  private units: DirectoryUnit[] = []
  private residents: DirectoryResident[] = []
  private staff: DirectoryStaff[] = []

  private nextId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
  }

  async listBuildings(tenantId: string, params = {}) {
    const page = (params as any).page ?? 1
    const pageSize = (params as any).pageSize ?? 25
    const search = ((params as any).search as string | undefined)?.toLowerCase()
    const city = (params as any).city as string[] | undefined
    const status = (params as any).status as string[] | undefined

    let data = this.buildings.filter(item => item.tenant_id === tenantId)

    if (search) {
      data = data.filter(item =>
        [
          item.name,
          item.city,
          item.state,
          item.postal_code,
          item.country,
          item.address_line1,
        ]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(search))
      )
    }

    if (city?.length) {
      data = data.filter(item => (item.city ? city.includes(item.city) : false))
    }

    if (status?.length) {
      data = data.filter(item => (item.status ? status.includes(item.status) : false))
    }

    const total = data.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return { data: data.slice(start, end), total, page, pageSize }
  }

  async getBuilding(tenantId: string, id: string) {
    return this.buildings.find(item => item.tenant_id === tenantId && item.id === id) ?? null
  }

  async createBuilding(payload: BuildingCreateInput) {
    const now = new Date().toISOString()
    const building: DirectoryBuilding = {
      ...payload,
      id: this.nextId('building'),
      created_at: now,
      updated_at: now,
    }
    this.buildings.push(building)
    return building
  }

  async updateBuilding(tenantId: string, id: string, updates: Partial<DirectoryBuilding>) {
    const existing = await this.getBuilding(tenantId, id)

    if (!existing) {
      throw new Error('Not found')
    }

    Object.assign(existing, updates, { updated_at: new Date().toISOString() })
    return existing
  }

  async deleteBuilding(tenantId: string, id: string) {
    this.buildings = this.buildings.filter(item => !(item.tenant_id === tenantId && item.id === id))
  }

  async findBuildingByName(tenantId: string, name: string) {
    const lower = name.toLowerCase()
    return (
      this.buildings.find(
        item => item.tenant_id === tenantId && item.name.toLowerCase() === lower
      ) ?? null
    )
  }

  async listUnits(tenantId: string, params = {}) {
    const page = (params as any).page ?? 1
    const pageSize = (params as any).pageSize ?? 25
    const search = ((params as any).search as string | undefined)?.toLowerCase()
    const buildingIds = (params as any).buildingIds as string[] | undefined
    const status = (params as any).status as string[] | undefined

    let data = this.units.filter(item => item.tenant_id === tenantId)

    if (search) {
      data = data.filter(item =>
        [item.unit_number, item.floor, item.status]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(search))
      )
    }

    if (buildingIds?.length) {
      data = data.filter(item => buildingIds.includes(item.building_id))
    }

    if (status?.length) {
      data = data.filter(item => (item.status ? status.includes(item.status) : false))
    }

    const total = data.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return { data: data.slice(start, end), total, page, pageSize }
  }

  async getUnit(tenantId: string, id: string) {
    return this.units.find(item => item.tenant_id === tenantId && item.id === id) ?? null
  }

  async createUnit(payload: UnitCreateInput) {
    const now = new Date().toISOString()
    const unit: DirectoryUnit = {
      ...payload,
      id: this.nextId('unit'),
      created_at: now,
      updated_at: now,
    }
    this.units.push(unit)
    return unit
  }

  async updateUnit(tenantId: string, id: string, updates: Partial<DirectoryUnit>) {
    const existing = await this.getUnit(tenantId, id)

    if (!existing) {
      throw new Error('Not found')
    }

    Object.assign(existing, updates, { updated_at: new Date().toISOString() })
    return existing
  }

  async deleteUnit(tenantId: string, id: string) {
    this.units = this.units.filter(item => !(item.tenant_id === tenantId && item.id === id))
  }

  async findUnitByNumber(tenantId: string, buildingId: string, unitNumber: string) {
    const lower = unitNumber.toLowerCase()
    return (
      this.units.find(
        item =>
          item.tenant_id === tenantId &&
          item.building_id === buildingId &&
          item.unit_number.toLowerCase() === lower
      ) ?? null
    )
  }

  async listResidents(tenantId: string, params = {}) {
    const page = (params as any).page ?? 1
    const pageSize = (params as any).pageSize ?? 25
    const search = ((params as any).search as string | undefined)?.toLowerCase()
    const unitIds = (params as any).unitIds as string[] | undefined
    const buildingIds = (params as any).buildingIds as string[] | undefined
    const status = (params as any).status as string[] | undefined

    let data = this.residents.filter(item => item.tenant_id === tenantId)

    if (search) {
      data = data.filter(item =>
        [item.first_name, item.last_name, item.email, item.phone]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(search))
      )
    }

    if (unitIds?.length) {
      data = data.filter(item => (item.unit_id ? unitIds.includes(item.unit_id) : false))
    }

    if (buildingIds?.length) {
      data = data.filter(item => (item.building_id ? buildingIds.includes(item.building_id) : false))
    }

    if (status?.length) {
      data = data.filter(item => (item.status ? status.includes(item.status) : false))
    }

    const total = data.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return { data: data.slice(start, end), total, page, pageSize }
  }

  async getResident(tenantId: string, id: string) {
    return this.residents.find(item => item.tenant_id === tenantId && item.id === id) ?? null
  }

  async createResident(payload: ResidentCreateInput) {
    const now = new Date().toISOString()
    const resident: DirectoryResident = {
      ...payload,
      id: this.nextId('resident'),
      created_at: now,
      updated_at: now,
    }
    this.residents.push(resident)
    return resident
  }

  async updateResident(tenantId: string, id: string, updates: Partial<DirectoryResident>) {
    const existing = await this.getResident(tenantId, id)

    if (!existing) {
      throw new Error('Not found')
    }

    Object.assign(existing, updates, { updated_at: new Date().toISOString() })
    return existing
  }

  async deleteResident(tenantId: string, id: string) {
    this.residents = this.residents.filter(item => !(item.tenant_id === tenantId && item.id === id))
  }

  async findResidentByEmail(tenantId: string, email: string) {
    const lower = email.toLowerCase()
    return (
      this.residents.find(
        item => item.tenant_id === tenantId && item.email.toLowerCase() === lower
      ) ?? null
    )
  }

  async listStaff(tenantId: string, params = {}) {
    const page = (params as any).page ?? 1
    const pageSize = (params as any).pageSize ?? 25
    const search = ((params as any).search as string | undefined)?.toLowerCase()
    const buildingIds = (params as any).buildingIds as string[] | undefined
    const status = (params as any).status as string[] | undefined
    const roles = (params as any).roles as string[] | undefined

    let data = this.staff.filter(item => item.tenant_id === tenantId)

    if (search) {
      data = data.filter(item =>
        [item.first_name, item.last_name, item.email, item.phone, item.role]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(search))
      )
    }

    if (buildingIds?.length) {
      data = data.filter(item => (item.building_id ? buildingIds.includes(item.building_id) : false))
    }

    if (status?.length) {
      data = data.filter(item => (item.status ? status.includes(item.status) : false))
    }

    if (roles?.length) {
      data = data.filter(item => (item.role ? roles.includes(item.role) : false))
    }

    const total = data.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return { data: data.slice(start, end), total, page, pageSize }
  }

  async getStaff(tenantId: string, id: string) {
    return this.staff.find(item => item.tenant_id === tenantId && item.id === id) ?? null
  }

  async createStaff(payload: StaffCreateInput) {
    const now = new Date().toISOString()
    const staff: DirectoryStaff = {
      ...payload,
      id: this.nextId('staff'),
      created_at: now,
      updated_at: now,
    }
    this.staff.push(staff)
    return staff
  }

  async updateStaff(tenantId: string, id: string, updates: Partial<DirectoryStaff>) {
    const existing = await this.getStaff(tenantId, id)

    if (!existing) {
      throw new Error('Not found')
    }

    Object.assign(existing, updates, { updated_at: new Date().toISOString() })
    return existing
  }

  async deleteStaff(tenantId: string, id: string) {
    this.staff = this.staff.filter(item => !(item.tenant_id === tenantId && item.id === id))
  }

  async findStaffByEmail(tenantId: string, email: string) {
    const lower = email.toLowerCase()
    return (
      this.staff.find(item => item.tenant_id === tenantId && item.email.toLowerCase() === lower) ?? null
    )
  }
}

const ADMIN_CONTEXT: AuthContext = {
  role: 'admin',
  tenantId: 'tenant-1',
  userId: 'user-1',
}

const STAFF_CONTEXT: AuthContext = {
  role: 'staff',
  tenantId: 'tenant-1',
  userId: 'user-2',
}

const OTHER_TENANT_CONTEXT: AuthContext = {
  role: 'admin',
  tenantId: 'tenant-2',
  userId: 'user-3',
}

const baseBuilding: Omit<BuildingCreateInput, 'tenant_id'> = {
  name: 'North Tower',
  address_line1: '123 Main St',
  address_line2: null,
  city: 'Metropolis',
  state: 'CA',
  postal_code: '90001',
  country: 'USA',
  status: 'active',
  metadata: null,
}

const baseUnit: Omit<UnitCreateInput, 'tenant_id'> = {
  building_id: 'building-1',
  unit_number: '101A',
  floor: '10',
  bedrooms: 2,
  bathrooms: 2,
  square_feet: 1000,
  status: 'occupied',
  metadata: null,
}

const baseResident: Omit<ResidentCreateInput, 'tenant_id'> = {
  building_id: 'building-1',
  unit_id: 'unit-1',
  first_name: 'Alice',
  last_name: 'Liddell',
  email: 'alice@example.com',
  phone: '555-0000',
  status: 'active',
  move_in_date: null,
  move_out_date: null,
  metadata: null,
}

const baseStaff: Omit<StaffCreateInput, 'tenant_id'> = {
  building_id: 'building-1',
  first_name: 'Bob',
  last_name: 'Builder',
  email: 'bob@example.com',
  phone: '555-2222',
  role: 'maintenance',
  status: 'active',
  metadata: null,
}

describe('Directory controllers', () => {
  let repository: InMemoryDirectoryRepository

  beforeEach(() => {
    repository = new InMemoryDirectoryRepository()
  })

  it('prevents non-admin users from mutating data', async () => {
    await expect(createBuilding(repository, STAFF_CONTEXT, baseBuilding)).rejects.toBeInstanceOf(UserError)
  })

  it('scopes created entities to the tenant', async () => {
    const building = await createBuilding(repository, ADMIN_CONTEXT, baseBuilding)
    expect(building.tenant_id).toEqual(ADMIN_CONTEXT.tenantId)
  })

  it('filters residents by tenant and search query', async () => {
    await createResident(repository, ADMIN_CONTEXT, baseResident)
    await createResident(repository, {
      ...ADMIN_CONTEXT,
      tenantId: 'tenant-1',
    }, {
      ...baseResident,
      email: 'beth@example.com',
      first_name: 'Beth',
    })

    await createResident(repository, OTHER_TENANT_CONTEXT, {
      ...baseResident,
      email: 'chris@example.com',
      first_name: 'Chris',
    })

    const result = await listResidents(repository, ADMIN_CONTEXT, { search: 'beth' })

    expect(result.total).toBe(1)
    expect(result.data[0].email).toBe('beth@example.com')
  })

  it('enforces tenant scoping when listing buildings', async () => {
    await createBuilding(repository, ADMIN_CONTEXT, baseBuilding)
    await createBuilding(repository, OTHER_TENANT_CONTEXT, {
      ...baseBuilding,
      name: 'South Tower',
    })

    const result = await listBuildings(repository, ADMIN_CONTEXT, {})
    expect(result.total).toBe(1)
    expect(result.data[0].name).toBe('North Tower')
  })

  it('applies building filters when listing units', async () => {
    const buildingA = await createBuilding(repository, ADMIN_CONTEXT, baseBuilding)
    const buildingB = await createBuilding(repository, ADMIN_CONTEXT, {
      ...baseBuilding,
      name: 'East Wing',
      city: 'Gotham',
    })

    await createUnit(repository, ADMIN_CONTEXT, {
      ...baseUnit,
      building_id: buildingA.id,
      unit_number: '101',
    })
    await createUnit(repository, ADMIN_CONTEXT, {
      ...baseUnit,
      building_id: buildingB.id,
      unit_number: '202',
    })

    const result = await listUnits(repository, ADMIN_CONTEXT, {
      buildingIds: [buildingB.id],
    })

    expect(result.total).toBe(1)
    expect(result.data[0].unit_number).toBe('202')
  })

  it('supports status filters when listing staff', async () => {
    await createStaff(repository, ADMIN_CONTEXT, baseStaff)
    await createStaff(repository, ADMIN_CONTEXT, {
      ...baseStaff,
      email: 'carol@example.com',
      first_name: 'Carol',
      status: 'inactive',
    })

    const result = await listStaff(repository, ADMIN_CONTEXT, { status: ['inactive'] })
    expect(result.total).toBe(1)
    expect(result.data[0].email).toBe('carol@example.com')
  })

  it('allows administrators to update buildings', async () => {
    const building = await createBuilding(repository, ADMIN_CONTEXT, baseBuilding)
    const updated = await updateBuilding(repository, ADMIN_CONTEXT, building.id, { city: 'Gotham' })
    expect(updated.city).toBe('Gotham')
  })

  it('allows administrators to delete buildings', async () => {
    const building = await createBuilding(repository, ADMIN_CONTEXT, baseBuilding)
    await deleteBuilding(repository, ADMIN_CONTEXT, building.id)
    const result = await listBuildings(repository, ADMIN_CONTEXT, {})
    expect(result.total).toBe(0)
  })
})
