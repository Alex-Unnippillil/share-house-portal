export type Role = string | null

export interface FloorplanAccessContext {
  userId: string
  role: Role
  managedBuildingIds: string[]
  unitIds: string[]
}

export interface FloorplanScope {
  buildingId: string
  unitId: string
}

const TENANT_ROLES = new Set(["tenant", "roommate"])

export const isAdminRole = (role: Role) => role === "admin"

export const isManagerRole = (role: Role) => role === "property_manager" || isAdminRole(role)

export const isTenantRole = (role: Role) => (role ? TENANT_ROLES.has(role) : false)

export function canViewFloorplan(context: FloorplanAccessContext, scope: FloorplanScope) {
  if (isAdminRole(context.role)) {
    return true
  }

  if (context.managedBuildingIds.includes(scope.buildingId) && isManagerRole(context.role)) {
    return true
  }

  if (isTenantRole(context.role) && context.unitIds.includes(scope.unitId)) {
    return true
  }

  return false
}

export function canManageFloorplan(context: FloorplanAccessContext, scope: FloorplanScope) {
  if (isAdminRole(context.role)) {
    return true
  }

  if (context.managedBuildingIds.includes(scope.buildingId) && context.role === "property_manager") {
    return true
  }

  return false
}

export const canManageAnnotation = canManageFloorplan

export function assertCanViewFloorplan(context: FloorplanAccessContext, scope: FloorplanScope) {
  if (!canViewFloorplan(context, scope)) {
    throw new Error("You do not have permission to view this floorplan")
  }
}

export function assertCanManageFloorplan(context: FloorplanAccessContext, scope: FloorplanScope) {
  if (!canManageFloorplan(context, scope)) {
    throw new Error("You do not have permission to manage this floorplan")
  }
}

export function mergeUniqueIds(existing: string[], additions: string[]) {
  const map = new Map(existing.map(id => [id, true] as const))
  for (const id of additions) {
    if (!map.has(id)) {
      map.set(id, true)
    }
  }
  return Array.from(map.keys())
}
