import { google } from 'googleapis';
import { GaxiosError } from 'gaxios'; // Part of googleapis

import { getLogger } from '@/lib/logger';

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
  endTime: string;   // ISO 8601 format
  attendeeEmail: string; // Email of the user scheduling the meeting
  attendeeName?: string; // Optional name of the user
}

const log = getLogger({ module: 'calendar-service' });

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
}: CreateEventOptions) {
  log.info(
    { attendeeEmail, startTime, endTime },
    'Attempting to create Google Calendar event'
  );

  try {
    const event = {
      summary: summary,
      description: description,
      start: {
        dateTime: startTime,
        // Optional: Specify the time zone, otherwise it uses calendar's default
        // timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime,
        // timeZone: 'America/New_York',
      },
      // Add the user who scheduled the meeting as an attendee
      attendees: [
        { email: attendeeEmail, displayName: attendeeName },
        // Optionally add the owner explicitly if needed, though they are the organizer
        // { email: OWNER_CALENDAR_ID } // Only if OWNER_CALENDAR_ID is an email
      ],
      // Send notifications to attendees
      sendNotifications: true,
      // Optional: Add conference data (e.g., Google Meet link)
      // conferenceData: {
      //   createRequest: {
      //     requestId: `meet-${Date.now()}`, // Unique request ID
      //     conferenceSolutionKey: { type: 'hangoutsMeet' },
      //   },
      // },
    };

    const response = await calendar.events.insert({
      calendarId: OWNER_CALENDAR_ID,
      requestBody: event,
      // conferenceDataVersion: 1, // Required if adding conferenceData
    });

    log.info(
      { eventId: response.data.id, htmlLink: response.data.htmlLink },
      'Google Calendar event created'
    );
    return { success: true, eventId: response.data.id, link: response.data.htmlLink };

  } catch (error: unknown) {
    if (error instanceof GaxiosError) {
      log.error(
        {
          status: error.response?.status,
          data: error.response?.data,
        },
        'Error creating Google Calendar event via Google API'
      );

      if (error.response?.status === 401) {
        log.error('Authentication error with Google Calendar credentials');
        return { success: false, error: 'Authentication error with Google Calendar.' };
      }

      if (error.response?.status === 403) {
        log.error('Permission error accessing Google Calendar API');
        return { success: false, error: 'Permission error with Google Calendar.' };
      }

      if (error.response?.status === 400) {
        log.error(
          { details: error.response?.data?.error?.errors },
          'Bad request when creating Google Calendar event'
        );
        return {
          success: false,
          error: `Invalid meeting data: ${
            error.response?.data?.error?.message || 'Check input format.'
          }`,
        };
      }
    } else if (error instanceof Error) {
      log.error({ err: error }, 'Error creating Google Calendar event');
    } else {
      log.error({ error }, 'Unknown error creating Google Calendar event');
    }

    return { success: false, error: 'Failed to create Google Calendar event.' };
  }
}