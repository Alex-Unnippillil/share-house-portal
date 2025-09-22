"use server"

import { addDays, startOfDay } from "date-fns"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createSupbaseServerClient } from "@/utils/supaone"

export interface GenerateChoreAssignmentsInput {
  householdId?: string
  startDate?: string
  occurrences?: number
}

export interface GeneratedChoreAssignment {
  assignmentId?: string
  choreId: string
  memberId: string
  assignedFor: string
}

export interface GenerateChoreAssignmentsResult {
  success: boolean
  message: string
  insertedCount: number
  skipped: { choreId: string; reason: string; assignedFor?: string }[]
  startDate: string
  occurrences: number
  assignments: GeneratedChoreAssignment[]
}

type HouseholdMemberRow = {
  id: string
  household_id?: string | null
  member_id?: string | null
  profile_id?: string | null
  display_name?: string | null
  preferred_name?: string | null
  status?: string | null
  active?: boolean | null
  archived_at?: string | null
  inactive_at?: string | null
  removed_at?: string | null
  rotation_position?: number | null
  created_at?: string | null
  metadata?: Record<string, unknown> | null
}

type ChoreRow = {
  id: string
  household_id?: string | null
  unit_id?: string | null
  title?: string | null
  name?: string | null
  description?: string | null
  is_active?: boolean | null
  active?: boolean | null
  status?: string | null
  frequency_days?: number | null
  cadence_days?: number | null
  interval_days?: number | null
  rotation_frequency_days?: number | null
  rotation_anchor?: string | null
  start_date?: string | null
  starts_on?: string | null
  metadata?: Record<string, unknown> | null
}

type AssignmentRow = {
  id: string
  chore_id: string
  household_member_id?: string | null
  member_id?: string | null
  profile_id?: string | null
  assigned_for: string
}

type NewAssignmentRecord = {
  chore_id: string
  household_member_id: string
  assigned_for: string
  created_by: string
  household_id?: string | null
}

const generatorSchema = z.object({
  householdId: z
    .string({ required_error: "A household identifier is required to generate assignments." })
    .uuid({ message: "A valid household identifier is required to generate assignments." })
    .optional(),
  startDate: z.string().optional(),
  occurrences: z.coerce.number().int().min(1).max(12).default(1),
})

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return undefined
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function determineMemberLabel(member: HouseholdMemberRow): string {
  if (
    member.metadata &&
    typeof member.metadata === "object" &&
    "name" in member.metadata &&
    typeof (member.metadata as Record<string, unknown>).name === "string"
  ) {
    return (member.metadata as Record<string, unknown>).name as string
  }

  return (
    member.display_name ||
    member.preferred_name ||
    member.member_id ||
    member.profile_id ||
    member.id
  )
}

function sortMembers(a: HouseholdMemberRow, b: HouseholdMemberRow): number {
  const aPosition = toNumber(a.rotation_position)
  const bPosition = toNumber(b.rotation_position)
  if (aPosition !== undefined && bPosition !== undefined && aPosition !== bPosition) {
    return aPosition - bPosition
  }

  const aCreated = parseDate(a.created_at)?.getTime() ?? Number.POSITIVE_INFINITY
  const bCreated = parseDate(b.created_at)?.getTime() ?? Number.POSITIVE_INFINITY
  if (aCreated !== bCreated) {
    return aCreated - bCreated
  }

  const aLabel = determineMemberLabel(a)
  const bLabel = determineMemberLabel(b)
  return aLabel.localeCompare(bLabel)
}

function isActiveMember(member: HouseholdMemberRow): boolean {
  if (member.active === false) {
    return false
  }

  const status = member.status?.toLowerCase()
  if (status && ["inactive", "removed", "archived", "left"].includes(status)) {
    return false
  }

  if (member.archived_at || member.inactive_at || member.removed_at) {
    return false
  }

  return true
}

function resolveFrequencyDays(chore: ChoreRow): number {
  const candidates: Array<number | null | undefined | string> = [
    chore.frequency_days,
    chore.cadence_days,
    chore.interval_days,
    chore.rotation_frequency_days,
    chore.metadata && typeof chore.metadata.frequency_days === "number"
      ? (chore.metadata.frequency_days as number)
      : undefined,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      return candidate
    }

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const parsed = Number.parseInt(candidate, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }

  return 7
}

function resolveAnchorDate(chore: ChoreRow, fallback: Date): Date {
  const anchor =
    parseDate(chore.rotation_anchor) ||
    parseDate(chore.start_date) ||
    parseDate(chore.starts_on) ||
    fallback

  const start = startOfDay(anchor)
  if (start.getTime() > fallback.getTime()) {
    return start
  }

  return fallback
}

