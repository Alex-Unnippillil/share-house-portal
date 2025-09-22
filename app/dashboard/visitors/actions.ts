'use server'

import { differenceInCalendarDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createSupbaseServerClient } from '@/utils/supaone'
import {
  countActiveVisitorRequests,
  countMonthlyVisitorRequests,
  getHostContext,
  getVisitorLogWithRelations,
  insertVisitorLog,
  logVisitorAuditEvent,
  updateVisitorLog,
} from '@/lib/visitors/repository'
import { formatStayWindow, sendVisitorNotification } from '@/lib/visitor-notifications'
import { type TablesUpdate } from '@/lib/supabase'

export type VisitorActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
}

export const initialVisitorActionState: VisitorActionState = { status: 'idle' }

const requestSchema = z
  .object({
    guestFullName: z.string().min(2, 'Guest name must be at least 2 characters long.'),
    guestEmail: z
      .string()
      .email('Please provide a valid email address.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    arrivalDate: z.coerce.date({ required_error: 'Arrival date is required.' }),
    departureDate: z.coerce.date({ required_error: 'Departure date is required.' }),
    reason: z.string().min(5, 'Please share a short reason for the visit.'),
    expectedGuests: z.coerce
      .number({ invalid_type_error: 'Expected guest count must be a number.' })
      .int()
      .positive('Guest count must be at least 1.')
      .max(10, 'Please contact your manager for parties larger than 10.'),
  })
  .refine((value) => value.departureDate >= value.arrivalDate, {
    message: 'Departure date must be after arrival date.',
    path: ['departureDate'],
  })

const cancellationSchema = z.object({
  logId: z.string().min(1, 'Missing visitor request identifier.'),
  reason: z.string().min(3, 'Please include a short cancellation reason.'),
})

const managerDecisionSchema = z.object({
  logId: z.string().min(1, 'Missing visitor request identifier.'),
  note: z.string().optional(),
})

function mapZodErrors(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {}

  for (const issue of error.issues) {
    if (issue.path.length > 0) {
      const key = String(issue.path[0])
      issues[key] = issue.message
    }
  }

  return issues
}

function toIsoDate(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

export async function submitVisitorRequest(
  prevState: VisitorActionState,
  formData: FormData,
): Promise<VisitorActionState> {
  const parsed = requestSchema.safeParse({
    guestFullName: formData.get('guestFullName'),
    guestEmail: formData.get('guestEmail'),
    arrivalDate: formData.get('arrivalDate'),
    departureDate: formData.get('departureDate'),
    reason: formData.get('reason'),
    expectedGuests: formData.get('expectedGuests'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please correct the highlighted fields.',
      fieldErrors: mapZodErrors(parsed.error),
    }
  }

  const values = parsed.data
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return {
      status: 'error',
      message: 'We were unable to validate your session. Please sign in again.',
    }
  }

  if (!user) {
    return {
      status: 'error',
      message: 'You need to be signed in to request overnight visitors.',
    }
  }

  try {
    const hostContext = await getHostContext(supabase, user.id)

    if (!hostContext || !hostContext.unit) {
      return {
        status: 'error',
        message: 'We could not find your unit assignment. Please contact your property manager.',
      }
    }

    if (!hostContext.rule) {
      return {
        status: 'error',
        message: 'Visitor rules have not been configured for your unit yet. Reach out to your manager for assistance.',
      }
    }

    const { rule, unit, roommates, manager, profile: hostProfile } = hostContext

    const arrival = values.arrivalDate
    const departure = values.departureDate
    const stayLength = differenceInCalendarDays(departure, arrival) + 1

    if (stayLength > rule.max_consecutive_nights) {
      return {
        status: 'error',
        fieldErrors: {
          departureDate: `This stay would be ${stayLength} nights, exceeding the ${rule.max_consecutive_nights}-night limit.`,
        },
      }
    }

    if (rule.max_guests_per_stay && values.expectedGuests > rule.max_guests_per_stay) {
      return {
        status: 'error',
        fieldErrors: {
          expectedGuests: `The maximum guests allowed per stay is ${rule.max_guests_per_stay}.`,
        },
      }
    }

    const leadTimeMs = (rule.lead_time_hours ?? 0) * 60 * 60 * 1000
    if (leadTimeMs > 0 && arrival.getTime() - Date.now() < leadTimeMs) {
      return {
        status: 'error',
        fieldErrors: {
          arrivalDate: `Requests must be submitted at least ${rule.lead_time_hours} hours before arrival.`,
        },
      }
    }

    if (rule.max_visitors_per_month) {
      const monthStart = format(startOfMonth(arrival), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(arrival), 'yyyy-MM-dd')
      const existingCount = await countMonthlyVisitorRequests(supabase, {
        unitId: unit.id,
        hostId: user.id,
        startDate: monthStart,
        endDate: monthEnd,
      })

      if (existingCount >= rule.max_visitors_per_month) {
        return {
          status: 'error',
          message: `You have reached the monthly limit of ${rule.max_visitors_per_month} visitor night(s). Please coordinate with your property manager for an exception.`,
        }
      }
    }

    if (rule.max_active_requests) {
      const activeCount = await countActiveVisitorRequests(supabase, {
        unitId: unit.id,
        hostId: user.id,
      })

      if (activeCount >= rule.max_active_requests) {
        return {
          status: 'error',
          message: `You already have ${activeCount} pending request(s). Please wait for a decision before submitting another.`,
        }
      }
    }

    const isoArrival = toIsoDate(arrival)
    const isoDeparture = toIsoDate(departure)
    const roommateRecipients = roommates.filter((roommate) => roommate.id !== user.id).map((roommate) => roommate.id)

    const inserted = await insertVisitorLog(supabase, {
      unit_id: unit.id,
      rule_id: rule.id,
      host_profile_id: user.id,
      guest_full_name: values.guestFullName,
      guest_email: values.guestEmail ?? null,
      arrival_date: isoArrival,
      departure_date: isoDeparture,
      reason: values.reason,
      expected_guests: values.expectedGuests,
      roommate_recipient_ids: roommateRecipients,
      stay_summary: `${values.guestFullName} staying ${stayLength} night${stayLength === 1 ? '' : 's'}.`,
    })

    const summary = `Request submitted for ${values.guestFullName} (${formatStayWindow(isoArrival, isoDeparture)}).`

    await logVisitorAuditEvent(supabase, {
      log_id: inserted.id,
      event_type: 'submission',
      event_status: 'pending',
      message: summary,
      performed_by: user.id,
    })

    await sendVisitorNotification({
      supabase,
      logId: inserted.id,
      actor: hostProfile,
      host: hostProfile,
      unit,
      rule,
      roommates,
      manager,
      status: 'pending',
      context: 'submission',
      summary,
      notifyManager: true,
      notifyRoommates: true,
    })

    revalidatePath('/dashboard/visitors')

    return {
      status: 'success',
      message: 'Guest stay submitted for approval.',
    }
  } catch (error) {
    console.error('Failed to submit visitor request', error)
    return {
      status: 'error',
      message: 'We were unable to save your request. Please try again shortly.',
    }
  }
}

export async function cancelVisitorRequest(
  prevState: VisitorActionState,
  formData: FormData,
): Promise<VisitorActionState> {
  const parsed = cancellationSchema.safeParse({
    logId: formData.get('logId'),
    reason: formData.get('reason'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please provide a cancellation reason.',
      fieldErrors: mapZodErrors(parsed.error),
    }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'You need to be signed in to cancel a visitor stay.',
    }
  }

  try {
    const log = await getVisitorLogWithRelations(supabase, parsed.data.logId)

    if (!log || log.host_profile_id !== user.id) {
      return {
        status: 'error',
        message: 'We could not locate that visitor request.',
      }
    }

    if (!['pending', 'approved'].includes(log.status)) {
      return {
        status: 'error',
        message: 'Only pending or approved visits can be cancelled.',
      }
    }

    const updates: TablesUpdate<'visitor_logs'> = {
      status: 'cancelled',
      cancellation_reason: parsed.data.reason,
      cancellation_by: user.id,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await updateVisitorLog(supabase, parsed.data.logId, updates)

    const hostContext = await getHostContext(supabase, user.id)

    const summary = `Request cancelled: ${formatStayWindow(log.arrival_date, log.departure_date)}.`

    await logVisitorAuditEvent(supabase, {
      log_id: parsed.data.logId,
      event_type: 'cancellation',
      event_status: 'cancelled',
      message: `${summary} Reason: ${parsed.data.reason}`,
      performed_by: user.id,
    })

    await sendVisitorNotification({
      supabase,
      logId: parsed.data.logId,
      actor: hostContext?.profile ?? { id: user.id, full_name: log.host?.full_name ?? null, email: log.host?.email ?? null },
      host: hostContext?.profile ?? { id: user.id, full_name: log.host?.full_name ?? null, email: log.host?.email ?? null },
      unit: hostContext?.unit ?? log.unit!,
      rule: hostContext?.rule ?? log.rule,
      roommates: hostContext?.roommates ?? [],
      manager: hostContext?.manager ?? (log.unit?.manager_profile_id
        ? { id: log.unit.manager_profile_id, full_name: null, email: null }
        : null),
      status: 'cancelled',
      context: 'cancellation',
      summary,
      note: parsed.data.reason,
      notifyManager: true,
      notifyRoommates: true,
    })

    revalidatePath('/dashboard/visitors')
    revalidatePath('/dashboard/visitors/manage')

    return {
      status: 'success',
      message: 'Visitor stay cancelled.',
    }
  } catch (error) {
    console.error('Failed to cancel visitor request', error)
    return {
      status: 'error',
      message: 'We were unable to cancel this visit. Please try again later.',
    }
  }
}

async function ensureManagerAuthority(
  supabase: Awaited<ReturnType<typeof createSupbaseServerClient>>,
  logId: string,
  actorId: string,
) {
  const [log, actorProfile] = await Promise.all([
    getVisitorLogWithRelations(supabase, logId),
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', actorId)
      .maybeSingle(),
  ])

  if (!log) {
    return { log: null, actor: null as const, message: 'Visitor request not found.' }
  }

  if (!actorProfile.data) {
    return { log: null, actor: null as const, message: 'Your profile could not be loaded.' }
  }

  const actorRole = actorProfile.data.role ?? 'tenant'

  const isAdmin = actorRole === 'admin'
  const managesUnit = log.unit?.manager_profile_id === actorId

  if (!isAdmin && !managesUnit) {
    return { log: null, actor: null as const, message: 'You are not authorised to manage this visit.' }
  }

  return {
    log,
    actor: {
      id: actorProfile.data.id,
      full_name: actorProfile.data.full_name ?? null,
      email: actorProfile.data.email ?? null,
      role: actorRole,
    },
    message: null,
  }
}

export async function approveVisitorRequest(
  prevState: VisitorActionState,
  formData: FormData,
): Promise<VisitorActionState> {
  const parsed = managerDecisionSchema.safeParse({
    logId: formData.get('logId'),
    note: formData.get('note'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please provide the required information.',
      fieldErrors: mapZodErrors(parsed.error),
    }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Only managers can approve visitor requests.',
    }
  }

  try {
    const { log, actor, message } = await ensureManagerAuthority(supabase, parsed.data.logId, user.id)

    if (!log || !actor) {
      return {
        status: 'error',
        message: message ?? 'You are not authorised to approve this visit.',
      }
    }

    if (log.status !== 'pending') {
      return {
        status: 'error',
        message: 'Only pending requests can be approved.',
      }
    }

    await updateVisitorLog(supabase, parsed.data.logId, {
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      denial_reason: null,
      denied_by: null,
      denied_at: null,
      updated_at: new Date().toISOString(),
    })

    const hostContext = await getHostContext(supabase, log.host_profile_id)

    const summary = `Approved visit for ${log.guest_full_name} (${formatStayWindow(log.arrival_date, log.departure_date)}).`

    await logVisitorAuditEvent(supabase, {
      log_id: parsed.data.logId,
      event_type: 'approval',
      event_status: 'approved',
      message: parsed.data.note ? `${summary} Note: ${parsed.data.note}` : summary,
      performed_by: user.id,
    })

    await sendVisitorNotification({
      supabase,
      logId: parsed.data.logId,
      actor,
      host: hostContext?.profile ?? log.host ?? actor,
      unit: hostContext?.unit ?? log.unit!,
      rule: hostContext?.rule ?? log.rule,
      roommates: hostContext?.roommates ?? [],
      manager: hostContext?.manager ?? (log.unit?.manager_profile_id
        ? { id: log.unit.manager_profile_id, full_name: null, email: null }
        : null),
      status: 'approved',
      context: 'approval',
      summary,
      note: parsed.data.note,
      notifyHost: true,
      notifyManager: true,
      notifyRoommates: true,
    })

    revalidatePath('/dashboard/visitors/manage')
    revalidatePath('/dashboard/visitors')

    return {
      status: 'success',
      message: 'Visitor request approved.',
    }
  } catch (error) {
    console.error('Failed to approve visitor request', error)
    return {
      status: 'error',
      message: 'We were unable to approve this request. Please try again later.',
    }
  }
}

export async function denyVisitorRequest(
  prevState: VisitorActionState,
  formData: FormData,
): Promise<VisitorActionState> {
  const parsed = managerDecisionSchema.safeParse({
    logId: formData.get('logId'),
    note: formData.get('note'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please provide the required information.',
      fieldErrors: mapZodErrors(parsed.error),
    }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Only managers can deny visitor requests.',
    }
  }

  try {
    const { log, actor, message } = await ensureManagerAuthority(supabase, parsed.data.logId, user.id)

    if (!log || !actor) {
      return {
        status: 'error',
        message: message ?? 'You are not authorised to deny this visit.',
      }
    }

    if (log.status !== 'pending') {
      return {
        status: 'error',
        message: 'Only pending requests can be denied.',
      }
    }

    await updateVisitorLog(supabase, parsed.data.logId, {
      status: 'denied',
      denied_by: user.id,
      denied_at: new Date().toISOString(),
      denial_reason: parsed.data.note ?? null,
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    })

    const hostContext = await getHostContext(supabase, log.host_profile_id)

    const summary = `Denied visit for ${log.guest_full_name} (${formatStayWindow(log.arrival_date, log.departure_date)}).`

    await logVisitorAuditEvent(supabase, {
      log_id: parsed.data.logId,
      event_type: 'denial',
      event_status: 'denied',
      message: parsed.data.note ? `${summary} Reason: ${parsed.data.note}` : summary,
      performed_by: user.id,
    })

    await sendVisitorNotification({
      supabase,
      logId: parsed.data.logId,
      actor,
      host: hostContext?.profile ?? log.host ?? actor,
      unit: hostContext?.unit ?? log.unit!,
      rule: hostContext?.rule ?? log.rule,
      roommates: hostContext?.roommates ?? [],
      manager: hostContext?.manager ?? (log.unit?.manager_profile_id
        ? { id: log.unit.manager_profile_id, full_name: null, email: null }
        : null),
      status: 'denied',
      context: 'denial',
      summary,
      note: parsed.data.note,
      notifyHost: true,
      notifyManager: true,
      notifyRoommates: true,
    })

    revalidatePath('/dashboard/visitors/manage')
    revalidatePath('/dashboard/visitors')

    return {
      status: 'success',
      message: 'Visitor request denied.',
    }
  } catch (error) {
    console.error('Failed to deny visitor request', error)
    return {
      status: 'error',
      message: 'We were unable to deny this request. Please try again later.',
    }
  }
}
