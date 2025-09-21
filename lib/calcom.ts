const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL ?? 'https://api.cal.com/v1'

interface CalApiError {
  message?: string
  errors?: Array<{ message?: string }>
}

export interface CalAvailabilitySlot {
  start: string
  end: string
}

export interface CreateCalBookingPayload {
  eventTypeSlug: string
  startTime: string
  endTime: string
  name: string
  email: string
  metadata?: Record<string, unknown>
  additionalFields?: Record<string, unknown>
}

export interface CalBooking {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  uid?: string
  bookingUrl?: string
  responses?: Record<string, unknown>
}

function requireApiKey(): string {
  const apiKey = process.env.CALCOM_API_KEY
  if (!apiKey) {
    throw new Error('CALCOM_API_KEY environment variable is not configured')
  }
  return apiKey
}

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function parseErrorResponse(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Unexpected response from Cal.com API'
  }

  const error = data as CalApiError
  if (error.message) {
    return error.message
  }

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    const first = error.errors[0]
    if (first?.message) {
      return first.message
    }
  }

  return 'Cal.com API returned an error'
}

export async function fetchCalAvailability(
  eventTypeSlug: string,
  params: { startTime?: string; endTime?: string } = {}
): Promise<CalAvailabilitySlot[]> {
  const apiKey = requireApiKey()
  const query = new URLSearchParams()
  if (params.startTime) query.set('start_time', params.startTime)
  if (params.endTime) query.set('end_time', params.endTime)

  const response = await fetch(
    `${CALCOM_BASE_URL}/event-types/${encodeURIComponent(eventTypeSlug)}/availability?${query.toString()}`,
    {
      method: 'GET',
      headers: buildHeaders(apiKey),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(parseErrorResponse(errorBody ?? {}))
  }

  const data = (await response.json().catch(() => null)) as
    | { slots?: CalAvailabilitySlot[] }
    | null

  if (!data?.slots) {
    return []
  }

  return data.slots
}

export async function createCalBooking(
  payload: CreateCalBookingPayload
): Promise<CalBooking> {
  const apiKey = requireApiKey()

  const response = await fetch(`${CALCOM_BASE_URL}/bookings`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      eventTypeSlug: payload.eventTypeSlug,
      start: payload.startTime,
      end: payload.endTime,
      attendee: {
        name: payload.name,
        email: payload.email,
      },
      metadata: payload.metadata ?? {},
      fields: payload.additionalFields ?? {},
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(parseErrorResponse(errorBody ?? {}))
  }

  const data = (await response.json().catch(() => null)) as
    | {
        booking?: {
          id?: string | number
          status?: string
          uid?: string
          url?: string
          responses?: Record<string, unknown>
        }
      }
    | null

  if (!data?.booking?.id) {
    throw new Error('Cal.com API did not return a booking identifier')
  }

  const bookingId = String(data.booking.id)
  const bookingStatus =
    data.booking.status === 'confirmed'
      ? 'confirmed'
      : data.booking.status === 'cancelled'
        ? 'cancelled'
        : 'pending'

  return {
    id: bookingId,
    status: bookingStatus,
    uid: data.booking.uid,
    bookingUrl: data.booking.url,
    responses: data.booking.responses ?? {},
  }
}
