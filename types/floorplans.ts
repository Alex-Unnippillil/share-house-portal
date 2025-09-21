import type { Database, Json } from "@/lib/supabase"

export type FloorplanRow = Database["public"]["Tables"]["floorplans"]["Row"]
export type FloorplanOverlayRow = Database["public"]["Tables"]["floorplan_overlays"]["Row"]
export type ResidentFloorplanRow = Database["public"]["Tables"]["resident_floorplans"]["Row"]
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export type FloorplanOverlayMetadata = {
  amenities?: string[]
  fillColor?: string
  notes?: string
  strokeColor?: string
  strokeWidth?: number
}

export type FloorplanOverlayGeometryRect = {
  type: "rect"
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export type FloorplanOverlayGeometryPolygon = {
  type: "polygon"
  points: Array<{ x: number; y: number }>
}

export type FloorplanOverlayGeometry =
  | FloorplanOverlayGeometryRect
  | FloorplanOverlayGeometryPolygon

export type FloorplanOverlayWithOccupant = FloorplanOverlayRow & {
  occupant?: Pick<ProfileRow, "id" | "full_name" | "email"> | null
}

export type FloorplanWithRelations = FloorplanRow & {
  overlays: FloorplanOverlayWithOccupant[] | null
}

export type ResidentFloorplanWithRelations = ResidentFloorplanRow & {
  floorplan: FloorplanWithRelations | null
}

export type FloorplanSummary = FloorplanRow & {
  overlays: Array<Pick<FloorplanOverlayRow, "id" | "name" | "overlay_type" | "display_order">> | null
  assignments: Array<
    Pick<ResidentFloorplanRow, "id" | "resident_id" | "effective_start" | "effective_end">
  > | null
}

export type ResidentSummary = Pick<ProfileRow, "id" | "full_name" | "email" | "role">

export type FloorplanAssignmentSummary = ResidentFloorplanRow & {
  resident?: Pick<ProfileRow, "id" | "full_name" | "email"> | null
  floorplan?: Pick<FloorplanRow, "id" | "name" | "unit_label"> | null
}

export const defaultOverlayColors: Record<string, string> = {
  amenity: "#16a34a",
  note: "#f97316",
  room: "#2563eb",
}

export const isRectGeometry = (
  geometry: Json | FloorplanOverlayGeometry | null
): geometry is FloorplanOverlayGeometryRect => {
  if (!geometry || typeof geometry !== "object") {
    return false
  }

  const candidate = geometry as Partial<FloorplanOverlayGeometryRect>

  return (
    candidate.type === "rect" &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  )
}

export const isPolygonGeometry = (
  geometry: Json | FloorplanOverlayGeometry | null
): geometry is FloorplanOverlayGeometryPolygon => {
  if (!geometry || typeof geometry !== "object") {
    return false
  }

  const candidate = geometry as Partial<FloorplanOverlayGeometryPolygon>

  return (
    candidate.type === "polygon" &&
    Array.isArray(candidate.points) &&
    candidate.points.every(
      (point) =>
        !!point &&
        typeof point === "object" &&
        typeof (point as { x?: number }).x === "number" &&
        typeof (point as { y?: number }).y === "number"
    )
  )
}

export const parseOverlayMetadata = (
  metadata: Json | null
): FloorplanOverlayMetadata => {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }

  const raw = metadata as Record<string, unknown>
  const amenities = Array.isArray(raw.amenities)
    ? raw.amenities.filter((entry): entry is string => typeof entry === "string")
    : undefined

  return {
    amenities,
    fillColor: typeof raw.fillColor === "string" ? raw.fillColor : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    strokeColor: typeof raw.strokeColor === "string" ? raw.strokeColor : undefined,
    strokeWidth: typeof raw.strokeWidth === "number" ? raw.strokeWidth : undefined,
  }
}
