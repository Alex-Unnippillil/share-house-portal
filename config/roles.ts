export const MEMBER_ROLE_VALUES = ['tenant', 'roommate', 'property_manager', 'admin', 'user'] as const

export type MemberRoleValue = (typeof MEMBER_ROLE_VALUES)[number]

export const MEMBER_ROLE_LABELS: Record<MemberRoleValue, string> = {
  tenant: 'Tenant',
  roommate: 'Roommate',
  property_manager: 'Property manager',
  admin: 'Admin',
  user: 'User',
}

export function getMemberRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Unknown'
  return MEMBER_ROLE_LABELS[role as MemberRoleValue] ?? role
}
