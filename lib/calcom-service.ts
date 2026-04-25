import { incrementOperationalMetric } from "@/lib/observability/metrics"
import {
  providerOutageMessage,
  resilientRequest,
  UpstreamHttpError,
} from "@/lib/resilience"

interface CalComCreateBookingRequest {
  start: string
  end: string
  title: string
  description?: string
  attendees: Array<{
    email: string
    name?: string
  }>
  location?: string
}

interface CalComBookingResponse {
  success: boolean
  bookingId?: string
  bookingUrl?: string
  error?: string
}

interface CalComEventType {
  id: number
  title: string
  description?: string
  length: number
  slug: string
  hidden: boolean
}

class CalComService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request(path: string, init: RequestInit, operation: string): Promise<Response> {
    const { value: response } = await resilientRequest(
      async () => {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
          },
        })

        if (!response.ok) {
          throw new UpstreamHttpError("calcom", operation, response.status, response.statusText)
        }

        return response
      },
      {
        provider: "calcom",
        operation,
        retries: 2,
        initialDelayMs: 250,
        jitter: true,
        timeoutMs: 6_000,
        shouldRetry: (error) => {
          if (error instanceof UpstreamHttpError) {
            return error.status === 429 || error.status >= 500
          }

          return true
        },
        onCircuitOpen: () => {
          incrementOperationalMetric("upstream_circuit_open_total", {
            source: "calcom_service",
            provider: "calcom",
            operation,
          })
        },
      }
    )

    return response
  }

  async getEventTypes(userSlug?: string): Promise<CalComEventType[]> {
    const endpoint = userSlug
      ? `/api/v1/event-types/${userSlug}`
      : "/api/v1/event-types"

    try {
      const response = await this.request(endpoint, { method: "GET" }, "get_event_types")
      const data = await response.json()
      return data.eventTypes || []
    } catch (error) {
      console.error("Error fetching Cal.com event types:", error)
      return []
    }
  }

  async createBooking(
    eventTypeId: number,
    bookingData: CalComCreateBookingRequest
  ): Promise<CalComBookingResponse> {
    try {
      const response = await this.request(
        "/api/v1/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            eventTypeId,
            start: bookingData.start,
            end: bookingData.end,
            title: bookingData.title,
            description: bookingData.description,
            attendees: bookingData.attendees,
            location: bookingData.location,
          }),
        },
        "create_booking"
      )

      const data = await response.json()

      return {
        success: true,
        bookingId: data.booking?.id?.toString(),
        bookingUrl: data.booking?.url,
      }
    } catch (error) {
      console.error("Error creating Cal.com booking:", error)
      return {
        success: false,
        error: providerOutageMessage("calcom"),
      }
    }
  }

  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const response = await this.request(
        `/api/v1/bookings/${bookingId}/cancel`,
        { method: "POST" },
        "cancel_booking"
      )
      return response.ok
    } catch (error) {
      console.error("Error canceling Cal.com booking:", error)
      return false
    }
  }

  async getBooking(bookingId: string): Promise<any> {
    try {
      const response = await this.request(
        `/api/v1/bookings/${bookingId}`,
        { method: "GET" },
        "get_booking"
      )
      return await response.json()
    } catch (error) {
      console.error("Error fetching Cal.com booking:", error)
      return null
    }
  }

  async getUserBookings(
    userEmail: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      params.append("userEmail", userEmail)

      const response = await this.request(
        `/api/v1/bookings?${params.toString()}`,
        { method: "GET" },
        "get_user_bookings"
      )

      const data = await response.json()
      return data.bookings || []
    } catch (error) {
      console.error("Error fetching Cal.com user bookings:", error)
      return []
    }
  }
}

const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL || "https://api.cal.com"
const CALCOM_API_KEY = process.env.CALCOM_API_KEY || ""

if (!CALCOM_API_KEY) {
  console.warn("CALCOM_API_KEY is not configured")
}

export const calComService = new CalComService(CALCOM_BASE_URL, CALCOM_API_KEY)

export async function createAmenityBooking({
  amenityType,
  startTime,
  endTime,
  userEmail,
  userName,
  description,
}: {
  amenityType: string
  startTime: string
  endTime: string
  userEmail: string
  userName: string
  description?: string
}): Promise<CalComBookingResponse> {
  const eventTypes = await calComService.getEventTypes()

  const amenityEventType = eventTypes.find(
    (et) => et.title.toLowerCase().includes(amenityType.toLowerCase()) && !et.hidden
  )

  if (!amenityEventType) {
    return {
      success: false,
      error: `No booking slot available for ${amenityType}. Please try a different time or contact support.`,
    }
  }

  return await calComService.createBooking(amenityEventType.id, {
    start: startTime,
    end: endTime,
    title: `${amenityType} - ${userName}`,
    description: description || `Booking for ${amenityType} by ${userName} (${userEmail})`,
    attendees: [
      {
        email: userEmail,
        name: userName,
      },
    ],
    location: "Property Amenity",
  })
}

export async function cancelAmenityBooking(bookingId: string): Promise<boolean> {
  return await calComService.cancelBooking(bookingId)
}

export async function getAmenityBookings(
  userEmail: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  return await calComService.getUserBookings(userEmail, startDate, endDate)
}
