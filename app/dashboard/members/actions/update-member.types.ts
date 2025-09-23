import type { Database } from '@/lib/supabase'

export const MEMBER_ROLE_OPTIONS = [
  'tenant',
  'roommate',
  'property_manager',
  'admin',
  'user',
] as const

export const MEMBER_EDITABLE_FIELDS = [
  'full_name',
  'email',
  'phone',
  'language',
  'role',
] as const

export type MemberEditableField = (typeof MEMBER_EDITABLE_FIELDS)[number]
export type MemberRoleOption = (typeof MEMBER_ROLE_OPTIONS)[number]

export type MemberRecord = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'email' | 'phone' | 'language' | 'role' | 'row_version' | 'updated_at'
>

export type MemberPatch = Partial<Record<MemberEditableField, string | null>>

export interface UpdateMemberInput {
  memberId: string
  rowVersion: number
  patch: MemberPatch
}

export type UpdateMemberSuccess = {
  status: 'success'
  member: MemberRecord
}

export type UpdateMemberConflict = {
  status: 'conflict'
  message: string
  remote: MemberRecord
  submitted: MemberPatch
}

export type UpdateMemberError = {
  status: 'error'
  message: string
}

export type UpdateMemberResult =
  | UpdateMemberSuccess
  | UpdateMemberConflict
  | UpdateMemberError

export type EditableMemberState = {
  [Key in MemberEditableField]: string
}
