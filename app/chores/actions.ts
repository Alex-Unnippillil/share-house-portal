"use server"

import { addWeeks, format, startOfWeek } from "date-fns"
import { revalidatePath } from "next/cache"

import { generateChoreAssignmentsForWeek } from "@/lib/chores/generator"
import type { ChoreAssignmentRollSummary } from "@/lib/chores/generator"
import { createSupbaseServerClient } from "@/utils/supaone"

export type RollAssignmentsState = {
  status: "idle" | "success" | "error"
  message?: string
  details?: string
  summary?: ChoreAssignmentRollSummary
}

export const rollAssignmentsInitialState: RollAssignmentsState = {
  status: "idle",
}

const AUDIT_ACTION = "chores.roll_assignments"

export async function rollAssignments(
  _prevState: RollAssignmentsState,
  _formData: FormData
): Promise<RollAssignmentsState> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: "error",
      message: "You must be signed in as an admin to roll assignments.",
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Failed to load profile for rollAssignments", profileError)
    return {
      status: "error",
      message: "Unable to verify permissions.",
    }
  }

  if (profile?.role !== "admin") {
    return {
      status: "error",
      message: "Only administrators can roll assignments.",
    }
  }

  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 })

  try {
    const summary = await generateChoreAssignmentsForWeek(supabase, nextWeekStart)

    const auditPayload = {
      actor_id: user.id,
      action: AUDIT_ACTION,
      metadata: {
        week_start: summary.weekStart,
        week_end: summary.weekEnd,
        assignments_created: summary.assignmentsCreated,
        trigger: "manual_admin",
        actor_name: profile?.full_name ?? undefined,
      },
      created_at: new Date().toISOString(),
    }

    const { error: auditError } = await (supabase as any)
      .from("audit_logs")
      .insert(auditPayload)

    if (auditError) {
      console.error("Failed to log audit event for chore roll", auditError)
    }

    revalidatePath("/chores")

    return {
      status: "success",
      message: `Assignments rolled for the week of ${format(nextWeekStart, "MMMM d")}.`,
      summary,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unexpected error while rolling assignments."

    console.error("Failed to roll chore assignments", error)

    return {
      status: "error",
      message: "Unable to roll assignments.",
      details: errorMessage,
    }
  }
}
