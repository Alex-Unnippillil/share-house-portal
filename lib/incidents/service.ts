import { type Incident, type IncidentSeverity, type IncidentStatus, type IncidentUpdate, isCritical } from "./types"
import type { IncidentRepository } from "./repository"

export interface LandlordNotifier {
  notifyCriticalIncident(payload: { incident: Incident; update: IncidentUpdate }): Promise<void>
}

export interface IncidentServiceDependencies {
  repository: IncidentRepository
  landlordNotifier: LandlordNotifier
  clock?: () => Date
}

const DEFAULT_STATUS: IncidentStatus = "open"

const DEFAULT_MESSAGE_TRIM_THRESHOLD = 0

function currentIso(clock?: () => Date) {
  const now = clock ? clock() : new Date()
  return now.toISOString()
}

function normaliseOptional(value: string | null | undefined) {
  if (value === undefined) return undefined
  return value === null || value === "" ? null : value
}

export interface CreateIncidentInput {
  householdId: string
  title: string
  description: string
  severity: IncidentSeverity
  status?: IncidentStatus
  assignedMemberId?: string | null
  reporterId?: string | null
  actorId?: string | null
  message?: string | null
}

export async function createIncident(
  deps: IncidentServiceDependencies,
  input: CreateIncidentInput,
) {
  const { repository, landlordNotifier, clock } = deps
  const nowIso = currentIso(clock)
  const status = input.status ?? DEFAULT_STATUS
  const severity = input.severity
  const shouldNotifyLandlord = isCritical(severity)
  const landlordNotifiedAt = shouldNotifyLandlord ? nowIso : null

  const incident = await repository.createIncident({
    household_id: input.householdId,
    title: input.title,
    description: input.description,
    severity,
    status,
    assigned_member_id: normaliseOptional(input.assignedMemberId) ?? null,
    reported_by: normaliseOptional(input.reporterId) ?? null,
    landlord_notified_at: landlordNotifiedAt,
    created_at: nowIso,
    updated_at: nowIso,
  })

  const message = normaliseMessage(
    input.message ?? input.description ?? `New ${severity} incident reported: ${input.title}`,
  )

  const update = await repository.createIncidentUpdate({
    incident_id: incident.id,
    author_id: normaliseOptional(input.actorId ?? input.reporterId) ?? null,
    message,
    status: incident.status,
    severity: incident.severity,
    created_at: nowIso,
  })

  if (shouldNotifyLandlord) {
    await landlordNotifier.notifyCriticalIncident({ incident, update })
  }

  return { incident, update }
}

export interface UpdateIncidentInput {
  id: string
  status?: IncidentStatus
  severity?: IncidentSeverity
  assignedMemberId?: string | null
  message?: string | null
  actorId?: string | null
}

export async function updateIncident(
  deps: IncidentServiceDependencies,
  input: UpdateIncidentInput,
) {
  const { repository, landlordNotifier, clock } = deps
  const existing = await repository.getIncidentById(input.id)

  if (!existing) {
    throw new Error(`Incident ${input.id} was not found`)
  }

  const nowIso = currentIso(clock)
  const nextStatus: IncidentStatus = input.status ?? existing.status
  const nextSeverity: IncidentSeverity = input.severity ?? existing.severity
  const shouldNotifyLandlord = isCritical(nextSeverity) && !existing.landlord_notified_at

  const changes = {
    updated_at: nowIso,
    ...(input.status !== undefined ? { status: nextStatus } : {}),
    ...(input.severity !== undefined ? { severity: nextSeverity } : {}),
    ...(input.assignedMemberId !== undefined
      ? { assigned_member_id: normaliseOptional(input.assignedMemberId) ?? null }
      : {}),
    ...(shouldNotifyLandlord ? { landlord_notified_at: nowIso } : {}),
  }

  const incident = await repository.updateIncident(input.id, changes)

  const message = normaliseMessage(
    input.message ?? `Status updated to ${incident.status}`,
  )

  const update = await repository.createIncidentUpdate({
    incident_id: incident.id,
    author_id: normaliseOptional(input.actorId) ?? null,
    message,
    status: incident.status,
    severity: incident.severity,
    created_at: nowIso,
  })

  if (shouldNotifyLandlord) {
    await landlordNotifier.notifyCriticalIncident({ incident, update })
  }

  return { incident, update }
}

function normaliseMessage(message: string) {
  const trimmed = message.trim()
  if (trimmed.length <= DEFAULT_MESSAGE_TRIM_THRESHOLD) {
    return "Update posted"
  }
  return trimmed
}
