import { ExternalApiResult } from '@/lib/circuit-breaker';
import { calComCircuitBreaker } from '@/lib/external-integrations';

interface CalComCreateBookingRequest {
  start: string;
  end: string;
  title: string;
  description?: string;
  attendees: Array<{
    email: string;
    name?: string;
  }>;
  location?: string;
}

interface CalComBookingResponse {
  success: boolean;
  bookingId?: string;
  bookingUrl?: string;
  error?: string;
}

interface CalComEventType {
  id: number;
  title: string;
  description?: string;
  length: number;
  slug: string;
  hidden: boolean;
}

class CalComService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get event types for a specific user or team
   */
  async getEventTypes(userSlug?: string): Promise<ExternalApiResult<CalComEventType[]>> {
    const endpoint = userSlug
      ? `${this.baseUrl}/api/v1/event-types/${userSlug}`
      : `${this.baseUrl}/api/v1/event-types`;

    return calComCircuitBreaker.execute(
      userSlug ? `event-types:${userSlug}` : 'event-types',
      async () => {
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(
            `Failed to fetch event types: ${response.status} ${response.statusText} ${errorText}`.trim()
          );
        }

        const data = await response.json();
        return data.eventTypes || [];
      },
      {
        fallbackValue: [],
        context: {
          operation: 'getEventTypes',
          endpoint,
        },
      }
    );
  }

  /**
   * Create a booking for an event type
   */
  async createBooking(
    eventTypeId: number,
    bookingData: CalComCreateBookingRequest
  ): Promise<ExternalApiResult<CalComBookingResponse>> {
    return calComCircuitBreaker.execute(
      `bookings:create:${eventTypeId}`,
      async () => {
        const response = await fetch(
          `${this.baseUrl}/api/v1/bookings`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventTypeId,
              start: bookingData.start,
              end: bookingData.end,
              title: bookingData.title,
              description: bookingData.description,
              attendees: bookingData.attendees,
              location: bookingData.location,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to create booking: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        return {
          success: true,
          bookingId: data.booking?.id?.toString(),
          bookingUrl: data.booking?.url,
        } satisfies CalComBookingResponse;
      },
      {
        cacheResult: false,
        fallbackValue: {
          success: false,
          error: 'Cal.com booking service is currently unavailable. Your request was not processed.',
        },
        context: {
          operation: 'createBooking',
          eventTypeId,
        },
      }
    );
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<ExternalApiResult<boolean>> {
    return calComCircuitBreaker.execute(
      `bookings:cancel:${bookingId}`,
      async () => {
        const response = await fetch(
          `${this.baseUrl}/api/v1/bookings/${bookingId}/cancel`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to cancel booking: ${response.status} ${errorText}`.trim());
        }

        return true;
      },
      {
        cacheResult: false,
        fallbackValue: false,
        context: {
          operation: 'cancelBooking',
          bookingId,
        },
      }
    );
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<ExternalApiResult<any>> {
    return calComCircuitBreaker.execute(
      `bookings:get:${bookingId}`,
      async () => {
        const response = await fetch(
          `${this.baseUrl}/api/v1/bookings/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to fetch booking: ${response.status} ${errorText}`.trim());
        }

        return await response.json();
      },
      {
        fallbackValue: null,
        context: {
          operation: 'getBooking',
          bookingId,
        },
      }
    );
  }

  /**
   * Get bookings for a user
   */
  async getUserBookings(
    userEmail: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExternalApiResult<any[]>> {
    return calComCircuitBreaker.execute(
      `bookings:list:${userEmail}`,
      async () => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(
          `${this.baseUrl}/api/v1/bookings?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to fetch user bookings: ${response.status} ${errorText}`.trim());
        }

        const data = await response.json();
        return data.bookings || [];
      },
      {
        fallbackValue: [],
        context: {
          operation: 'getUserBookings',
          userEmail,
          startDate,
          endDate,
        },
      }
    );
  }
}

// Create singleton instance
const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL || 'https://api.cal.com';
const CALCOM_API_KEY = process.env.CALCOM_API_KEY || '';

if (!CALCOM_API_KEY) {
  console.warn('CALCOM_API_KEY is not configured');
}

export const calComService = new CalComService(CALCOM_BASE_URL, CALCOM_API_KEY);

// Amenity-specific booking functions
export async function createAmenityBooking({
  amenityType,
  startTime,
  endTime,
  userEmail,
  userName,
  description,
}: {
  amenityType: string;
  startTime: string;
  endTime: string;
  userEmail: string;
  userName: string;
  description?: string;
}): Promise<ExternalApiResult<CalComBookingResponse>> {
  const eventTypesResult = await calComService.getEventTypes();
  const eventTypes = eventTypesResult.data;

  const amenityEventType = eventTypes.find(
    (et) => et.title.toLowerCase().includes(amenityType.toLowerCase()) && !et.hidden
  );

  if (!amenityEventType) {
    return {
      data: {
        success: false,
        error: `No booking slot available for ${amenityType}. Please try a different time or contact support.`,
      },
      fromCache: eventTypesResult.fromCache,
      breakerState: eventTypesResult.breakerState,
      error:
        eventTypesResult.error ||
        `Unable to determine event type for ${amenityType}.`,
      metadata: {
        eventTypes: eventTypesResult.metadata,
      },
    };
  }

  const bookingResult = await calComService.createBooking(amenityEventType.id, {
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
    location: 'Property Amenity',
  });

  return {
    data: bookingResult.data,
    fromCache: bookingResult.fromCache || eventTypesResult.fromCache,
    breakerState: bookingResult.breakerState,
    error: bookingResult.error ?? eventTypesResult.error,
    metadata: {
      ...(bookingResult.metadata ?? {}),
      eventTypes: eventTypesResult.metadata,
    },
  };
}

export async function cancelAmenityBooking(bookingId: string): Promise<ExternalApiResult<boolean>> {
  return await calComService.cancelBooking(bookingId);
}

export async function getAmenityBookings(
  userEmail: string,
  startDate?: string,
  endDate?: string
): Promise<ExternalApiResult<any[]>> {
  return await calComService.getUserBookings(userEmail, startDate, endDate);
}
