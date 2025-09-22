import { addDays, subDays } from 'date-fns'

import type {
  ChoreAssignment,
  ChoreAssignmentsResponse,
  GetChoreAssignmentsOptions,
  MemberProfile,
} from './types'

const MOCK_HOUSEHOLD_ID = 'household-lincoln-ave'

const mockHouseholdMembers: MemberProfile[] = [
  {
    id: 'member-alex-johnson',
    fullName: 'Alex Johnson',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=Alex',
    householdId: MOCK_HOUSEHOLD_ID,
  },
  {
    id: 'member-samantha-lee',
    fullName: 'Samantha Lee',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=Samantha',
    householdId: MOCK_HOUSEHOLD_ID,
  },
  {
    id: 'member-jordan-park',
    fullName: 'Jordan Park',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=Jordan',
    householdId: MOCK_HOUSEHOLD_ID,
  },
  {
    id: 'member-taylor-evans',
    fullName: 'Taylor Evans',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=Taylor',
    householdId: MOCK_HOUSEHOLD_ID,
  },
]

const choreBlueprints = [
  {
    id: 'chore-kitchen-deep-clean',
    title: 'Deep clean the kitchen',
    description: 'Wipe counters, scrub the sink, and refresh the stovetop.',
    dueInDays: 0,
    status: 'due_today' as const,
    frequency: 'Weekly · Sundays',
    lastCompletedOffset: 6,
    points: 15,
    attachmentsCount: 2,
    memberId: 'member-alex-johnson',
  },
  {
    id: 'chore-bathroom-refresh',
    title: 'Bathroom refresh',
    description: 'Sanitize sinks, mirrors, and stock fresh towels.',
    dueInDays: 2,
    status: 'upcoming' as const,
    frequency: 'Biweekly · Tuesdays',
    lastCompletedOffset: 12,
    points: 10,
    attachmentsCount: 0,
    memberId: 'member-samantha-lee',
  },
  {
    id: 'chore-trash-rotation',
    title: 'Take out trash & recycling',
    description: 'Empty all bins, replace liners, and wheel cans to the curb.',
    dueInDays: -1,
    status: 'overdue' as const,
    frequency: 'Twice weekly',
    lastCompletedOffset: 5,
    points: 5,
    attachmentsCount: 0,
    memberId: 'member-alex-johnson',
  },
  {
    id: 'chore-living-room-reset',
    title: 'Living room reset',
    description: 'Vacuum rugs, fold blankets, and tidy remote controls.',
    dueInDays: 4,
    status: 'pending' as const,
    frequency: 'Weekly · Fridays',
    lastCompletedOffset: 3,
    points: 8,
    attachmentsCount: 1,
    memberId: 'member-jordan-park',
  },
  {
    id: 'chore-fridge-inventory',
    title: 'Fridge inventory & wipe down',
    description: 'Toss expired food and clean shelves and drawers.',
    dueInDays: 7,
    status: 'upcoming' as const,
    frequency: 'Monthly · First Monday',
    lastCompletedOffset: 27,
    points: 12,
    attachmentsCount: 0,
    memberId: 'member-taylor-evans',
  },
  {
    id: 'chore-plants-water',
    title: 'Water shared plants',
    description: 'Check soil moisture and water all common-area plants.',
    dueInDays: 1,
    status: 'in_progress' as const,
    frequency: 'Weekly · Mondays',
    lastCompletedOffset: 7,
    points: 4,
    attachmentsCount: 0,
    memberId: 'member-samantha-lee',
  },
  {
    id: 'chore-counters-disinfect',
    title: 'Disinfect high-touch surfaces',
    description: 'Door handles, fridge handles, and shared keyboards.',
    dueInDays: 3,
    status: 'pending' as const,
    frequency: 'Weekly · Wednesdays',
    lastCompletedOffset: 9,
    points: 6,
    attachmentsCount: 1,
    memberId: 'member-jordan-park',
  },
  {
    id: 'chore-laundry-rotation',
    title: 'Shared linens laundry',
    description: 'Wash dish towels and shared bathroom mats.',
    dueInDays: -3,
    status: 'overdue' as const,
    frequency: 'Biweekly · Saturdays',
    lastCompletedOffset: 15,
    points: 9,
    attachmentsCount: 0,
    memberId: 'member-taylor-evans',
  },
  {
    id: 'chore-mail-sorting',
    title: 'Sort delivered mail',
    description: 'Open shared mail and place individual items in the cubbies.',
    dueInDays: 0,
    status: 'due_today' as const,
    frequency: 'Daily',
    lastCompletedOffset: 1,
    points: 3,
    attachmentsCount: 0,
    memberId: 'member-alex-johnson',
  },
  {
    id: 'chore-appliance-check',
    title: 'Appliance maintenance check',
    description: 'Run dishwasher clean cycle and wipe laundry machine seals.',
    dueInDays: 5,
    status: 'pending' as const,
    frequency: 'Monthly · Mid-month',
    lastCompletedOffset: 29,
    points: 14,
    attachmentsCount: 1,
    memberId: 'member-samantha-lee',
  },
]

function buildMockAssignments(): ChoreAssignment[] {
  const today = new Date()

  return choreBlueprints.map((blueprint) => {
    const member = mockHouseholdMembers.find((item) => item.id === blueprint.memberId) ?? mockHouseholdMembers[0]
    const dueDate = addDays(today, blueprint.dueInDays)

    return {
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      dueDate: dueDate.toISOString(),
      status: blueprint.status,
      frequency: blueprint.frequency,
      lastCompletedAt: blueprint.lastCompletedOffset != null
        ? subDays(today, blueprint.lastCompletedOffset).toISOString()
        : null,
      points: blueprint.points,
      attachmentsCount: blueprint.attachmentsCount,
      householdId: MOCK_HOUSEHOLD_ID,
      assignedMember: {
        id: member.id,
        fullName: member.fullName,
        avatarUrl: member.avatarUrl,
      },
    }
  })
}

export function getMockCurrentMember(): MemberProfile {
  return mockHouseholdMembers[0]
}

export function getMockChoreAssignments(
  options: GetChoreAssignmentsOptions & { page: number; pageSize: number }
): ChoreAssignmentsResponse {
  const assignments = buildMockAssignments()
  const memberId = options.memberId ?? getMockCurrentMember().id

  const filtered = assignments.filter((assignment) => {
    if (options.scope === 'member') {
      return assignment.assignedMember?.id === memberId
    }

    if (options.householdId) {
      return assignment.householdId === options.householdId
    }

    return true
  })

  const total = filtered.length
  const start = (options.page - 1) * options.pageSize
  const end = start + options.pageSize
  const paginated = filtered.slice(start, end)

  return {
    assignments: paginated,
    pageInfo: {
      page: options.page,
      pageSize: options.pageSize,
      total,
      hasMore: end < total,
    },
  }
}

export { MOCK_HOUSEHOLD_ID, mockHouseholdMembers }
