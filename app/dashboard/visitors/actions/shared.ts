import { differenceInCalendarDays, parseISO } from 'date-fns'
import { z } from 'zod'

import type {
  ProfileSummary,
  VisitorAuditRow,
  VisitorLogRow,
  VisitorLogWithRelations,
  VisitorRuleRow,
} from '@/types/visitors'
import type { Database } from '@/lib/supabase'

export const visitorRequestFormSchema = z.object({
  visitorName: z
    .string()
    .min(2, { message: 'Visitor name must be at least 2 characters.' })
    .max(120, { message: 'Visitor name must be 120 characters or fewer.' }),
  visitorEmail: z
    .string()
    .email({ message: 'Enter a valid email address.' })
    .max(254, { message: 'Email must be 254 characters or fewer.' })
    .optional()
    .or(z.literal('')),
  arrivalDate: z.string().min(1, { message: 'Arrival date is required.' }),
  departureDate: z.string().min(1, { message: 'Departure date is required.' }),
  reason: z
    .string()
    .min(3, { message: 'Please describe the reason for the visit.' })
    .max(500, { message: 'Reason must be 500 characters or fewer.' }),
  ruleId: z.number().int().positive().optional(),
})

export const cancelVisitorRequestSchema = z.object({
  logId: z.number().int().positive(),
  reason: z
    .string()
    .max(500, { message: 'Cancellation notes must be 500 characters or fewer.' })
    .optional(),
})

export const resolveVisitorRequestSchema = z.object({
  logId: z.number().int().positive(),
  decision: z.enum(['approved', 'denied']),
  notes: z
    .string()
    .max(500, { message: 'Notes must be 500 characters or fewer.' })
    .optional(),
})

export type SubmitVisitorRequestInput = z.infer<typeof visitorRequestFormSchema>
export type CancelVisitorRequestInput = z.infer<typeof cancelVisitorRequestSchema>
export type ResolveVisitorRequestInput = z.infer<typeof resolveVisitorRequestSchema>

export type VisitorActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  issues?: Record<string, string[]>
  logId?: number
}

export const visitorActionInitialState: VisitorActionState = { status: 'idle' }

type VisitorLogInsert = Database['public']['Tables']['visitor_logs']['Insert']
type VisitorLogUpdate = Database['public']['Tables']['visitor_logs']['Update']
type VisitorAuditInsert = Database['public']['Tables']['visitor_log_audits']['Insert']

export interface VisitorNotificationPayload {
  event: 'request_submitted' | 'request_cancelled' | 'status_changed'
  log: VisitorLogRow
  host: ProfileSummary
  rule: VisitorRuleRow | null
  roommates: ProfileSummary[]
  managers: ProfileSummary[]
  actor?: ProfileSummary
  decision?: 'approved' | 'denied'
  cancellationReason?: string | null
}

export type VisitorNotificationHandler = (
  payload: VisitorNotificationPayload,
) => Promise<void>

export interface VisitorRecipientDependencies {
  listRoommates(unitId: string, excludeProfileId?: string): Promise<ProfileSummary[]>
  listManagers(buildingId: string): Promise<ProfileSummary[]>
}

export interface VisitorRequestDependencies extends VisitorRecipientDependencies {
  profile: ProfileSummary
  fetchRule(ruleId?: number | null): Promise<VisitorRuleRow | null>
  insertLog(payload: VisitorLogInsert): Promise<VisitorLogRow>
  createAudit(entry: VisitorAuditInsert): Promise<VisitorAuditRow>
}

export interface CancelVisitorDependencies extends VisitorRecipientDependencies {
  actor: ProfileSummary
  getLog(logId: number): Promise<VisitorLogWithRelations | null>
  updateLog(logId: number, changes: VisitorLogUpdate): Promise<VisitorLogRow>
  createAudit(entry: VisitorAuditInsert): Promise<VisitorAuditRow>
}

export interface ResolveVisitorDependencies extends VisitorRecipientDependencies {
  actor: ProfileSummary
  getLog(logId: number): Promise<VisitorLogWithRelations | null>
  updateLog(logId: number, changes: VisitorLogUpdate): Promise<VisitorLogRow>
  createAudit(entry: VisitorAuditInsert): Promise<VisitorAuditRow>
}

export interface HandlerOptions {
  revalidatePath?: (path: string) => void
  revalidatePaths?: string[]
}

const DEFAULT_REVALIDATE_PATHS = ['/dashboard/visitors', '/dashboard/visitors/manage']

function runRevalidate(options?: HandlerOptions) {
  if (!options?.revalidatePath) {
    return
  }

  const paths = options.revalidatePaths?.length
    ? options.revalidatePaths
    : DEFAULT_REVALIDATE_PATHS

  const unique = Array.from(new Set(paths))
  for (const path of unique) {
    options.revalidatePath(path)
  }
}

