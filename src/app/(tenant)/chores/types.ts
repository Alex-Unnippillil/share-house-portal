export type ChoreStatus =
  | 'upcoming'
  | 'due_today'
  | 'pending'
  | 'in_progress'
  | 'overdue'
  | 'completed'
  | 'skipped'

export interface HouseholdMemberSummary {
  id: string
  fullName: string
  avatarUrl?: string | null
}

export interface ChoreAssignment {
  id: string
  title: string
  description?: string | null
  dueDate: string
  status: ChoreStatus
  frequency?: string | null
  lastCompletedAt?: string | null
  points?: number | null
  attachmentsCount?: number | null
  householdId?: string | null
  assignedMember?: HouseholdMemberSummary | null
}

export interface MemberProfile {
  id: string
  fullName: string
  householdId?: string | null
  avatarUrl?: string | null
}

export interface PageInfo {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface ChoreAssignmentsResponse {
  assignments: ChoreAssignment[]
  pageInfo: PageInfo
}

export interface GetChoreAssignmentsOptions {
  scope: 'member' | 'household'
  memberId?: string
  householdId?: string
  page?: number
  pageSize?: number
}