function memberMatchesAssignment(
  member: HouseholdMemberRow,
  assignment: AssignmentRow,
): boolean {
  const identifiers = [member.id, member.member_id, member.profile_id]
  const assignmentIdentifiers = [
    assignment.household_member_id,
    assignment.member_id,
    assignment.profile_id,
  ]

  return identifiers.some((value) => value && assignmentIdentifiers.includes(value))
}

function resolveNextMemberIndex(
  members: HouseholdMemberRow[],
  lastAssignment: AssignmentRow | null,
): number {
  if (!lastAssignment) {
    return 0
  }

  const lastIndex = members.findIndex((member) => memberMatchesAssignment(member, lastAssignment))
  if (lastIndex === -1) {
    return 0
  }

  return (lastIndex + 1) % members.length
}

function formatAssignmentDate(date: Date): string {
  return date.toISOString()
}

async function selectByColumn(
  supabase: SupabaseClient<any>,
  table: string,
  column: string,
  value: string,
) {
  const query = supabase.from(table).select("*") as any
  return query.eq(column, value)
}

function resolveChoreScopeColumns(): string[] {
  return ["household_id", "unit_id", "building_id", "property_id"]
}

function resolveMemberScopeColumns(): string[] {
  return ["household_id", "unit_id"]
}

function calculateInitialDate(
  anchorDate: Date,
  frequencyDays: number,
  candidateStart: Date,
  existingAssignments: AssignmentRow[],
): Date {
  const sorted = [...existingAssignments].sort((a, b) => {
    const aDate = parseDate(a.assigned_for)?.getTime() ?? 0
    const bDate = parseDate(b.assigned_for)?.getTime() ?? 0
    return aDate - bDate
  })

  const latestAssignment = sorted.length > 0 ? sorted[sorted.length - 1] : null
  const baseline = anchorDate.getTime() > candidateStart.getTime() ? anchorDate : candidateStart

  if (!latestAssignment) {
    return baseline
  }

  const latestDate = parseDate(latestAssignment.assigned_for)
  if (!latestDate) {
    return baseline
  }

  if (latestDate.getTime() >= baseline.getTime()) {
    return addDays(latestDate, Math.max(frequencyDays, 1))
  }

  return baseline
}

async function fetchHouseholdMembers(
  supabase: SupabaseClient<any>,
  householdId: string,
): Promise<HouseholdMemberRow[]> {
  for (const column of resolveMemberScopeColumns()) {
    const { data, error } = await selectByColumn(supabase, "household_members", column, householdId)
    if (!error) {
      const rows = (data ?? []) as HouseholdMemberRow[]
      return rows.filter(isActiveMember).sort(sortMembers)
    }

    if (error.code !== "42703") {
      throw new Error(`Failed to load household members: ${error.message}`)
    }
  }

  return []
}

async function fetchChores(
  supabase: SupabaseClient<any>,
  householdId: string,
): Promise<ChoreRow[]> {
  for (const column of resolveChoreScopeColumns()) {
    const { data, error } = await selectByColumn(supabase, "chores", column, householdId)
    if (!error) {
      const rows = (data ?? []) as ChoreRow[]
      return rows.filter((row) => {
        if (row.is_active === false) {
          return false
        }

        const status = row.status?.toLowerCase()
        if (status && ["archived", "inactive", "disabled"].includes(status)) {
          return false
        }

        if (row.active === false) {
          return false
        }

        return true
      })
    }

    if (error.code !== "42703") {
      throw new Error(`Failed to load chores: ${error.message}`)
    }
  }

  return []
}

function buildAssignmentKey(choreId: string, assignedFor: string): string {
  return `${choreId}:${assignedFor}`
}

function normaliseInput(
  input: FormData | GenerateChoreAssignmentsInput | undefined,
  fallbackHouseholdId?: string,
) {
  let candidate: Partial<GenerateChoreAssignmentsInput> = {}

  if (input instanceof FormData) {
    candidate = {
      householdId: input.get("householdId")?.toString(),
      startDate: input.get("startDate")?.toString(),
      occurrences: input.get("occurrences") ? Number(input.get("occurrences")) : undefined,
    }
  } else if (typeof input === "object" && input) {
    candidate = input
  }

  if (!candidate.householdId && fallbackHouseholdId) {
    candidate.householdId = fallbackHouseholdId
  }

  const parsed = generatorSchema.safeParse(candidate)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(issue?.message ?? "Invalid chore generation request.")
  }

  const { householdId, startDate, occurrences } = parsed.data
  if (!householdId) {
    throw new Error("A household identifier is required to generate assignments.")
  }

  const parsedStart = startDate && startDate.length > 0 ? new Date(startDate) : new Date()
  if (Number.isNaN(parsedStart.getTime())) {
    throw new Error("Invalid start date provided for chore generation.")
  }

  return {
    householdId,
    startDate: startOfDay(parsedStart),
    occurrences,
  }
}

