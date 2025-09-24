import {
  MAINTENANCE_STATUS_ORDER,
  type MaintenanceStatus,
  type MaintenanceStatusEvent,
  type MaintenanceStatusProof,
} from './types'

export const ALLOWED_STATUS_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pending: ['triaged', 'cancelled'],
  triaged: ['awaiting_vendor', 'scheduled', 'in_progress', 'cancelled'],
  awaiting_vendor: ['scheduled', 'in_progress', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export interface MaintenanceStatusLoggerOptions {
  persist?: (event: MaintenanceStatusEvent) => Promise<void> | void
  clock?: () => Date
}

export interface StatusTransitionInput {
  requestId: string
  from: MaintenanceStatus
  to: MaintenanceStatus
  actorId: string
  proof: MaintenanceStatusProof
  metadata?: Record<string, unknown>
}

const hasProofEvidence = (proof: MaintenanceStatusProof) => {
  const hasNotes = Boolean(proof.notes && proof.notes.trim().length > 0)
  const hasAttachments = Array.isArray(proof.attachments) && proof.attachments.length > 0
  return hasNotes || hasAttachments
}

export class MaintenanceStatusLogger {
  private readonly events: MaintenanceStatusEvent[] = []

  constructor(private readonly options: MaintenanceStatusLoggerOptions = {}) {}

  get history(): MaintenanceStatusEvent[] {
    return [...this.events]
  }

  get lastEvent(): MaintenanceStatusEvent | undefined {
    return this.events.at(-1)
  }

  async logTransition(input: StatusTransitionInput) {
    if (!ALLOWED_STATUS_TRANSITIONS[input.from]?.includes(input.to)) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[input.from] ?? []
      throw new Error(
        `Invalid maintenance status transition from "${input.from}" to "${input.to}". Allowed: ${allowed.join(', ') || 'none'}.`,
      )
    }

    if (!input.proof) {
      throw new Error('Maintenance status transitions must include proof metadata.')
    }

    if (!hasProofEvidence(input.proof)) {
      throw new Error('Proof must include notes or at least one attachment.')
    }

    if (!input.proof.captured_at) {
      throw new Error('Proof must include captured_at timestamp.')
    }

    const proofTimestamp = new Date(input.proof.captured_at)
    if (!Number.isFinite(proofTimestamp.getTime())) {
      throw new Error('Proof captured_at must be a valid ISO timestamp.')
    }

    const clock = this.options.clock ?? (() => new Date())
    const changedAt = clock().toISOString()

    const event: MaintenanceStatusEvent = {
      request_id: input.requestId,
      previous_status: input.from,
      next_status: input.to,
      changed_at: changedAt,
      changed_by: input.actorId,
      proof: {
        ...input.proof,
        attachments: input.proof.attachments ?? [],
      },
      metadata: input.metadata,
    }

    this.events.push(event)

    if (this.options.persist) {
      await this.options.persist(event)
    }

    return event
  }
}

export const isStatusSequenceForward = (
  previous: MaintenanceStatus,
  next: MaintenanceStatus,
): boolean => {
  const previousIndex = MAINTENANCE_STATUS_ORDER.indexOf(previous)
  const nextIndex = MAINTENANCE_STATUS_ORDER.indexOf(next)
  if (previousIndex === -1 || nextIndex === -1) {
    return false
  }
  return nextIndex >= previousIndex
}
