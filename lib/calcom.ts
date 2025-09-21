interface CalcomBookingResponse {
  uid?: string
  startTime?: string
  start_time?: string
  endTime?: string
  end_time?: string
  status?: string
  eventTypeId?: number
  event_type_id?: number
  eventType?: { id?: number | string }
  booking?: CalcomBookingResponse
}

export interface RemoteCalBooking {
  uid: string
  startTime: string | null
  endTime: string | null
  status: string | null
  eventTypeId: number | null
}

function getCalApiConfig() {
  const baseUrl = process.env.CALCOM_BASE_URL?.replace(/\/$/, "")
  const apiKey = process.env.CALCOM_API_KEY
  if (!baseUrl || !apiKey) {
    return null
  }
  return { baseUrl, apiKey }
}

export async function fetchCalcomBooking(uid: string): Promise<RemoteCalBooking | null> {
  const config = getCalApiConfig()
  if (!config) {
    return null
  }

  const url = `${config.baseUrl}/api/v1/bookings/${encodeURIComponent(uid)}`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    console.error("Failed to fetch Cal.com booking", response.status, message)
    return null
  }

  const payload = (await response.json()) as CalcomBookingResponse
  const details = payload.booking ?? payload
  const eventTypeIdRaw =
    details.eventTypeId ?? details.event_type_id ?? details.eventType?.id
  const eventTypeId =
    typeof eventTypeIdRaw === "string"
      ? Number.parseInt(eventTypeIdRaw, 10)
      : eventTypeIdRaw ?? null

  return {
    uid: details.uid ?? uid,
    startTime: details.startTime ?? details.start_time ?? null,
    endTime: details.endTime ?? details.end_time ?? null,
    status: details.status ?? null,
    eventTypeId: Number.isFinite(eventTypeId as number)
      ? (eventTypeId as number)
      : null,
  }
}
