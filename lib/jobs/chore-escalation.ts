import { differenceInHours } from "date-fns"
import { Resend } from "resend"
import type { SupabaseClient } from "@supabase/supabase-js"

export const ESCALATION_THRESHOLD_HOURS = 24
export const CHORE_REMINDER_EVENT = "chore.reminder_sent" as const
export const CHORE_ESCALATION_EVENT = "chore.escalated" as const

export type ChoreEventType =
  | typeof CHORE_REMINDER_EVENT
  | typeof CHORE_ESCALATION_EVENT

export interface ChoreAssignment {
  id: string
  title?: string | null
  description?: string | null
  status: string
  dueAt: string
  householdId: string | null
  assignedMemberId: string
}

export interface ChoreEvent {
  id: string
  assignmentId: string
  eventType: ChoreEventType
  createdAt: string
  metadata: Record<string, unknown> | null
  householdId: string | null
}

export interface ReminderContext {
  now: Date
  hoursOverdue: number
}

export interface EscalationContext extends ReminderContext {
  reminderEventId: string
  reminderSentAt: Date
  hoursSinceReminder: number
}

export interface ReminderNotificationResult {
  memberId: string
  channels: string[]
}

export interface HouseholdNotificationResult {
  channel: string
  eventId?: string | null
  message: string
}

export interface AdminAlertResult {
  emailRecipients: string[]
  pushRecipients: string[]
}

export interface ChoreEscalationNotificationService {
  sendReminder(
    assignment: ChoreAssignment,
    context: ReminderContext,
  ): Promise<ReminderNotificationResult>

  postToHouseholdChannel(
    assignment: ChoreAssignment,
    context: EscalationContext,
  ): Promise<HouseholdNotificationResult>

  notifyAdmins(
    assignment: ChoreAssignment,
    context: EscalationContext,
  ): Promise<AdminAlertResult>
}

export interface EventLogEntry {
  assignmentId: string
  eventType: ChoreEventType
  householdId: string | null
  metadata: Record<string, unknown>
  createdAt?: Date
}

export interface ChoreEscalationRepository {
  fetchOverdueAssignments(referenceDate: Date): Promise<ChoreAssignment[]>
  fetchEventsForAssignments(
    assignmentIds: string[],
    eventTypes: ChoreEventType[],
  ): Promise<ChoreEvent[]>
  logEvent(entry: EventLogEntry): Promise<void>
}

export interface ChoreEscalationJobResult {
  processed: number
  remindersSent: number
  escalationsTriggered: number
  skipped: number
  failures: { assignmentId: string; reason: string }[]
}

