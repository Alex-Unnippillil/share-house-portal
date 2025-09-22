import type { SupabaseClient } from '@supabase/supabase-js'

import { cancelCalcomBooking, createCalcomBooking } from '@/lib/calcom'
import type { Database } from '@/lib/supabase'

type SupabaseDatabase = SupabaseClient<Database>

type VisitorRequestsTable = Database['public']['Tables']['visitor_requests']

type VisitorRequestRow = VisitorRequestsTable['Row']

type VisitorRequestStatus = VisitorRequestRow['status']

const APPROVED_STATUS: VisitorRequestStatus = 'approved'
const REVOKED_STATUS: VisitorRequestStatus = 'revoked'

interface BaseOptions {
  fetchImpl?: typeof fetch
  now?: () => Date
}

export interface ApproveVisitorRequestResult {
  bookingId: string
}

export interface RevokeVisitorRequestResult {
  cancelledBookingId?: string
}

const defaultNow = () => new Date()

const fetchVisitorRequest = async (supabase: SupabaseDatabase, id: string) => {
  const { data, error } = await supabase
    .from('visitor_requests')
    .select(
      'id, status, guest_name, guest_email, host_email, starts_at, ends_at, calcom_event_type_id, calcom_booking_id, notes, updated_at',
    )
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to load visitor request ${id}: ${error.message}`)
  }

  if (!data) {
    throw new Error(`Visitor request ${id} was not found`)
  }

  return data
}

const ensureEventSchedulingFields = (request: VisitorRequestRow) => {
  if (!request.calcom_event_type_id) {
    throw new Error('Visitor request is missing a Cal.com event type id')
  }

  if (!request.starts_at || !request.ends_at) {
    throw new Error('Visitor request is missing scheduling information')
  }

  return request
}

const buildAttendees = (request: VisitorRequestRow) => {
  const attendees = [] as { email: string; name?: string }[]

  if (request.host_email) {
    attendees.push({ email: request.host_email, name: 'Host resident' })
  }

  if (request.guest_email) {
    attendees.push({ email: request.guest_email, name: request.guest_name })
  }

  return attendees
}

const updateVisitorRequest = async (
  supabase: SupabaseDatabase,
  id: string,
  patch: VisitorRequestsTable['Update'],
) => {
  const { error } = await supabase.from('visitor_requests').update(patch).eq('id', id)

  if (error) {
    throw new Error(`Failed to update visitor request ${id}: ${error.message}`)
  }
}

export async function approveVisitorRequest(
  supabase: SupabaseDatabase,
  id: string,
  options: BaseOptions = {},
): Promise<ApproveVisitorRequestResult> {
  const now = options.now ?? defaultNow
  const request = await fetchVisitorRequest(supabase, id)

  if (request.calcom_booking_id) {
    if (request.status !== APPROVED_STATUS) {
      await updateVisitorRequest(supabase, id, {
        status: APPROVED_STATUS,
        updated_at: now().toISOString(),
      })
    }

    return { bookingId: request.calcom_booking_id }
  }

  ensureEventSchedulingFields(request)

  const booking = await createCalcomBooking(
    {
      eventTypeId: request.calcom_event_type_id,
      start: request.starts_at,
      end: request.ends_at,
      title: request.notes ? `Guest stay: ${request.notes}` : `Guest stay for ${request.guest_name}`,
      attendees: buildAttendees(request),
      notes: request.notes,
      metadata: { visitorRequestId: request.id },
    },
    options.fetchImpl,
  )

  await updateVisitorRequest(supabase, id, {
    status: APPROVED_STATUS,
    calcom_booking_id: booking.id,
    updated_at: now().toISOString(),
  })

  return { bookingId: booking.id }
}

export async function revokeVisitorRequest(
  supabase: SupabaseDatabase,
  id: string,
  options: BaseOptions = {},
): Promise<RevokeVisitorRequestResult> {
  const now = options.now ?? defaultNow
  const request = await fetchVisitorRequest(supabase, id)
  let cancelledBookingId: string | undefined

  if (request.calcom_booking_id) {
    await cancelCalcomBooking(request.calcom_booking_id, options.fetchImpl)
    cancelledBookingId = request.calcom_booking_id
  }

  await updateVisitorRequest(supabase, id, {
    status: REVOKED_STATUS,
    calcom_booking_id: null,
    updated_at: now().toISOString(),
  })

  return { cancelledBookingId }
}
