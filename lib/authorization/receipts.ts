import type { Tables } from "@/lib/supabase"

type Profile = Pick<Tables<"profiles">, "id" | "role"> | null | undefined

export function isAdmin(profile: Profile) {
  const role = profile?.role

  if (!role) return false

  return role.toLowerCase() === "admin"
}

export function canAccessReceipt(payerId: string, profile: Profile) {
  if (!profile?.id) {
    return false
  }

  if (isAdmin(profile)) {
    return true
  }

  return profile.id === payerId
}

export function canManageReceipt(payerId: string, profile: Profile) {
  return canAccessReceipt(payerId, profile)
}
