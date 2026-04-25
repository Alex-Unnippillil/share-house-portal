import type { AppRole } from "@/lib/roles"

export type FloorplanMarkerType = "room" | "storage" | "chore"

export type FloorplanVisibilityScope =
  | "all_roommates"
  | "selected_roommates"
  | "private"

export type FloorplanRole = AppRole

export type FloorplanAnnotation = {
  id: string
  markerType: FloorplanMarkerType
  label: string
  note: string | null
  x: number
  y: number
  createdBy: string
  visibleToUserIds: string[]
  visibilityScope: FloorplanVisibilityScope
  version: number
  updatedAt: string
}

const roleMarkerPermissions: Record<FloorplanRole, FloorplanMarkerType[]> = {
  tenant: ["storage", "chore"],
  roommate: ["storage", "chore"],
  property_manager: ["room", "storage", "chore"],
  admin: ["room", "storage", "chore"],
}

export function getAllowedMarkerTypes(role: FloorplanRole): FloorplanMarkerType[] {
  return roleMarkerPermissions[role]
}

export function canManageAnyAnnotation(role: FloorplanRole): boolean {
  return role === "property_manager" || role === "admin"
}

export function canEditAnnotation(
  annotation: FloorplanAnnotation,
  role: FloorplanRole,
  userId: string,
): boolean {
  if (canManageAnyAnnotation(role)) {
    return true
  }

  return annotation.createdBy === userId
}

export function filterVisibleAnnotations(
  annotations: FloorplanAnnotation[],
  userId: string,
): FloorplanAnnotation[] {
  return annotations.filter((annotation) => {
    if (annotation.visibilityScope === "all_roommates") {
      return true
    }

    if (annotation.visibilityScope === "private") {
      return annotation.createdBy === userId
    }

    return annotation.visibleToUserIds.includes(userId)
  })
}