export async function runChoreEscalationJob({
  repository,
  notifications,
  now = new Date(),
}: {
  repository: ChoreEscalationRepository
  notifications: ChoreEscalationNotificationService
  now?: Date
}): Promise<ChoreEscalationJobResult> {
  const overdueAssignments = await repository.fetchOverdueAssignments(now)
  const processed = overdueAssignments.length
  const failures: { assignmentId: string; reason: string }[] = []

  if (processed === 0) {
    return {
      processed,
      remindersSent: 0,
      escalationsTriggered: 0,
      skipped: 0,
      failures,
    }
  }

  const assignmentIds = overdueAssignments.map((assignment) => assignment.id)
  const historicalEvents = await repository.fetchEventsForAssignments(
    assignmentIds,
    [CHORE_REMINDER_EVENT, CHORE_ESCALATION_EVENT],
  )

  const eventsByAssignment = new Map<
    string,
    { reminder?: ChoreEvent; escalation?: ChoreEvent }
  >()

  for (const event of historicalEvents) {
    const assignmentHistory = eventsByAssignment.get(event.assignmentId) ?? {}
    if (event.eventType === CHORE_REMINDER_EVENT) {
      if (
        !assignmentHistory.reminder ||
        new Date(event.createdAt).getTime() >
          new Date(assignmentHistory.reminder.createdAt).getTime()
      ) {
        assignmentHistory.reminder = event
      }
    }

    if (event.eventType === CHORE_ESCALATION_EVENT) {
      if (
        !assignmentHistory.escalation ||
        new Date(event.createdAt).getTime() >
          new Date(assignmentHistory.escalation.createdAt).getTime()
      ) {
        assignmentHistory.escalation = event
      }
    }

    eventsByAssignment.set(event.assignmentId, assignmentHistory)
  }

  let remindersSent = 0
  let escalationsTriggered = 0
  let skipped = 0

  for (const assignment of overdueAssignments) {
    try {
      if (!assignment.dueAt) {
        throw new Error("Assignment is missing a due date")
      }

      const dueDate = new Date(assignment.dueAt)
      if (Number.isNaN(dueDate.getTime())) {
        throw new Error("Assignment has an invalid due date")
      }

      if (dueDate.getTime() > now.getTime()) {
        skipped += 1
        continue
      }

      if (!assignment.assignedMemberId) {
        throw new Error("Assignment is missing an assigned member")
      }

      const hoursOverdue = Math.max(
        0,
        differenceInHours(now, dueDate),
      )

      const history = eventsByAssignment.get(assignment.id)

      if (!history?.reminder) {
        const reminderResult = await notifications.sendReminder(assignment, {
          now,
          hoursOverdue,
        })

        await repository.logEvent({
          assignmentId: assignment.id,
          eventType: CHORE_REMINDER_EVENT,
          householdId: assignment.householdId,
          metadata: {
            assignmentId: assignment.id,
            assignedMemberId: assignment.assignedMemberId,
            status: assignment.status,
            dueAt: assignment.dueAt,
            hoursOverdue,
            triggeredAt: now.toISOString(),
            notification: reminderResult,
          },
        })

        remindersSent += 1
        continue
      }

      const reminderEvent = history.reminder
      const reminderSentAt = new Date(reminderEvent.createdAt)
      const hoursSinceReminder =
        (now.getTime() - reminderSentAt.getTime()) / (1000 * 60 * 60)

      const hasEscalatedSinceReminder = Boolean(
        history.escalation &&
          new Date(history.escalation.createdAt).getTime() >=
            reminderSentAt.getTime(),
      )

      if (
        hoursSinceReminder >= ESCALATION_THRESHOLD_HOURS &&
        !hasEscalatedSinceReminder
      ) {
        const escalationContext: EscalationContext = {
          now,
          hoursOverdue,
          reminderEventId: reminderEvent.id,
          reminderSentAt,
          hoursSinceReminder,
        }

        const householdResult =
          await notifications.postToHouseholdChannel(
            assignment,
            escalationContext,
          )

        const adminAlertResult = await notifications.notifyAdmins(
          assignment,
          escalationContext,
        )

        await repository.logEvent({
          assignmentId: assignment.id,
          eventType: CHORE_ESCALATION_EVENT,
          householdId: assignment.householdId,
          metadata: {
            assignmentId: assignment.id,
            assignedMemberId: assignment.assignedMemberId,
            status: assignment.status,
            dueAt: assignment.dueAt,
            reminderEventId: reminderEvent.id,
            reminderSentAt: reminderEvent.createdAt,
            hoursSinceReminder,
            hoursOverdue,
            triggeredAt: now.toISOString(),
            householdNotification: householdResult,
            adminAlert: adminAlertResult,
          },
        })

        escalationsTriggered += 1
        continue
      }

      skipped += 1
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown job execution error"
      failures.push({ assignmentId: assignment.id, reason })
    }
  }

  return {
    processed,
    remindersSent,
    escalationsTriggered,
    skipped,
    failures,
  }
}

type ServiceClient = SupabaseClient<any>

type ChoreAssignmentRow = {
  id: string
  title?: string | null
  description?: string | null
  status: string
  due_at: string
  household_id: string | null
  assigned_member_id: string
}

type EventRow = {
  id: string
  created_at: string
  event_type: string
  entity_id: string
  entity_type: string
  household_id: string | null
  metadata: Record<string, unknown> | null
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
}

