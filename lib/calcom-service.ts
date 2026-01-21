import { withCoalescing } from '@/lib/fetcher/with-coalescing';

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
  async getEventTypes(userSlug?: string): Promise<CalComEventType[]> {
    const endpoint = userSlug
      ? `${this.baseUrl}/api/v1/event-types/${userSlug}`
      : `${this.baseUrl}/api/v1/event-types`;

    try {
      return await withCoalescing(
        'calcom:getEventTypes',
        { endpoint },
        async () => {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch event types: ${response.statusText}`);
          }

          const data = await response.json();
          return data.eventTypes || [];
        }
      );
    } catch (error) {
      console.error('Error fetching Cal.com event types:', error);
      return [];
    }
  }

  /**
   * Create a booking for an event type
   */
  async createBooking(
    eventTypeId: number,
    bookingData: CalComCreateBookingRequest
  ): Promise<CalComBookingResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/bookings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
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
          errorData.message || `Failed to create booking: ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: true,
        bookingId: data.booking?.id?.toString(),
        bookingUrl: data.booking?.url,
      };
    } catch (error) {
      console.error('Error creating Cal.com booking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking',
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/bookings/${bookingId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error canceling Cal.com booking:', error);
      return false;
    }
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<any> {
    try {
      return await withCoalescing(
        'calcom:getBooking',
        { bookingId },
        async () => {
          const response = await fetch(
            `${this.baseUrl}/api/v1/bookings/${bookingId}`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch booking: ${response.statusText}`);
          }

          return response.json();
        }
      );
    } catch (error) {
      console.error('Error fetching Cal.com booking:', error);
      return null;
    }
  }

  /**
   * Get bookings for a user
   */
  async getUserBookings(
    userEmail: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    try {
      return await withCoalescing(
        'calcom:getUserBookings',
        { userEmail, startDate, endDate },
        async () => {
          const params = new URLSearchParams();
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);

          const response = await fetch(
            `${this.baseUrl}/api/v1/bookings?${params.toString()}`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch user bookings: ${response.statusText}`);
          }

          const data = await response.json();
          return data.bookings || [];
        }
      );
    } catch (error) {
      console.error('Error fetching Cal.com user bookings:', error);
      return [];
    }
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
}): Promise<CalComBookingResponse> {
  // Get available event types for amenities
  const eventTypes = await calComService.getEventTypes();

  // Find the appropriate event type for the amenity
  const amenityEventType = eventTypes.find(
    (et) => et.title.toLowerCase().includes(amenityType.toLowerCase()) && !et.hidden
  );

  if (!amenityEventType) {
    return {
      success: false,
      error: `No booking slot available for ${amenityType}. Please try a different time or contact support.`,
    };
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
    location: 'Property Amenity',
  });
}

export async function cancelAmenityBooking(bookingId: string): Promise<boolean> {
  return await calComService.cancelBooking(bookingId);
}

export async function getAmenityBookings(
  userEmail: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  return await calComService.getUserBookings(userEmail, startDate, endDate);
}
