import { describe, expect, it } from 'vitest'

import {
  computeWeeklyAssignments,
  deriveChoreCatalog,
  type ChoreTemplate,
  type HistoricalChoreAssignment,
  type VacationRange,
} from '@/lib/chore-scheduler'

const WEEK_START = new Date('2024-06-03T09:00:00Z')

function buildHistory(entries: Partial<HistoricalChoreAssignment>[]): HistoricalChoreAssignment[] {
  return entries.map((entry) => ({
    assigned_to: entry.assigned_to ?? 'missing',
    chore_name: entry.chore_name ?? 'Unset',
    week_start: entry.week_start ?? '2024-05-27',
    weight: entry.weight ?? 1,
    missed_count: entry.missed_count ?? 0,
    completed: entry.completed ?? true,
  }))
}

describe('deriveChoreCatalog', () => {
  it('merges fallback chores when history is empty', () => {
    const fallback: ChoreTemplate[] = [
      { name: 'Test Chore', weight: 1 },
    ]

    const result = deriveChoreCatalog([], fallback)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'Test Chore', weight: 1 })
  })

  it('uses historical weights when available', () => {
    const history = buildHistory([
      {
        chore_name: 'Kitchen',
        weight: 4,
      },
      {
        chore_name: 'Kitchen',
        weight: 2,
      },
    ])

    const result = deriveChoreCatalog(history)
    expect(result).toContainEqual(expect.objectContaining({ name: 'Kitchen', weight: 2 }))
  })
})

describe('computeWeeklyAssignments', () => {
  const roommates = [
    { id: 'alex', full_name: 'Alex' },
    { id: 'blake', full_name: 'Blake' },
    { id: 'casey', full_name: 'Casey' },
  ]

  it('skips roommates that are on vacation during the target week', () => {
    const vacations: VacationRange[] = [
      { profile_id: 'blake', starts_on: '2024-06-02', ends_on: '2024-06-10' },
    ]

    const plan = computeWeeklyAssignments({
      weekStart: WEEK_START,
      roommates: roommates.slice(0, 2),
      vacations,
      historicalAssignments: [],
      chores: [{ name: 'Trash', weight: 1 }],
    })

    expect(plan.assignments).toHaveLength(1)
    expect(plan.assignments[0].assigned_to).toBe('alex')
    expect(plan.metadata.onVacation).toContain('blake')
  })

  it('rotates chores away from the most recent assignee when possible', () => {
    const history = buildHistory([
      {
        assigned_to: 'alex',
        chore_name: 'Trash',
        week_start: '2024-05-27',
        weight: 1,
        completed: true,
      },
    ])

    const plan = computeWeeklyAssignments({
      weekStart: WEEK_START,
      roommates: roommates.slice(0, 2),
      vacations: [],
      historicalAssignments: history,
      chores: [{ name: 'Trash', weight: 1 }],
    })

    expect(plan.assignments).toHaveLength(1)
    expect(plan.assignments[0].assigned_to).toBe('blake')
  })

  it('favours roommates with lower historical load and fewer misses', () => {
    const history = buildHistory([
      {
        assigned_to: 'alex',
        chore_name: 'Kitchen',
        week_start: '2024-05-13',
        weight: 3,
      },
      {
        assigned_to: 'alex',
        chore_name: 'Bathroom',
        week_start: '2024-05-20',
        weight: 3,
      },
      {
        assigned_to: 'blake',
        chore_name: 'Trash',
        week_start: '2024-05-20',
        weight: 1,
      },
      {
        assigned_to: 'casey',
        chore_name: 'Trash',
        week_start: '2024-05-20',
        weight: 1,
        missed_count: 1,
        completed: false,
      },
    ])

    const plan = computeWeeklyAssignments({
      weekStart: WEEK_START,
      roommates,
      vacations: [],
      historicalAssignments: history,
      chores: [
        { name: 'Kitchen', weight: 3 },
        { name: 'Trash', weight: 1 },
      ],
    })

    expect(plan.assignments.map((assignment) => assignment.assigned_to)).toEqual([
      'blake',
      'alex',
    ])
    expect(plan.assignments.find((assignment) => assignment.assigned_to === 'blake')).toMatchObject({
      load_before: 1,
      missed_count_snapshot: 0,
    })
    expect(plan.assignments.find((assignment) => assignment.assigned_to === 'alex')).toMatchObject({
      load_before: 6,
      missed_count_snapshot: 0,
    })
    expect(plan.assignments.some((assignment) => assignment.assigned_to === 'casey')).toBe(false)
  })
})
