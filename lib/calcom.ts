const DEFAULT_CALCOM_BASE_URL = "https://api.cal.com/v1"

const trimTrailingSlash = (input: string) => input.replace(/\/+$/, "")

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface CalcomAttendee {
  email: string
  name?: string
  timeZone?: string
}

export interface CreateCalcomBookingPayload {
  eventTypeId: number
  start: string
  end: string
  title?: string
  attendees?: CalcomAttendee[]
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface CalcomBookingResponse {
  id: string
  [key: string]: unknown
}

const ensureCalcomConfig = () => {
  const apiKey = process.env.CALCOM_API_KEY

  if (!apiKey) {
    throw new Error("Cal.com API key (CALCOM_API_KEY) is not configured")
  }

  const baseUrl = trimTrailingSlash(process.env.CALCOM_BASE_URL ?? DEFAULT_CALCOM_BASE_URL)

  return { apiKey, baseUrl }
}

const resolveFetch = (fetchImpl?: FetchLike) => fetchImpl ?? fetch

export async function createCalcomBooking(
  payload: CreateCalcomBookingPayload,
  fetchImpl?: FetchLike,
): Promise<CalcomBookingResponse> {
  const { apiKey, baseUrl } = ensureCalcomConfig()
  const fetchFn = resolveFetch(fetchImpl)

  const response = await fetchFn(`${baseUrl}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      eventTypeId: payload.eventTypeId,
      start: payload.start,
      end: payload.end,
      title: payload.title,
      attendees: payload.attendees?.length ? payload.attendees : undefined,
      notes: payload.notes ?? undefined,
      metadata: payload.metadata,
    }),
  })

  if (!response.ok) {
    const errorBody = await safeReadText(response)
    throw new Error(`Failed to create Cal.com booking: ${response.status} ${errorBody}`)
  }

  const json = await safeReadJson(response)
  const booking = (json?.booking as CalcomBookingResponse | undefined) ?? (json as CalcomBookingResponse | undefined)

  if (!booking?.id) {
    throw new Error("Cal.com booking response did not include an id")
  }

  return booking
}

export async function cancelCalcomBooking(
  bookingId: string,
  fetchImpl?: FetchLike,
): Promise<void> {
  const { apiKey, baseUrl } = ensureCalcomConfig()
  const fetchFn = resolveFetch(fetchImpl)

  const response = await fetchFn(`${baseUrl}/bookings/${bookingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const errorBody = await safeReadText(response)
    throw new Error(`Failed to cancel Cal.com booking: ${response.status} ${errorBody}`)
  }
}

async function safeReadJson(response: Response) {
  try {
    return await response.clone().json()
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse Cal.com response JSON: ${error.message}`)
    }

    throw new Error("Failed to parse Cal.com response JSON")
  }
}

async function safeReadText(response: Response) {
  try {
    return await response.clone().text()
  } catch (error) {
    return ""
  }
}