async function logEvent(
  supabase: SupabaseClient<any>,
  payload: {
    actorId: string
    householdId: string
    outcome: "success" | "error"
    message: string
    startDate: string
    occurrences: number
    inserted: GeneratedChoreAssignment[]
    skipped: { choreId: string; reason: string; assignedFor?: string }[]
    error?: string
  },
) {
  const eventPayload = {
    message: payload.message,
    startDate: payload.startDate,
    occurrences: payload.occurrences,
    inserted: payload.inserted,
    skipped: payload.skipped,
    householdId: payload.householdId,
    outcome: payload.outcome,
    error: payload.error,
  }

  const { error } = await supabase.from("events").insert({
    actor_id: payload.actorId,
    event_type: "chore.assignments.generated",
    context: "chores",
    payload: eventPayload,
  } as any)

  if (error) {
    console.error("Failed to log chore assignment event", error)
  }
}

export async function generateChoreAssignments(
  input?: FormData | GenerateChoreAssignmentsInput,
): Promise<GenerateChoreAssignmentsResult> {
  const supabase = (await createSupbaseServerClient()) as SupabaseClient<any>

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("You must be signed in to generate chore assignments.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, household_id, unit_id, default_household_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Unable to load profile: ${profileError.message}`)
  }

  const role = (profile as any)?.role
  const isAdmin = role === "admin" || role === "property_manager"
  if (!isAdmin) {
    throw new Error("Only admins can generate chore assignments.")
  }

  const fallbackHouseholdId =
    (profile as any)?.household_id ||
    (profile as any)?.unit_id ||
    (profile as any)?.default_household_id ||
    undefined

  const { householdId, startDate, occurrences } = normaliseInput(input, fallbackHouseholdId)

  const members = await fetchHouseholdMembers(supabase, householdId)
  if (members.length === 0) {
    const result: GenerateChoreAssignmentsResult = {
      success: true,
      message: "No active members found to assign chores.",
      insertedCount: 0,
      skipped: [],
      startDate: startDate.toISOString(),
      occurrences,
      assignments: [],
    }

    await logEvent(supabase, {
      actorId: user.id,
      householdId,
      outcome: "success",
      message: result.message,
      startDate: result.startDate,
      occurrences,
      inserted: [],
      skipped: [],
    })

    return result
  }

  const chores = await fetchChores(supabase, householdId)
  if (chores.length === 0) {
    const result: GenerateChoreAssignmentsResult = {
      success: true,
      message: "No active chores are configured for this household.",
      insertedCount: 0,
      skipped: [],
      startDate: startDate.toISOString(),
      occurrences,
      assignments: [],
    }

    await logEvent(supabase, {
      actorId: user.id,
      householdId,
      outcome: "success",
      message: result.message,
      startDate: result.startDate,
      occurrences,
      inserted: [],
      skipped: [],
    })

    return result
  }

  const choreIds = Array.from(new Set(chores.map((chore) => chore.id).filter(Boolean)))

  const { data: assignmentRows, error: assignmentsError } = await supabase
    .from("chore_assignments")
    .select("id, chore_id, household_member_id, member_id, profile_id, assigned_for")
    .in("chore_id", choreIds)

  if (assignmentsError) {
    throw new Error(`Failed to load existing assignments: ${assignmentsError.message}`)
  }

  const assignmentsByChore = new Map<string, AssignmentRow[]>()
  const existingKeySet = new Set<string>()

  for (const assignment of (assignmentRows ?? []) as AssignmentRow[]) {
    const key = buildAssignmentKey(assignment.chore_id, assignment.assigned_for)
    existingKeySet.add(key)

    if (!assignmentsByChore.has(assignment.chore_id)) {
      assignmentsByChore.set(assignment.chore_id, [])
    }

    assignmentsByChore.get(assignment.chore_id)!.push(assignment)
  }

  const records: NewAssignmentRecord[] = []
  const skipped: { choreId: string; reason: string; assignedFor?: string }[] = []

  for (const chore of chores) {
    const choreMembers = [...members]
    if (choreMembers.length === 0) {
      skipped.push({ choreId: chore.id, reason: "No active members available." })
      continue
    }

    const frequencyDays = resolveFrequencyDays(chore)
    const anchorDate = resolveAnchorDate(chore, startDate)
    const existingAssignments = assignmentsByChore.get(chore.id) ?? []
    const initialDate = calculateInitialDate(anchorDate, frequencyDays, startDate, existingAssignments)
    const nextMemberStartIndex = resolveNextMemberIndex(
      choreMembers,
      existingAssignments.length > 0 ? existingAssignments[existingAssignments.length - 1] : null,
    )

    for (let occurrence = 0; occurrence < occurrences; occurrence += 1) {
      const member = choreMembers[(nextMemberStartIndex + occurrence) % choreMembers.length]
      const assignmentDate = addDays(initialDate, occurrence * Math.max(frequencyDays, 1))
      const assignedFor = formatAssignmentDate(assignmentDate)
      const key = buildAssignmentKey(chore.id, assignedFor)

      if (existingKeySet.has(key)) {
        skipped.push({
          choreId: chore.id,
          reason: "Assignment already exists for this date.",
          assignedFor,
        })
        continue
      }

      existingKeySet.add(key)
      records.push({
        chore_id: chore.id,
        household_member_id: member.id,
        assigned_for: assignedFor,
        created_by: user.id,
        household_id: chore.household_id ?? chore.unit_id ?? householdId,
      })
    }
  }

  let insertedAssignments: GeneratedChoreAssignment[] = []

  if (records.length > 0) {
    const { data: transactionResult, error: transactionError } = await supabase.transaction(
      async (tx) => {
        const futureCheck = await tx
          .from("chore_assignments")
          .select("chore_id, assigned_for")
          .in("chore_id", choreIds)

        if (futureCheck.error) {
          throw futureCheck.error
        }

        const existingKeys = new Set<string>(
          (futureCheck.data ?? []).map((row: AssignmentRow) =>
            buildAssignmentKey(row.chore_id, row.assigned_for),
          ),
        )

        const pending: NewAssignmentRecord[] = []
        const skippedDuringTransaction: string[] = []

        for (const record of records) {
          const key = buildAssignmentKey(record.chore_id, record.assigned_for)
          if (existingKeys.has(key)) {
            skippedDuringTransaction.push(key)
            continue
          }

          pending.push(record)
        }

        if (pending.length === 0) {
          return { inserted: [] as AssignmentRow[], duplicates: skippedDuringTransaction }
        }

        const { data: created, error: insertError } = await tx
          .from("chore_assignments")
          .insert(pending as any)
          .select("id, chore_id, household_member_id, assigned_for")

        if (insertError) {
          throw insertError
        }

        return {
          inserted: (created ?? []) as AssignmentRow[],
          duplicates: skippedDuringTransaction,
        }
      },
    )

    if (transactionError) {
      await logEvent(supabase, {
        actorId: user.id,
        householdId,
        outcome: "error",
        message: "Failed to generate chore assignments.",
        startDate: startDate.toISOString(),
        occurrences,
        inserted: [],
        skipped,
        error: transactionError.message,
      })

      throw new Error(`Failed to create assignments: ${transactionError.message}`)
    }

    const inserted = transactionResult?.inserted ?? []
    insertedAssignments = inserted.map((assignment) => ({
      assignmentId: assignment.id,
      choreId: assignment.chore_id,
      memberId:
        assignment.household_member_id ||
        members.find((member) => memberMatchesAssignment(member, assignment))?.id ||
        "",
      assignedFor: assignment.assigned_for,
    }))

    for (const duplicateKey of transactionResult?.duplicates ?? []) {
      const [choreId, assignedFor] = duplicateKey.split(":")
      skipped.push({
        choreId,
        reason: "Assignment already exists for this date.",
        assignedFor,
      })
    }
  }

  const insertedCount = insertedAssignments.length
  const message = insertedCount > 0
    ? `Generated ${insertedCount} chore assignment${insertedCount === 1 ? "" : "s"}.`
    : "No new chore assignments were created."

  const result: GenerateChoreAssignmentsResult = {
    success: true,
    message,
    insertedCount,
    skipped,
    startDate: startDate.toISOString(),
    occurrences,
    assignments: insertedAssignments,
  }

  await logEvent(supabase, {
    actorId: user.id,
    householdId,
    outcome: "success",
    message,
    startDate: result.startDate,
    occurrences,
    inserted: insertedAssignments,
    skipped,
  })

  revalidatePath("/chores")

  return result
}