export class SupabaseChoreEscalationRepository
  implements ChoreEscalationRepository
{
  constructor(private readonly client: ServiceClient) {}

  async fetchOverdueAssignments(referenceDate: Date): Promise<ChoreAssignment[]> {
    const { data, error } = await this.client
      .from<ChoreAssignmentRow>("chore_assignments")
      .select(
        "id, title, description, status, due_at, household_id, assigned_member_id",
      )
      .lt("due_at", referenceDate.toISOString())
      .neq("status", "completed")

    if (error) {
      throw new Error(
        `Failed to fetch overdue chore assignments: ${error.message}`,
      )
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? null,
      description: row.description ?? null,
      status: row.status,
      dueAt: row.due_at,
      householdId: row.household_id,
      assignedMemberId: row.assigned_member_id,
    }))
  }

  async fetchEventsForAssignments(
    assignmentIds: string[],
    eventTypes: ChoreEventType[],
  ): Promise<ChoreEvent[]> {
    if (assignmentIds.length === 0) {
      return []
    }

    const { data, error } = await this.client
      .from<EventRow>("events")
      .select(
        "id, created_at, event_type, entity_id, entity_type, household_id, metadata",
      )
      .in("entity_id", assignmentIds)
      .eq("entity_type", "chore_assignment")
      .in("event_type", eventTypes as string[])

    if (error) {
      throw new Error(
        `Failed to load chore escalation history: ${error.message}`,
      )
    }

    return (data ?? [])
      .filter((row) => eventTypes.includes(row.event_type as ChoreEventType))
      .map((row) => ({
        id: row.id,
        assignmentId: row.entity_id,
        eventType: row.event_type as ChoreEventType,
        createdAt: row.created_at,
        metadata: row.metadata ?? null,
        householdId: row.household_id,
      }))
  }

  async logEvent(entry: EventLogEntry): Promise<void> {
    const payload = {
      entity_type: "chore_assignment",
      entity_id: entry.assignmentId,
      event_type: entry.eventType,
      household_id: entry.householdId,
      metadata: entry.metadata,
      created_at: entry.createdAt?.toISOString(),
    }

    const { error } = await this.client.from("events").insert(payload)

    if (error) {
      throw new Error(`Failed to log chore event: ${error.message}`)
    }
  }
}

const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "notifications@sharehouse.local"

