import { addDays, differenceInCalendarWeeks, isAfter, isBefore, isValid, parseISO, startOfWeek } from 'date-fns'

export type RoommateProfile = {
  id: string
  full_name: string | null
}

export type VacationRange = {
  profile_id: string
  starts_on: string
  ends_on: string
}

export type HistoricalChoreAssignment = {
  assigned_to: string
  chore_name: string
  week_start: string
  weight: number | null
  missed_count: number | null
  completed: boolean | null
}

export type ChoreTemplate = {
  name: string
  weight: number
}

export type AssignmentDecision = {
  chore_name: string
  assigned_to: string
  weight: number
  missed_count_snapshot: number
  load_before: number
  fairness_score: number
}

export type WeeklyAssignmentPlan = {
  weekStartISO: string
  assignments: AssignmentDecision[]
  unassigned: ChoreTemplate[]
  metadata: {
    availableRoommates: string[]
    onVacation: string[]
  }
}

export const DEFAULT_CHORE_TEMPLATES: ChoreTemplate[] = [
  { name: 'Kitchen Deep Clean', weight: 3 },
  { name: 'Trash & Recycling', weight: 2 },
  { name: 'Bathroom Refresh', weight: 2 },
  { name: 'Living Room Reset', weight: 2 },
  { name: 'Entryway & Mail', weight: 1 },
]

const WEEK_START_OPTIONS = { weekStartsOn: 1 as const }
const MISSED_ASSIGNMENT_PENALTY = 2
const RECENCY_WINDOW_WEEKS = 3
const RECENCY_WEIGHT = 1.5
const ADDITIONAL_ASSIGNMENT_WEIGHT = 1

export function normalizeWeekStart(date: Date): Date {
  return startOfWeek(date, WEEK_START_OPTIONS)
}

function parseDate(value: string): Date | null {
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export function deriveChoreCatalog(
  history: HistoricalChoreAssignment[],
  fallback: ChoreTemplate[] = DEFAULT_CHORE_TEMPLATES
): ChoreTemplate[] {
  const choreMap = new Map<string, number>()

  for (const entry of history) {
    if (!entry?.chore_name) continue
    const weight = entry.weight ?? 1
    choreMap.set(entry.chore_name, weight)
  }

  for (const template of fallback) {
    if (!choreMap.has(template.name)) {
      choreMap.set(template.name, template.weight)
    }
  }

  return Array.from(choreMap.entries())
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
}

export function computeWeeklyAssignments(args: {
  weekStart: Date
  roommates: RoommateProfile[]
  vacations: VacationRange[]
  historicalAssignments: HistoricalChoreAssignment[]
  chores: ChoreTemplate[]
}): WeeklyAssignmentPlan {
  const weekStart = normalizeWeekStart(args.weekStart)
  const weekEnd = addDays(weekStart, 6)
  const weekStartISO = weekStart.toISOString().slice(0, 10)

  const vacationingMembers = new Set<string>()
  for (const vacation of args.vacations ?? []) {
    const vacationStart = parseDate(vacation.starts_on)
    const vacationEnd = parseDate(vacation.ends_on)
    if (!vacationStart || !vacationEnd) continue
    if (isAfter(vacationStart, weekEnd) || isBefore(vacationEnd, weekStart)) continue
    vacationingMembers.add(vacation.profile_id)
  }

  type MemberStats = {
    totalLoad: number
    missed: number
    assignmentsThisWeek: number
    lastAssigned: Map<string, Date>
  }

  const memberStats = new Map<string, MemberStats>()
  for (const roommate of args.roommates ?? []) {
    memberStats.set(roommate.id, {
      totalLoad: 0,
      missed: 0,
      assignmentsThisWeek: 0,
      lastAssigned: new Map<string, Date>(),
    })
  }

  for (const entry of args.historicalAssignments ?? []) {
    if (!entry?.assigned_to) continue
    const stats = memberStats.get(entry.assigned_to)
    if (!stats) continue

    const assignmentWeek = parseDate(entry.week_start)
    if (!assignmentWeek) continue
    if (!isBefore(assignmentWeek, weekStart)) continue

    const weight = entry.weight ?? 1
    stats.totalLoad += weight
    stats.lastAssigned.set(entry.chore_name, assignmentWeek)

    const missesFromHistory = entry.missed_count ?? 0
    stats.missed = Math.max(stats.missed, missesFromHistory)
    if (entry.completed === false) {
      stats.missed += 1
    }
  }

  const availableRoommates = (args.roommates ?? []).filter(
    (roommate) => !vacationingMembers.has(roommate.id)
  )

  const assignments: AssignmentDecision[] = []
  const unassigned: ChoreTemplate[] = []

  const choresSorted = [...(args.chores ?? [])].sort(
    (a, b) => b.weight - a.weight || a.name.localeCompare(b.name)
  )

  for (const chore of choresSorted) {
    const candidates = [] as Array<{
      roommate: RoommateProfile
      stats: MemberStats
      loadBefore: number
      missedSnapshot: number
      fairnessScore: number
    }>

    for (const roommate of availableRoommates) {
      const stats = memberStats.get(roommate.id)
      if (!stats) continue

      const loadBefore = stats.totalLoad
      const missedSnapshot = stats.missed
      const lastAssignedDate = stats.lastAssigned.get(chore.name)
      let recencyPenalty = 0
      if (lastAssignedDate) {
        const weeksSince = differenceInCalendarWeeks(
          weekStart,
          lastAssignedDate,
          WEEK_START_OPTIONS
        )
        if (weeksSince <= RECENCY_WINDOW_WEEKS) {
          const proximity = Math.max(RECENCY_WINDOW_WEEKS + 1 - weeksSince, 0)
          recencyPenalty = proximity * chore.weight * RECENCY_WEIGHT
        }
      }

      const fairnessScore =
        loadBefore +
        chore.weight +
        missedSnapshot * MISSED_ASSIGNMENT_PENALTY +
        stats.assignmentsThisWeek * ADDITIONAL_ASSIGNMENT_WEIGHT +
        recencyPenalty

      candidates.push({
        roommate,
        stats,
        loadBefore,
        missedSnapshot,
        fairnessScore,
      })
    }

    if (candidates.length === 0) {
      unassigned.push(chore)
      continue
    }

    candidates.sort((a, b) => {
      if (a.fairnessScore !== b.fairnessScore) {
        return a.fairnessScore - b.fairnessScore
      }
      return (a.roommate.full_name ?? a.roommate.id).localeCompare(
        b.roommate.full_name ?? b.roommate.id
      )
    })

    const selected = candidates[0]
    assignments.push({
      chore_name: chore.name,
      assigned_to: selected.roommate.id,
      weight: chore.weight,
      missed_count_snapshot: selected.missedSnapshot,
      load_before: selected.loadBefore,
      fairness_score: Number(selected.fairnessScore.toFixed(2)),
    })

    selected.stats.totalLoad += chore.weight
    selected.stats.assignmentsThisWeek += 1
    selected.stats.lastAssigned.set(chore.name, weekStart)
  }

  return {
    weekStartISO,
    assignments,
    unassigned,
    metadata: {
      availableRoommates: availableRoommates.map((roommate) => roommate.id),
      onVacation: Array.from(vacationingMembers),
    },
  }
}