function normaliseEmail(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export async function handleCreateVisitorRequest(
  deps: VisitorRequestDependencies,
  input: SubmitVisitorRequestInput,
  notify: VisitorNotificationHandler,
  options?: HandlerOptions,
): Promise<VisitorActionState> {
  const { profile } = deps

  if (!profile.building_id || !profile.unit_id) {
    return {
      status: 'error',
      message: 'Your profile is missing a building or unit assignment. Please contact your property manager.',
    }
  }

  const arrival = parseISO(input.arrivalDate)
  const departure = parseISO(input.departureDate)

  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) {
    return {
      status: 'error',
      message: 'We could not understand the arrival or departure date. Please try again.',
    }
  }

  const diffDays = differenceInCalendarDays(departure, arrival)
  if (diffDays < 0) {
    return {
      status: 'error',
      message: 'Departure must be on or after the arrival date.',
      issues: {
        departureDate: ['Departure must be on or after arrival.'],
      },
    }
  }

  const totalNights = diffDays + 1

  try {
    const rule = await deps.fetchRule(input.ruleId ?? null)
    if (!rule) {
      return {
        status: 'error',
        message: 'No visitor policy is configured for your unit. Please reach out to your property manager.',
      }
    }

    if (
      rule.building_id !== profile.building_id ||
      (rule.unit_id && rule.unit_id !== profile.unit_id)
    ) {
      return {
        status: 'error',
        message: 'The selected visitor policy does not apply to your unit.',
      }
    }

    if (totalNights > rule.max_consecutive_nights) {
      return {
        status: 'error',
        message: `This stay exceeds the ${rule.max_consecutive_nights}-night limit defined by your visitor policy.`,
        issues: {
          departureDate: [
            `Visitor stays are limited to ${rule.max_consecutive_nights} consecutive nights.`,
          ],
        },
      }
    }

    const now = new Date().toISOString()
    const visitorEmail = normaliseEmail(input.visitorEmail)
    const status = rule.require_manager_approval ? 'pending' : 'approved'

    const inserted = await deps.insertLog({
      arrival_date: input.arrivalDate,
      departure_date: input.departureDate,
      building_id: profile.building_id,
      unit_id: profile.unit_id,
      host_profile_id: profile.id,
      visitor_name: input.visitorName.trim(),
      visitor_email: visitorEmail,
      total_nights: totalNights,
      reason: input.reason.trim(),
      status,
      rule_id: rule.id,
      metadata: {
        submission_source: 'dashboard',
        requested_at: now,
      },
      approved_by: status === 'approved' ? profile.id : null,
      approved_at: status === 'approved' ? now : null,
      approval_notes:
        status === 'approved' ? 'Auto-approved per published visitor policy.' : null,
    })

    await deps.createAudit({
      log_id: inserted.id,
      actor_profile_id: profile.id,
      action: 'created',
      notes: input.reason.trim(),
      metadata: {
        total_nights: totalNights,
        rule_id: rule.id,
        status,
      },
    })

    if (status === 'approved') {
      await deps.createAudit({
        log_id: inserted.id,
        actor_profile_id: profile.id,
        action: 'approved',
        notes: 'Automatically approved based on unit policy.',
        metadata: {
          auto_approved: true,
        },
      })
    }

    const [roommates, managers] = await Promise.all([
      deps.listRoommates(profile.unit_id, profile.id),
      deps.listManagers(profile.building_id),
    ])

    try {
      await notify({
        event: 'request_submitted',
        log: inserted,
        host: profile,
        rule,
        roommates,
        managers,
      })

      await deps.createAudit({
        log_id: inserted.id,
        actor_profile_id: profile.id,
        action: 'notification',
        notes: 'Visitor submission notifications dispatched.',
        metadata: {
          event: 'request_submitted',
          recipient_count: roommates.length + managers.length,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await deps.createAudit({
        log_id: inserted.id,
        actor_profile_id: profile.id,
        action: 'notification',
        notes: 'Failed to deliver visitor submission notifications.',
        metadata: {
          event: 'request_submitted',
          error: message,
        },
      })

      return {
        status: 'error',
        message:
          'Guest request saved, but notifications could not be delivered. Please inform your roommates and manager directly.',
        logId: inserted.id,
      }
    }

    runRevalidate(options)

    return {
      status: 'success',
      message: `Guest stay submitted for ${totalNights} night${totalNights > 1 ? 's' : ''}.`,
      logId: inserted.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error creating visitor request.'
    return {
      status: 'error',
      message,
    }
  }
}

export async function handleCancelVisitorRequest(
  deps: CancelVisitorDependencies,
  input: CancelVisitorRequestInput,
  notify: VisitorNotificationHandler,
  options?: HandlerOptions,
): Promise<VisitorActionState> {
  try {
    const log = await deps.getLog(input.logId)
    if (!log) {
      return {
        status: 'error',
        message: 'We could not find that visitor request.',
      }
    }

    if (log.host_profile_id !== deps.actor.id) {
      return {
        status: 'error',
        message: 'Only the host that created this request can cancel it.',
      }
    }

    if (!['pending', 'approved'].includes(log.status)) {
      return {
        status: 'error',
        message: 'Only pending or approved visits can be cancelled.',
      }
    }

    const timestamp = new Date().toISOString()
    const updated = await deps.updateLog(log.id, {
      status: 'cancelled',
      cancelled_by: deps.actor.id,
      cancelled_at: timestamp,
      cancellation_reason: input.reason ?? null,
      updated_at: timestamp,
    })

    await deps.createAudit({
      log_id: log.id,
      actor_profile_id: deps.actor.id,
      action: 'cancelled',
      notes: input.reason ?? null,
      metadata: {
        previous_status: log.status,
      },
    })

    const [roommates, managers] = await Promise.all([
      deps.listRoommates(updated.unit_id, deps.actor.id),
      deps.listManagers(updated.building_id),
    ])

    try {
      await notify({
        event: 'request_cancelled',
        log: updated,
        host: deps.actor,
        rule: log.rule ?? null,
        roommates,
        managers,
        cancellationReason: input.reason ?? null,
      })

      await deps.createAudit({
        log_id: log.id,
        actor_profile_id: deps.actor.id,
        action: 'notification',
        notes: 'Cancellation notifications dispatched.',
        metadata: {
          event: 'request_cancelled',
          recipient_count: roommates.length + managers.length,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await deps.createAudit({
        log_id: log.id,
        actor_profile_id: deps.actor.id,
        action: 'notification',
        notes: 'Failed to dispatch cancellation notifications.',
        metadata: {
          event: 'request_cancelled',
          error: message,
        },
      })

      return {
        status: 'error',
        message:
          'The visit was cancelled, but notifications failed. Please alert your roommates and manager manually.',
        logId: log.id,
      }
    }

    runRevalidate(options)

    return {
      status: 'success',
      message: 'Guest stay cancelled.',
      logId: log.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error cancelling visitor request.'
    return {
      status: 'error',
      message,
    }
  }
}

export async function handleResolveVisitorRequest(
  deps: ResolveVisitorDependencies,
  input: ResolveVisitorRequestInput,
  notify: VisitorNotificationHandler,
  options?: HandlerOptions,
): Promise<VisitorActionState> {
  try {
    const log = await deps.getLog(input.logId)
    if (!log) {
      return {
        status: 'error',
        message: 'Visitor request not found.',
      }
    }

    const actorRole = deps.actor.role ?? ''
    if (!['property_manager', 'admin'].includes(actorRole)) {
      return {
        status: 'error',
        message: 'You do not have permission to update visitor requests.',
      }
    }

    if (
      actorRole === 'property_manager' &&
      deps.actor.building_id &&
      deps.actor.building_id !== log.building_id
    ) {
      return {
        status: 'error',
        message: 'This request belongs to a different building.',
      }
    }

    if (!['pending', 'approved', 'denied'].includes(log.status)) {
      return {
        status: 'error',
        message: 'Only pending or previously reviewed requests can be updated.',
      }
    }

    const newStatus = input.decision === 'approved' ? 'approved' : 'denied'
    const timestamp = new Date().toISOString()

    const updated = await deps.updateLog(log.id, {
      status: newStatus,
      approved_by: deps.actor.id,
      approved_at: timestamp,
      approval_notes: input.notes ?? null,
      updated_at: timestamp,
    })

    await deps.createAudit({
      log_id: log.id,
      actor_profile_id: deps.actor.id,
      action: input.decision,
      notes: input.notes ?? null,
      metadata: {
        previous_status: log.status,
      },
    })

    const hostSummary: ProfileSummary =
      log.host ?? {
        id: log.host_profile_id,
        full_name: null,
        email: null,
        role: null,
        building_id: log.building_id,
        unit_id: log.unit_id,
      }

    const [roommates, managers] = await Promise.all([
      deps.listRoommates(updated.unit_id, log.host_profile_id),
      deps.listManagers(updated.building_id),
    ])

    try {
      await notify({
        event: 'status_changed',
        log: updated,
        host: hostSummary,
        rule: log.rule ?? null,
        roommates,
        managers,
        actor: deps.actor,
        decision: input.decision,
      })

      await deps.createAudit({
        log_id: log.id,
        actor_profile_id: deps.actor.id,
        action: 'notification',
        notes: 'Status update notifications dispatched.',
        metadata: {
          event: 'status_changed',
          decision: input.decision,
          recipient_count:
            roommates.length + managers.length + (hostSummary.email ? 1 : 0),
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await deps.createAudit({
        log_id: log.id,
        actor_profile_id: deps.actor.id,
        action: 'notification',
        notes: 'Failed to dispatch status update notifications.',
        metadata: {
          event: 'status_changed',
          decision: input.decision,
          error: message,
        },
      })

      return {
        status: 'error',
        message:
          'Decision saved, but notifications could not be delivered. Please follow up with the residents manually.',
        logId: log.id,
      }
    }

    runRevalidate(options)

    return {
      status: 'success',
      message:
        input.decision === 'approved'
          ? 'Visitor request approved.'
          : 'Visitor request denied.',
      logId: log.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error updating visitor request.'
    return {
      status: 'error',
      message,
    }
  }
}
