import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

import { getMockChoreAssignments, getMockCurrentMember } from './mock-data'
import type {
  ChoreAssignmentsResponse,
  ChoreAssignment,
  GetChoreAssignmentsOptions,
  MemberProfile,
} from './types'

const DEFAULT_PAGE_SIZE = 6

function normalizePage(input?: number) {
  if (!input || Number.isNaN(input) || input <= 0) {
    return 1
  }

  return input
}

function resolvePageSize(input?: number) {
  if (!input || Number.isNaN(input) || input <= 0) {
    return DEFAULT_PAGE_SIZE
  }

  return Math.min(input, 25)
}

function environmentsReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export async function getCurrentMemberProfile(): Promise<MemberProfile> {
  if (!environmentsReady()) {
    return getMockCurrentMember()
  }

  try {
    const supabase = await createSupbaseServerClientReadOnly()
    const { data: authData } = await supabase.auth.getUser()

    const user = authData?.user
    if (!user) {
      return getMockCurrentMember()
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, household_id')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      fullName: profileData?.full_name ?? user.email ?? 'Household member',
      householdId: profileData?.household_id ?? undefined,
      avatarUrl: profileData?.avatar_url ?? undefined,
    }
  } catch (error) {
    console.error('Failed to load member profile from Supabase', error)
    return getMockCurrentMember()
  }
}

export async function getChoreAssignments(
  options: GetChoreAssignmentsOptions,
): Promise<ChoreAssignmentsResponse> {
  const page = normalizePage(options.page)
  const pageSize = resolvePageSize(options.pageSize)

  const fallback = () =>
    getMockChoreAssignments({
      ...options,
      page,
      pageSize,
    })

  if (!environmentsReady()) {
    return fallback()
  }

  try {
    const supabase = await createSupbaseServerClientReadOnly()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('chore_assignments_view')
      .select(
        `
        id,
        title,
        description,
        due_date,
        status,
        frequency,
        last_completed_at,
        points,
        attachments_count,
        household_id,
        assigned_member:assigned_member_id (
          id,
          full_name,
          avatar_url
        )
      `,
        { count: 'exact' },
      )
      .order('due_date', { ascending: true })
      .range(from, to)

    if (options.householdId) {
      query = query.eq('household_id', options.householdId)
    }

    if (options.scope === 'member' && options.memberId) {
      query = query.eq('assigned_member_id', options.memberId)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Failed to load chore assignments from Supabase', error)
      return fallback()
    }

    const assignments: ChoreAssignment[] = (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      dueDate: item.due_date ?? new Date().toISOString(),
      status: (item.status as ChoreAssignment['status']) ?? 'pending',
      frequency: item.frequency,
      lastCompletedAt: item.last_completed_at ?? undefined,
      points: item.points ?? undefined,
      attachmentsCount: item.attachments_count ?? undefined,
      householdId: item.household_id ?? undefined,
      assignedMember: item.assigned_member
        ? {
            id: item.assigned_member.id,
            fullName: item.assigned_member.full_name ?? 'Household member',
            avatarUrl: item.assigned_member.avatar_url ?? undefined,
          }
        : undefined,
    }))

    const hasMore = typeof count === 'number' ? to + 1 < count : (assignments.length ?? 0) === pageSize
    const total =
      typeof count === 'number'
        ? count
        : (page - 1) * pageSize + assignments.length + (hasMore ? 1 : 0)

    return {
      assignments,
      pageInfo: {
        page,
        pageSize,
        total,
        hasMore,
      },
    }
  } catch (error) {
    console.error('Unexpected error loading chore assignments', error)
    return fallback()
  }
}

export { DEFAULT_PAGE_SIZE }
