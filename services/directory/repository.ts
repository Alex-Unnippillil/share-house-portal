import type {
  BuildingCreateInput,
  BuildingListParams,
  BuildingUpdateInput,
  DirectoryBuilding,
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

export interface DirectoryRepository {
  listBuildings(tenantId: string, params?: BuildingListParams): Promise<PaginatedResult<DirectoryBuilding>>
  getBuilding(tenantId: string, id: string): Promise<DirectoryBuilding | null>
  createBuilding(payload: BuildingCreateInput): Promise<DirectoryBuilding>
  updateBuilding(tenantId: string, id: string, updates: BuildingUpdateInput): Promise<DirectoryBuilding>
  deleteBuilding(tenantId: string, id: string): Promise<void>
  findBuildingByName(tenantId: string, name: string): Promise<DirectoryBuilding | null>

  listUnits(tenantId: string, params?: UnitListParams): Promise<PaginatedResult<DirectoryUnit>>
  getUnit(tenantId: string, id: string): Promise<DirectoryUnit | null>
  createUnit(payload: UnitCreateInput): Promise<DirectoryUnit>
  updateUnit(tenantId: string, id: string, updates: UnitUpdateInput): Promise<DirectoryUnit>
  deleteUnit(tenantId: string, id: string): Promise<void>
  findUnitByNumber(tenantId: string, buildingId: string, unitNumber: string): Promise<DirectoryUnit | null>

  listResidents(tenantId: string, params?: ResidentListParams): Promise<PaginatedResult<DirectoryResident>>
  getResident(tenantId: string, id: string): Promise<DirectoryResident | null>
  createResident(payload: ResidentCreateInput): Promise<DirectoryResident>
  updateResident(tenantId: string, id: string, updates: ResidentUpdateInput): Promise<DirectoryResident>
  deleteResident(tenantId: string, id: string): Promise<void>
  findResidentByEmail(tenantId: string, email: string): Promise<DirectoryResident | null>

  listStaff(tenantId: string, params?: StaffListParams): Promise<PaginatedResult<DirectoryStaff>>
  getStaff(tenantId: string, id: string): Promise<DirectoryStaff | null>
  createStaff(payload: StaffCreateInput): Promise<DirectoryStaff>
  updateStaff(tenantId: string, id: string, updates: StaffUpdateInput): Promise<DirectoryStaff>
  deleteStaff(tenantId: string, id: string): Promise<void>
  findStaffByEmail(tenantId: string, email: string): Promise<DirectoryStaff | null>
}
