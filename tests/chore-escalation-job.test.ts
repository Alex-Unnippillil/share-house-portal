import { describe, expect, it } from "vitest"

import {
  CHORE_ESCALATION_EVENT,
  CHORE_REMINDER_EVENT,
  type AdminAlertResult,
  type ChoreAssignment,
  type ChoreEscalationNotificationService,
  type ChoreEscalationRepository,
  type ChoreEvent,
  type ChoreEventType,
  type EventLogEntry,
  type EscalationContext,
  type HouseholdNotificationResult,
  type ReminderContext,
  type ReminderNotificationResult,
  runChoreEscalationJob,
} from "@/lib/jobs/chore-escalation"

class TestRepository implements ChoreEscalationRepository {
  public loggedEvents: EventLogEntry[] = []

  constructor(
    private readonly assignments: ChoreAssignment[],
    private readonly events: ChoreEvent[] = [],
  ) {}

  async fetchOverdueAssignments(_referenceDate: Date): Promise<ChoreAssignment[]> {
    return this.assignments
  }

  async fetchEventsForAssignments(
    _assignmentIds: string[],
    _eventTypes: ChoreEventType[],
  ): Promise<ChoreEvent[]> {
    return this.events
  }

  async logEvent(entry: EventLogEntry): Promise<void> {
    this.loggedEvents.push(entry)
  }
}

class TestNotifications implements ChoreEscalationNotificationService {
  public reminders: Array<{ assignment: ChoreAssignment; context: ReminderContext }> = []
  public householdPosts: Array<{ assignment: ChoreAssignment; context: EscalationContext }> = []
  public adminAlerts: Array<{ assignment: ChoreAssignment; context: EscalationContext }> = []

  async sendReminder(
    assignment: ChoreAssignment,
    context: ReminderContext,
  ): Promise<ReminderNotificationResult> {
    this.reminders.push({ assignment, context })
    return {
      memberId: assignment.assignedMemberId,
      channels: ["email"],
    }
  }

  async postToHouseholdChannel(
    assignment: ChoreAssignment,
    context: EscalationContext,
  ): Promise<HouseholdNotificationResult> {
    this.householdPosts.push({ assignment, context })
    return {
      channel: "household.events",
      eventId: "event-1",
      message: "posted",
    }
  }

  async notifyAdmins(
    assignment: ChoreAssignment,
    context: EscalationContext,
  ): Promise<AdminAlertResult> {
    this.adminAlerts.push({ assignment, context })
    return {
      emailRecipients: ["admin@example.com"],
      pushRecipients: ["admin-profile"],
    }
  }
}

const baseAssignment: ChoreAssignment = {
  id: "assignment-1",
  title: "Take out recycling",
  description: null,
  status: "pending",
  dueAt: "2024-06-01T08:00:00.000Z",
  householdId: "household-1",
  assignedMemberId: "member-1",
}

function reminderEvent(createdAt: string): ChoreEvent {
  return {
    id: "event-reminder",
    assignmentId: baseAssignment.id,
    eventType: CHORE_REMINDER_EVENT,
    createdAt,
    metadata: null,
    householdId: baseAssignment.householdId,
  }
}

function escalationEvent(createdAt: string): ChoreEvent {
  return {
    id: "event-escalation",
    assignmentId: baseAssignment.id,
    eventType: CHORE_ESCALATION_EVENT,
    createdAt,
    metadata: null,
    householdId: baseAssignment.householdId,
  }
}

describe("runChoreEscalationJob", () => {
  it("sends reminders for overdue assignments without history", async () => {
    const repository = new TestRepository([baseAssignment])
    const notifications = new TestNotifications()

    const now = new Date("2024-06-02T10:00:00.000Z")
    const result = await runChoreEscalationJob({
      repository,
      notifications,
      now,
    })

    expect(result.processed).toBe(1)
    expect(result.remindersSent).toBe(1)
    expect(result.escalationsTriggered).toBe(0)
    expect(result.failures).toHaveLength(0)
    expect(repository.loggedEvents).toHaveLength(1)
    expect(repository.loggedEvents[0]?.eventType).toBe(CHORE_REMINDER_EVENT)
    expect(notifications.reminders).toHaveLength(1)
  })

  it("escalates when reminder is stale", async () => {
    const repository = new TestRepository([
      baseAssignment,
    ], [reminderEvent("2024-06-01T08:00:00.000Z")])
    const notifications = new TestNotifications()

    const now = new Date("2024-06-02T12:30:00.000Z")
    const result = await runChoreEscalationJob({
      repository,
      notifications,
      now,
    })

    expect(result.remindersSent).toBe(0)
    expect(result.escalationsTriggered).toBe(1)
    expect(repository.loggedEvents).toHaveLength(1)
    expect(repository.loggedEvents[0]?.eventType).toBe(CHORE_ESCALATION_EVENT)
    expect(notifications.householdPosts).toHaveLength(1)
    expect(notifications.adminAlerts).toHaveLength(1)
  })

  it("does not escalate before the 24 hour threshold", async () => {
    const repository = new TestRepository([
      baseAssignment,
    ], [reminderEvent("2024-06-02T00:00:00.000Z")])
    const notifications = new TestNotifications()

    const now = new Date("2024-06-02T20:00:00.000Z")
    const result = await runChoreEscalationJob({
      repository,
      notifications,
      now,
    })

    expect(result.escalationsTriggered).toBe(0)
    expect(result.skipped).toBe(1)
    expect(repository.loggedEvents).toHaveLength(0)
  })

  it("does not escalate twice for the same reminder", async () => {
    const repository = new TestRepository([
      baseAssignment,
    ], [
      reminderEvent("2024-05-30T08:00:00.000Z"),
      escalationEvent("2024-05-31T09:00:00.000Z"),
    ])
    const notifications = new TestNotifications()

    const now = new Date("2024-06-02T10:00:00.000Z")
    const result = await runChoreEscalationJob({
      repository,
      notifications,
      now,
    })

    expect(result.escalationsTriggered).toBe(0)
    expect(result.skipped).toBe(1)
    expect(repository.loggedEvents).toHaveLength(0)
  })

  it("records failures and continues processing other assignments", async () => {
    const failingRepository = new TestRepository([
      baseAssignment,
      { ...baseAssignment, id: "assignment-2" },
    ])

    class FailingNotifications extends TestNotifications {
      override async sendReminder(
        _assignment: ChoreAssignment,
        _context: ReminderContext,
      ): Promise<ReminderNotificationResult> {
        throw new Error("inbox full")
      }
    }

    const notifications = new FailingNotifications()
    const now = new Date("2024-06-02T10:00:00.000Z")
    const result = await runChoreEscalationJob({
      repository: failingRepository,
      notifications,
      now,
    })

    expect(result.failures).toHaveLength(2)
    expect(result.remindersSent).toBe(0)
    expect(failingRepository.loggedEvents).toHaveLength(0)
  })
})
