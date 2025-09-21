import type { ThreadWithRelations, TenantAssignmentRow, TenantRole } from "@/types/messages"

export const MODERATOR_ROLES: readonly TenantRole[] = [
  "property_manager",
  "admin",
]

export function normalizeAssignments(assignments: TenantAssignmentRow[]): TenantAssignmentRow[] {
  return assignments.reduce<TenantAssignmentRow[]>((acc, assignment) => {
    const hasDuplicate = acc.some(
      (existing) =>
        existing.building_id === assignment.building_id &&
        existing.unit_id === assignment.unit_id &&
        existing.role === assignment.role,
    )

    if (!hasDuplicate) {
      acc.push(assignment)
    }

    return acc
  }, [])
}

export function assignmentCoversThread(
  assignment: TenantAssignmentRow,
  thread: ThreadWithRelations,
): boolean {
  if (assignment.building_id !== thread.building_id) {
    return false
  }

  if (assignment.role === "property_manager" || assignment.role === "admin") {
    return true
  }

  if (!thread.unit_id) {
    return true
  }

  return assignment.unit_id === thread.unit_id
}

export function filterThreadsByAssignments(
  threads: ThreadWithRelations[],
  assignments: TenantAssignmentRow[],
): ThreadWithRelations[] {
  if (!assignments.length) {
    return []
  }

  const normalized = normalizeAssignments(assignments)

  return threads.filter((thread) =>
    normalized.some((assignment) => assignmentCoversThread(assignment, thread)),
  )
}

export function canModerateThread(
  thread: ThreadWithRelations,
  assignments: TenantAssignmentRow[],
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.building_id === thread.building_id &&
      MODERATOR_ROLES.includes(assignment.role),
  )
}

export function canCreateThread(
  assignment: TenantAssignmentRow,
  targetBuildingId: string,
  targetUnitId: string | null,
): boolean {
  if (assignment.building_id !== targetBuildingId) {
    return false
  }

  if (MODERATOR_ROLES.includes(assignment.role)) {
    return true
  }

  if (!targetUnitId) {
    return false
  }

  return assignment.unit_id === targetUnitId
}

export function resolveBestAssignment(
  assignments: TenantAssignmentRow[],
  buildingId: string,
  unitId: string | null,
): TenantAssignmentRow | undefined {
  return assignments.find((assignment) => {
    if (assignment.building_id !== buildingId) {
      return false
    }

    if (MODERATOR_ROLES.includes(assignment.role)) {
      return true
    }

    if (!unitId) {
      return true
    }

    return assignment.unit_id === unitId
  })
}

export function sortThreadsForDisplay(
  threads: ThreadWithRelations[],
): ThreadWithRelations[] {
  return [...threads].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

export function isPoll(messageType: string, metadata: unknown): boolean {
  if (messageType !== "poll") {
    return false
  }

  if (!metadata || typeof metadata !== "object") {
    return false
  }

  return Array.isArray((metadata as Record<string, unknown>).poll?.options)
}
