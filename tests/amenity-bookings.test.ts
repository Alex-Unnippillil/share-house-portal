import { describe, expect, it } from "vitest";
import {
  buildBookingInsert,
  collectConflictingBookingIds,
  deriveStatusFromTrigger,
  hasBookingConflict,
  mapWebhookPayload,
  type BookingTimeSpan,
} from "@/lib/amenity-bookings";

describe("booking conflict detection", () => {
  const existing: BookingTimeSpan[] = [
    {
      id: "one",
      start_time: "2024-07-19T10:00:00.000Z",
      end_time: "2024-07-19T11:00:00.000Z",
      status: "confirmed",
    },
  ];

  it("detects overlapping reservations", () => {
    expect(hasBookingConflict(existing, "2024-07-19T10:30:00.000Z", "2024-07-19T11:30:00.000Z")).toBe(true);
  });

  it("ignores non-overlapping reservations", () => {
    expect(hasBookingConflict(existing, "2024-07-19T11:00:00.000Z", "2024-07-19T12:00:00.000Z")).toBe(false);
  });

  it("returns conflicting booking ids", () => {
    const conflicts = collectConflictingBookingIds(existing, "2024-07-19T09:45:00.000Z", "2024-07-19T10:15:00.000Z");
    expect(conflicts).toEqual(["one"]);
  });
});

describe("webhook payload mapping", () => {
  it("normalises booking.created payloads", () => {
    const result = mapWebhookPayload({
      type: "BOOKING_CREATED",
      data: {
        booking: {
          uid: "evt_123",
          startTime: "2024-07-19T15:00:00.000Z",
          endTime: "2024-07-19T16:00:00.000Z",
          eventTypeId: 42,
          status: "accepted",
        },
        attendees: [{ email: "roommate@example.com" }],
      },
    });

    expect(result).toEqual({
      eventId: "evt_123",
      eventTypeId: "42",
      startTime: "2024-07-19T15:00:00.000Z",
      endTime: "2024-07-19T16:00:00.000Z",
      status: "confirmed",
      attendeeEmail: "roommate@example.com",
      rawStatus: "accepted",
    });
  });

  it("treats cancellation events as cancelled", () => {
    const result = mapWebhookPayload({
      triggerEvent: "BOOKING_CANCELLED",
      payload: {
        booking: {
          id: "evt_456",
          start_time: "2024-07-19T18:00:00.000Z",
          end_time: "2024-07-19T19:00:00.000Z",
          event_type_id: "kitchen",
          status: "cancelled",
        },
      },
    });

    expect(result).toEqual({
      eventId: "evt_456",
      eventTypeId: "kitchen",
      startTime: "2024-07-19T18:00:00.000Z",
      endTime: "2024-07-19T19:00:00.000Z",
      status: "cancelled",
      attendeeEmail: undefined,
      rawStatus: "cancelled",
    });
  });
});

describe("booking insert builder", () => {
  it("includes unit and building context", () => {
    const insert = buildBookingInsert({
      amenityId: "amenity-1",
      userId: "user-1",
      eventId: "evt-789",
      startTime: "2024-07-19T20:00:00.000Z",
      endTime: "2024-07-19T20:30:00.000Z",
      status: "confirmed",
      buildingId: "building-1",
      unitId: "unit-1",
    });

    expect(insert).toMatchObject({
      amenity_id: "amenity-1",
      user_id: "user-1",
      calcom_event_id: "evt-789",
      building_id: "building-1",
      unit_id: "unit-1",
      status: "confirmed",
    });
  });
});

describe("status derivation", () => {
  it("uses trigger hints when available", () => {
    expect(deriveStatusFromTrigger("BOOKING_RESCHEDULED", "accepted")).toBe("pending");
    expect(deriveStatusFromTrigger("BOOKING_CANCELLED", "accepted")).toBe("cancelled");
  });
});
