import { addDays, formatISO } from "date-fns"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export type ChoreAssignmentRollSummary = {
  weekStart: string
  weekEnd: string
  assignmentsCreated: number
}

const DEFAULT_ASSIGNMENT_COUNT_KEY = "assignments_created"

export async function generateChoreAssignmentsForWeek(
  supabase: TypedSupabaseClient,
  weekStart: Date
): Promise<ChoreAssignmentRollSummary> {
  const weekStartIso = formatISO(weekStart, { representation: "date" })
  const weekEndIso = formatISO(addDays(weekStart, 6), { representation: "date" })

  const { data, error } = await (supabase as any).rpc(
    "generate_chore_assignments_for_week",
    {
      week_start: weekStartIso,
    }
  )

  if (error) {
    throw new Error(error.message ?? "Failed to generate chore assignments.")
  }

  const assignmentsCreated =
    (data && typeof data === "object" && DEFAULT_ASSIGNMENT_COUNT_KEY in data
      ? Number((data as Record<string, unknown>)[DEFAULT_ASSIGNMENT_COUNT_KEY])
      : typeof data === "number"
        ? data
        : 0) || 0

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    assignmentsCreated,
  }
}
