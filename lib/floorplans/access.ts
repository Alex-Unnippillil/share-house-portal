import type { Database, Json } from "@/lib/supabase"

export type FloorplanRow = Database["public"]["Tables"]["floorplans"]["Row"]
export type FloorplanAnnotationRow = Database["public"]["Tables"]["floorplan_annotations"]["Row"]
export type UnitMembershipRow = Database["public"]["Tables"]["unit_memberships"]["Row"]

export type RoleString = string | null

export type RectGeometry = {
  type: "rect"
  x: number
  y: number
  width: number
  height: number
}

export type NormalizedGeometry =
  | RectGeometry
  | ({
      type: string
      [key: string]: number | string | boolean | null
    } & Record<string, number | string | boolean | null>)

export type MembershipSummary = {
  unitIds: string[]
  buildingIds: string[]
}

export type RoommateFilterValue = "all" | "unassigned" | string | null

export function collectMembershipSummary(
  memberships: Array<
    Pick<UnitMembershipRow, "unit_id"> & {
      unit?: { building_id: string | null } | null
    }
  >
): MembershipSummary {
  const unitIds = new Set<string>()
  const buildingIds = new Set<string>()

  for (const membership of memberships) {
    if (membership.unit_id) {
      unitIds.add(membership.unit_id)
    }

    const buildingId = membership.unit?.building_id
    if (buildingId) {
      buildingIds.add(buildingId)
    }
  }

  return {
    unitIds: Array.from(unitIds),
    buildingIds: Array.from(buildingIds),
  }
}

export function canManageBuilding(
  role: RoleString,
  buildingId: string,
  managedBuildingIds: readonly string[]
): boolean {
  if (role === "admin") {
    return true
  }

  if (role === "property_manager") {
    return managedBuildingIds.includes(buildingId)
  }

  return false
}

export function canManageFloorplan(
  role: RoleString,
  floorplan: Pick<FloorplanRow, "building_id">,
  managedBuildingIds: readonly string[]
): boolean {
  return canManageBuilding(role, floorplan.building_id, managedBuildingIds)
}

export function canViewFloorplan(
  role: RoleString,
  floorplan: Pick<FloorplanRow, "unit_id" | "building_id">,
  membershipSummary: MembershipSummary,
  managedBuildingIds: readonly string[]
): boolean {
  if (role === "admin") {
    return true
  }

  if (role === "property_manager") {
    return managedBuildingIds.includes(floorplan.building_id)
  }

  if (role === "tenant" || role === "roommate") {
    if (floorplan.unit_id) {
      return membershipSummary.unitIds.includes(floorplan.unit_id)
    }

    return membershipSummary.buildingIds.includes(floorplan.building_id)
  }

  return false
}

const CLAMP_MIN = 0
const CLAMP_MAX = 1

const clamp = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < CLAMP_MIN) {
    return CLAMP_MIN
  }

  if (value > CLAMP_MAX) {
    return CLAMP_MAX
  }

  return value
}

export function normalizeGeometry(input: Json | null): NormalizedGeometry | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const maybeGeometry = input as Record<string, unknown>
  const type = maybeGeometry.type

  if (typeof type !== "string") {
    return null
  }

  if (type === "rect") {
    const rawValues = [maybeGeometry.x, maybeGeometry.y, maybeGeometry.width, maybeGeometry.height].map((value) =>
      typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN,
    )

    if (rawValues.some((value) => !Number.isFinite(value))) {
      return null
    }

    const [x, y, width, height] = rawValues.map((value) => clamp(value))

    return {
      type: "rect",
      x,
      y,
      width,
      height,
    }
  }

  const sanitized: Record<string, number | string | boolean | null> = {}

  for (const [key, value] of Object.entries(maybeGeometry)) {
    if (key === "type") {
      continue
    }

    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      sanitized[key] = value
    } else if (value === null) {
      sanitized[key] = null
    }
  }

  sanitized.type = type

  return sanitized as NormalizedGeometry
}

export function filterAnnotationsByRoommate<T extends { profile_id: string | null }>(
  annotations: T[],
  roommate: RoommateFilterValue
): T[] {
  if (!roommate || roommate === "all") {
    return annotations
  }

  if (roommate === "unassigned") {
    return annotations.filter((annotation) => annotation.profile_id == null)
  }

  return annotations.filter((annotation) => annotation.profile_id === roommate)
}

export function filterAnnotationsByTypes<T extends { annotation_type: Database["public"]["Enums"]["floorplan_annotation_type"] }>(
  annotations: T[],
  visibleTypes: ReadonlySet<Database["public"]["Enums"]["floorplan_annotation_type"]>
): T[] {
  if (visibleTypes.size === 0) {
    return []
  }

  return annotations.filter((annotation) => visibleTypes.has(annotation.annotation_type))
}

type AnnotationWithType = {
  annotation_type: Database["public"]["Enums"]["floorplan_annotation_type"]
}

export function buildAnnotationTypeSet(
  annotations: AnnotationWithType[]
): Set<Database["public"]["Enums"]["floorplan_annotation_type"]> {
  return new Set(annotations.map((annotation) => annotation.annotation_type))
}
