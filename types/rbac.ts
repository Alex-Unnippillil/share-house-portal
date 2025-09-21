export type PortalRole =
  | "tenant"
  | "roommate"
  | "property_manager"
  | "admin"

export interface BuildingMembership {
  building_id: string
  building_slug: string
  building_name: string
  role: PortalRole
  created_at?: string
}
