import { randomUUID } from "crypto"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { createIncident, updateIncident } from "@/lib/incidents/service"
import type {
  CreateIncidentRecord,
  CreateIncidentUpdateRecord,
  IncidentRepository,
  UpdateIncidentChanges,
} from "@/lib/incidents/repository"
import type { Incident, IncidentUpdate, IncidentSeverity, IncidentStatus } from "@/lib/incidents/types"

class InMemoryIncidentRepository implements IncidentRepository {
  incidents = new Map<string, Incident>()
  updates: IncidentUpdate[] = []

  async createIncident(record: CreateIncidentRecord): Promise<Incident> {
    const id = randomUUID()
    const incident: Incident = {
      id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      household_id: record.household_id,
      title: record.title,
      description: record.description,
      severity: record.severity,
      assigned_member_id: record.assigned_member_id,
      status: record.status,
      reported_by: record.reported_by,
      landlord_notified_at: record.landlord_notified_at,
    }

    this.incidents.set(id, incident)
    return incident
  }

  async getIncidentById(id: string): Promise<Incident | null> {
    return this.incidents.get(id) ?? null
  }

  async updateIncident(id: string, changes: UpdateIncidentChanges): Promise<Incident> {
    const existing = this.incidents.get(id)
    if (!existing) {
      throw new Error("Incident not found")
    }

    const updated: Incident = {
      ...existing,
      ...changes,
      severity: (changes.severity ?? existing.severity) as IncidentSeverity,
      status: (changes.status ?? existing.status) as IncidentStatus,
      assigned_member_id:
        changes.assigned_member_id !== undefined
          ? changes.assigned_member_id
          : existing.assigned_member_id,
      landlord_notified_at:
        changes.landlord_notified_at !== undefined
          ? changes.landlord_notified_at
          : existing.landlord_notified_at,
      updated_at: changes.updated_at,
    }

    this.incidents.set(id, updated)
    return updated
  }

  async createIncidentUpdate(record: CreateIncidentUpdateRecord): Promise<IncidentUpdate> {
    const update: IncidentUpdate = {
      id: randomUUID(),
      incident_id: record.incident_id,
      message: record.message,
      author_id: record.author_id,
      status: record.status,
      severity: record.severity,
      created_at: record.created_at,
    }

    this.updates.push(update)
    return update
  }
}

describe("incident service", () => {
  let repository: InMemoryIncidentRepository
  let notifier: { notifyCriticalIncident: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    repository = new InMemoryIncidentRepository()
    notifier = { notifyCriticalIncident: vi.fn().mockResolvedValue(undefined) }
  })

  it("escalates critical incidents on creation", async () => {
    const { incident } = await createIncident(
      { repository, landlordNotifier: notifier },
      {
        householdId: "household-1",
        title: "Gas leak",
        description: "Strong smell coming from the kitchen",
        severity: "critical",
        reporterId: "user-1",
      },
    )

    expect(notifier.notifyCriticalIncident).toHaveBeenCalledTimes(1)
    expect(repository.updates).toHaveLength(1)
    expect(repository.updates[0]?.message).toBe("Strong smell coming from the kitchen")
    expect(incident.landlord_notified_at).not.toBeNull()
  })

  it("does not escalate non-critical incidents", async () => {
    await createIncident(
      { repository, landlordNotifier: notifier },
      {
        householdId: "household-1",
        title: "Light flickering",
        description: "Living room light flickers occasionally",
        severity: "low",
      },
    )

    expect(notifier.notifyCriticalIncident).not.toHaveBeenCalled()
    expect(repository.updates).toHaveLength(1)
  })

  it("escalates when a case is upgraded to critical", async () => {
    const { incident } = await createIncident(
      { repository, landlordNotifier: notifier },
      {
        householdId: "household-2",
        title: "Water leak",
        description: "Slow drip from ceiling",
        severity: "medium",
      },
    )

    notifier.notifyCriticalIncident.mockClear()

    const result = await updateIncident(
      { repository, landlordNotifier: notifier },
      {
        id: incident.id,
        severity: "critical",
        message: "Escalating leak after ceiling damage",
      },
    )

    expect(notifier.notifyCriticalIncident).toHaveBeenCalledTimes(1)
    expect(repository.updates.at(-1)?.message).toBe("Escalating leak after ceiling damage")
    expect(result.incident.landlord_notified_at).not.toBeNull()
  })

  it("avoids duplicate landlord notifications once escalated", async () => {
    const { incident } = await createIncident(
      { repository, landlordNotifier: notifier },
      {
        householdId: "household-3",
        title: "Carbon monoxide alarm",
        description: "Detector briefly triggered",
        severity: "critical",
      },
    )

    notifier.notifyCriticalIncident.mockClear()

    await updateIncident(
      { repository, landlordNotifier: notifier },
      {
        id: incident.id,
        status: "in_progress",
        message: "Maintenance dispatched",
      },
    )

    expect(notifier.notifyCriticalIncident).not.toHaveBeenCalled()
    expect(repository.updates.at(-1)?.message).toBe("Maintenance dispatched")
  })
})
