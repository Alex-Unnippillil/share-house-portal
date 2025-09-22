import type { Database } from '@/lib/supabase';

export type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

export const RESIDENT_ROLES = ['tenant', 'roommate'] as const;
export const MANAGEMENT_ROLES = ['property_manager', 'landlord', 'admin'] as const;

export type ResidentRole = (typeof RESIDENT_ROLES)[number];
export type ManagementRole = (typeof MANAGEMENT_ROLES)[number];
export type AssignableRole = ResidentRole | ManagementRole;

export type MemberPersona = 'resident' | 'management' | 'unknown';

export function isResidentRole(
  role: MemberRole | null | undefined
): role is ResidentRole {
  return role === 'tenant' || role === 'roommate';
}

export function isManagementRole(
  role: MemberRole | null | undefined
): role is ManagementRole {
  return role === 'property_manager' || role === 'landlord' || role === 'admin';
}

export function isAssignableRole(
  role: MemberRole | null | undefined
): role is AssignableRole {
  return isResidentRole(role) || isManagementRole(role);
}

export function resolveMemberPersona(role: MemberRole | null | undefined): MemberPersona {
  if (isResidentRole(role)) {
    return 'resident';
  }

  if (isManagementRole(role)) {
    return 'management';
  }

  return 'unknown';
}

export function rolesForPersona(persona: Exclude<MemberPersona, 'unknown'>): readonly AssignableRole[] {
  return persona === 'resident' ? RESIDENT_ROLES : MANAGEMENT_ROLES;
}
