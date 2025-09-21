import { z } from "zod";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "conflict";

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export interface BookingTimeSpan {
  id?: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

const bookingObjectSchema = z
  .object({
    uid: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    eventTypeId: z.union([z.string(), z.number()]).optional(),
    event_type_id: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    allBookings: z
      .array(
        z.object({
          startTime: z.string(),
          endTime: z.string(),
        }),
      )
      .optional(),
  })
  .passthrough();

const attendeeSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().optional(),
  })
  .passthrough();

const webhookBodySchema = z
  .object({
    type: z.string().optional(),
    triggerEvent: z.string().optional(),
    event: z.string().optional(),
    payload: z
      .object({
        booking: bookingObjectSchema.optional(),
        attendee: attendeeSchema.optional(),
        attendees: z.array(attendeeSchema).optional(),
      })
      .partial()
      .optional(),
    data: z
      .object({
        booking: bookingObjectSchema.optional(),
        attendee: attendeeSchema.optional(),
        attendees: z.array(attendeeSchema).optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export type WebhookBody = z.infer<typeof webhookBodySchema>;

export interface NormalisedWebhookBooking {
  eventId: string;
  eventTypeId?: string;
  startTime: string | null;
  endTime: string | null;
  status: BookingStatus;
  attendeeEmail?: string;
  rawStatus?: string;
}

export function normaliseCalEventId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const result = String(value).trim();
  return result.length > 0 ? result : null;
}

function parseDate(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

export function bookingsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const start = parseDate(startA);
  const end = parseDate(endA);
  const otherStart = parseDate(startB);
  const otherEnd = parseDate(endB);

  if ([start, end, otherStart, otherEnd].some((value) => Number.isNaN(value))) {
    return false;
  }

  return start < otherEnd && end > otherStart;
}

export function hasBookingConflict(existing: BookingTimeSpan[], start: string, end: string): boolean {
  return existing.some((booking) => {
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      return false;
    }

    return bookingsOverlap(booking.start_time, booking.end_time, start, end);
  });
}

export function collectConflictingBookingIds(existing: BookingTimeSpan[], start: string, end: string): string[] {
  return existing
    .filter((booking) => booking.id && ACTIVE_BOOKING_STATUSES.includes(booking.status) && bookingsOverlap(booking.start_time, booking.end_time, start, end))
    .map((booking) => booking.id!)
    .filter((id, index, array) => array.indexOf(id) === index);
}

function pickFirstNonEmpty<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      if (typeof value === "string" && value.trim().length === 0) {
        continue;
      }
      return value;
    }
  }
  return undefined;
}

export function deriveStatusFromTrigger(trigger: string | undefined, bookingStatus?: string | null): BookingStatus {
  const hint = trigger?.toLowerCase();
  if (hint && hint.includes("cancel")) {
    return "cancelled";
  }
  if (hint && hint.includes("reschedule")) {
    return "pending";
  }

  const normalised = bookingStatus?.toLowerCase();
  if (normalised === "cancelled") {
    return "cancelled";
  }
  if (normalised === "pending" || normalised === "awaiting" || normalised === "requires_action") {
    return "pending";
  }

  return "confirmed";
}

export function normaliseBookingTimes(booking: z.infer<typeof bookingObjectSchema>): {
  startTime: string | null;
  endTime: string | null;
} {
  const directStart = pickFirstNonEmpty(booking.startTime, booking.start_time);
  const directEnd = pickFirstNonEmpty(booking.endTime, booking.end_time);

  if (directStart && directEnd) {
    return { startTime: directStart, endTime: directEnd };
  }

  const recurring = booking.allBookings?.[0];
  if (recurring) {
    return { startTime: recurring.startTime, endTime: recurring.endTime };
  }

  return { startTime: null, endTime: null };
}

export function extractBookingObject(body: WebhookBody): z.infer<typeof bookingObjectSchema> | null {
  return body.payload?.booking ?? body.data?.booking ?? null;
}

export function extractAttendeeEmail(body: WebhookBody): string | undefined {
  const attendees = body.payload?.attendees ?? body.data?.attendees ?? [];
  const attendee = body.payload?.attendee ?? body.data?.attendee;
  const candidateEmails = [attendee?.email, ...(attendees ?? []).map((item) => item.email)];
  return candidateEmails.find((email): email is string => typeof email === "string" && email.length > 0);
}

export function mapWebhookPayload(body: unknown): NormalisedWebhookBooking | null {
  const result = webhookBodySchema.safeParse(body);
  if (!result.success) {
    console.warn("Received unexpected Cal.com webhook payload", result.error.flatten());
    return null;
  }

  const booking = extractBookingObject(result.data);
  if (!booking) {
    return null;
  }

  const eventId = normaliseCalEventId(pickFirstNonEmpty(booking.uid, booking.id));
  if (!eventId) {
    return null;
  }

  const { startTime, endTime } = normaliseBookingTimes(booking);
  const status = deriveStatusFromTrigger(result.data.type ?? result.data.triggerEvent ?? result.data.event, booking.status);

  const eventTypeIdRaw = pickFirstNonEmpty(booking.eventTypeId, booking.event_type_id);
  const eventTypeId = eventTypeIdRaw !== undefined ? String(eventTypeIdRaw) : undefined;

  return {
    eventId,
    eventTypeId,
    startTime,
    endTime,
    status,
    attendeeEmail: extractAttendeeEmail(result.data),
    rawStatus: booking.status,
  };
}

export function buildBookingInsert({
  amenityId,
  userId,
  eventId,
  startTime,
  endTime,
  status,
  buildingId,
  unitId,
}: {
  amenityId: string;
  userId?: string | null;
  eventId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  buildingId?: string | null;
  unitId?: string | null;
}) {
  return {
    amenity_id: amenityId,
    user_id: userId ?? null,
    calcom_event_id: eventId,
    start_time: startTime,
    end_time: endTime,
    status,
    building_id: buildingId ?? null,
    unit_id: unitId ?? null,
  };
}
