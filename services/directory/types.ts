import type { Json } from '@/lib/supabase'

export type DirectoryRole = 'admin' | 'manager' | 'staff' | 'viewer'

export interface AuthContext {
  userId: string
  tenantId: string
  role: DirectoryRole
}

export interface PaginationOptions {
  page?: number
  pageSize?: number
  search?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface BuildingListParams extends PaginationOptions {
  city?: string[]
  status?: string[]
}

export interface UnitListParams extends PaginationOptions {
  buildingIds?: string[]
  status?: string[]
}

export interface ResidentListParams extends PaginationOptions {
  buildingIds?: string[]
  unitIds?: string[]
  status?: string[]
}

export interface StaffListParams extends PaginationOptions {
  buildingIds?: string[]
  roles?: string[]
  status?: string[]
}

export interface DirectoryBuilding {
  id: string
  tenant_id: string
  name: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  status: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface DirectoryUnit {
  id: string
  tenant_id: string
  building_id: string
  unit_number: string
  floor: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
  status: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface DirectoryResident {
  id: string
  tenant_id: string
  building_id: string | null
  unit_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: string | null
  move_in_date: string | null
  move_out_date: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface DirectoryStaff {
  id: string
  tenant_id: string
  building_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string | null
  status: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export type BuildingCreateInput = Omit<DirectoryBuilding, 'id' | 'created_at' | 'updated_at'>
export type BuildingUpdateInput = Partial<Omit<DirectoryBuilding, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>

export type UnitCreateInput = Omit<DirectoryUnit, 'id' | 'created_at' | 'updated_at'>
export type UnitUpdateInput = Partial<Omit<DirectoryUnit, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>

export type ResidentCreateInput = Omit<DirectoryResident, 'id' | 'created_at' | 'updated_at'>
export type ResidentUpdateInput = Partial<Omit<DirectoryResident, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>

export type StaffCreateInput = Omit<DirectoryStaff, 'id' | 'created_at' | 'updated_at'>
export type StaffUpdateInput = Partial<Omit<DirectoryStaff, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
