import { google } from 'googleapis';
import { GaxiosError } from 'gaxios';

import { ExternalApiResult } from '@/lib/circuit-breaker';
import { googleCalendarCircuitBreaker } from '@/lib/external-integrations';

// Configure the Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
  // No redirect URI needed here as we are using a refresh token
);

// Set the credentials using the owner's refresh token
// This allows the server to make API calls on the owner's behalf
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_OWNER_REFRESH_TOKEN,
});

// Create a Google Calendar API client instance
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Define the owner's calendar ID from environment variables
const OWNER_CALENDAR_ID = process.env.GOOGLE_OWNER_CALENDAR_ID || 'primary';

interface CreateEventOptions {
  summary: string;
  description: string;
  startTime: string; // ISO 8601 format (e.g., '2025-05-20T10:00:00-04:00')
  endTime: string; // ISO 8601 format
  attendeeEmail: string; // Email of the user scheduling the meeting
  attendeeName?: string; // Optional name of the user
}

/**
 * Creates an event on the app owner's Google Calendar.
 */
export async function createGoogleCalendarEvent({
  summary,
  description,
  startTime,
  endTime,
  attendeeEmail,
  attendeeName,
}: CreateEventOptions): Promise<ExternalApiResult<{ success: boolean; eventId?: string; link?: string; error?: string }>> {
  console.log(`Attempting to create event for ${attendeeEmail} from ${startTime} to ${endTime}`);

  const result = await googleCalendarCircuitBreaker.execute(
    'create-event',
    async () => {
      const event = {
        summary,
        description,
        start: {
          dateTime: startTime,
        },
        end: {
          dateTime: endTime,
        },
        attendees: [
          { email: attendeeEmail, displayName: attendeeName },
        ],
        sendNotifications: true,
      };

      try {
        const response = await calendar.events.insert({
          calendarId: OWNER_CALENDAR_ID,
          requestBody: event,
        });

        console.log('Google Calendar Event created: %s', response.data.htmlLink);
        return {
          success: true,
          eventId: response.data.id,
          link: response.data.htmlLink,
        };
      } catch (error) {
        const message = mapGoogleCalendarError(error);
        throw new Error(message);
      }
    },
    {
      fallbackValue: {
        success: false,
        error: 'Google Calendar event could not be created. Service unavailable.',
      },
      context: {
        operation: 'createGoogleCalendarEvent',
        summary,
        attendeeEmail,
      },
    }
  );

  if (result.fromCache) {
    const fallbackMessage =
      result.error ||
      'Google Calendar service unavailable. Returning cached event details for reference.';
    return {
      ...result,
      data: {
        success: false,
        eventId: result.data?.eventId,
        link: result.data?.link,
        error: fallbackMessage,
      },
      error: fallbackMessage,
    };
  }

  return result;
}

function mapGoogleCalendarError(error: unknown): string {
  console.error('Error creating Google Calendar event:');
  if (error instanceof GaxiosError) {
    const status = error.response?.status;
    console.error('Gaxios Error:', status, error.response?.data);

    if (status === 401) {
      return 'Authentication error with Google Calendar.';
    }

    if (status === 403) {
      return 'Permission error with Google Calendar.';
    }

    if (status === 400) {
      const message = error.response?.data?.error?.message;
      return `Invalid meeting data: ${message || 'Check input format.'}`;
    }

    const message = error.response?.data?.error?.message;
    return message ? `Google Calendar error: ${message}` : 'Failed to create Google Calendar event.';
  }

  if (error instanceof Error) {
    console.error(error.message);
    return error.message;
  }

  console.error('An unknown error occurred', error);
  return 'Failed to create Google Calendar event.';
}
