import type {
  EditableMemberState,
  MemberPatch,
  MemberRecord,
} from '@/app/dashboard/members/actions/update-member.types'

export interface MemberConflictState {
  remote: MemberRecord
  baseline: MemberRecord
  local: EditableMemberState
  patch: MemberPatch
}
