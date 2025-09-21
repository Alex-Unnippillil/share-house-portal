import type { ThreadWithRelations, ProfileSummary, TenantRole } from "@/types/messages"

const STAFF_ROLES: TenantRole[] = ["property_manager", "admin"]

export const isStaffRole = (role?: TenantRole | null): boolean =>
  !!role && STAFF_ROLES.includes(role)

export const canModerate = (role?: TenantRole | null): boolean => isStaffRole(role)

export const canAccessThread = (
  profile: ProfileSummary,
  thread: Pick<ThreadWithRelations, "building_id" | "unit_id">
): boolean => {
  if (!profile.building_id || profile.building_id !== thread.building_id) {
    return false
  }

  if (isStaffRole(profile.role)) {
    return true
  }

  if (!thread.unit_id) {
    return true
  }

  return !!profile.unit_id && profile.unit_id === thread.unit_id
}

export const canPostInThread = (
  profile: ProfileSummary,
  thread: Pick<ThreadWithRelations, "building_id" | "unit_id">
): boolean => canAccessThread(profile, thread)