export class SupabaseChoreEscalationNotificationService
  implements ChoreEscalationNotificationService
{
  private resend: Resend | null = null

  constructor(private readonly client: ServiceClient) {}

  async sendReminder(
    assignment: ChoreAssignment,
    context: ReminderContext,
  ): Promise<ReminderNotificationResult> {
    const profile = await this.loadMemberProfile(assignment.assignedMemberId)
    if (!profile) {
      throw new Error(
        `Unable to locate profile for member ${assignment.assignedMemberId}`,
      )
    }

    if (!profile.email) {
      throw new Error(
        `Member ${assignment.assignedMemberId} does not have an email configured`,
      )
    }

    const resend = this.getResendClient()
    const subject =
      assignment.title
        ? `Reminder: ${assignment.title} is overdue`
        : "Reminder: Assigned chore is overdue"
    const formattedDue = new Date(assignment.dueAt).toLocaleString()
    const html = `
      <p>Hi ${profile.full_name ?? "there"},</p>
      <p>This is a friendly reminder that the chore <strong>${
        assignment.title ?? "assigned to you"
      }</strong> was due on ${formattedDue} and is now ${
        context.hoursOverdue
      } hour(s) overdue.</p>
      <p>Please update the status once it's complete.</p>
    `
    const text = `The chore ${assignment.title ?? "assigned to you"} was due on ${formattedDue} and is now ${context.hoursOverdue} hour(s) overdue. Please update the status once it's complete.`

    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: profile.email,
      subject,
      html,
      text,
    })

    return {
      memberId: assignment.assignedMemberId,
      channels: ["email"],
    }
  }

  async postToHouseholdChannel(
    assignment: ChoreAssignment,
    context: EscalationContext,
  ): Promise<HouseholdNotificationResult> {
    if (!assignment.householdId) {
      throw new Error(
        `Cannot escalate chore ${assignment.id} without a household id`,
      )
    }

    const message =
      assignment.title
        ? `Heads up! "${assignment.title}" is still incomplete ${Math.floor(
            context.hoursOverdue,
          )} hour(s) after its due date.`
        : `Heads up! A chore assignment is still incomplete ${Math.floor(
            context.hoursOverdue,
          )} hour(s) after its due date.`

    const { data, error } = await this.client
      .from("events")
      .insert({
        event_type: "household.channel_posted",
        entity_type: "household",
        entity_id: assignment.householdId,
        household_id: assignment.householdId,
        metadata: {
          assignmentId: assignment.id,
          reminderEventId: context.reminderEventId,
          message,
          postedAt: context.now.toISOString(),
        },
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(
        `Failed to post to household channel for chore ${assignment.id}: ${error.message}`,
      )
    }

    return {
      channel: "household.events",
      eventId: data?.id ?? null,
      message,
    }
  }

  async notifyAdmins(
    assignment: ChoreAssignment,
    context: EscalationContext,
  ): Promise<AdminAlertResult> {
    const { data: admins, error } = await this.client
      .from<ProfileRow>("profiles")
      .select("id, email, full_name")
      .in("role", ["admin", "property_manager"])
      .not("email", "is", null)

    if (error) {
      throw new Error(
        `Failed to load admin profiles for escalation: ${error.message}`,
      )
    }

    const adminRecipients = (admins ?? []).filter(
      (admin) => Boolean(admin.email),
    )

    if (adminRecipients.length === 0) {
      throw new Error("No admin recipients available for escalation alerts")
    }

    const resend = this.getResendClient()
    const subject =
      assignment.title
        ? `Escalation: ${assignment.title} is still incomplete`
        : "Escalation: Chore assignment is still incomplete"

    const textBody =
      assignment.title
        ? `The chore "${assignment.title}" is still incomplete ${Math.floor(
            context.hoursOverdue,
          )} hour(s) after its due date. Reminder was sent ${Math.floor(
            context.hoursSinceReminder,
          )} hour(s) ago.`
        : `A chore assignment is still incomplete ${Math.floor(
            context.hoursOverdue,
          )} hour(s) after its due date. Reminder was sent ${Math.floor(
            context.hoursSinceReminder,
          )} hour(s) ago.`

    const html = `
      <p>${textBody}</p>
      <p>Assignment ID: ${assignment.id}</p>
      <p>Reminder event: ${context.reminderEventId}</p>
    `

    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: adminRecipients.map((admin) => admin.email!) as string[],
      subject,
      html,
      text: textBody,
    })

    const pushRecipients: string[] = []

    for (const admin of adminRecipients) {
      const { error: pushError } = await this.client
        .from("events")
        .insert({
          event_type: "notification.push_queued",
          entity_type: "profile",
          entity_id: admin.id,
          household_id: assignment.householdId,
          metadata: {
            assignmentId: assignment.id,
            reminderEventId: context.reminderEventId,
            queuedAt: context.now.toISOString(),
          },
        })

      if (pushError) {
        throw new Error(
          `Failed to queue push notification for admin ${admin.id}: ${pushError.message}`,
        )
      }

      pushRecipients.push(admin.id)
    }

    return {
      emailRecipients: adminRecipients.map((admin) => admin.email!) as string[],
      pushRecipients,
    }
  }

  private getResendClient(): Resend {
    if (this.resend) {
      return this.resend
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    this.resend = new Resend(apiKey)
    return this.resend
  }

  private async loadMemberProfile(memberId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.client
      .from<ProfileRow>("profiles")
      .select("id, email, full_name")
      .eq("id", memberId)
      .maybeSingle()

    if (error) {
      throw new Error(
        `Failed to load profile ${memberId} for chore reminder: ${error.message}`,
      )
    }

    return data ?? null
  }
}
