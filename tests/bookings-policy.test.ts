import { describe, expect, it } from "vitest"

import { amenityCatalog } from "@/lib/bookings/amenity-catalog"
import { toBookingInsert } from "@/lib/bookings/calcom-webhook"
import { validateBookingPolicy } from "@/lib/bookings/policy"

describe("booking policy validation", () => {
  const amenity = amenityCatalog[0]

  it("allows valid single reservation", () => {
    const now = Date.now()
    const start = new Date(now + 60 * 60 * 1000).toISOString()
    const end = new Date(now + 2 * 60 * 60 * 1000).toISOString()

    const result = validateBookingPolicy({
      amenity,
      startTime: start,
      endTime: end,
      recurrence: { enabled: false },
    })

    expect(result.allowed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects over-limit recurring bookings", () => {
    const now = Date.now()
    const start = new Date(now + 60 * 60 * 1000).toISOString()
    const end = new Date(now + 2 * 60 * 60 * 1000).toISOString()

    const result = validateBookingPolicy({
      amenity,
      startTime: start,
      endTime: end,
      recurrence: { enabled: true, frequency: "daily", count: amenity.maxRecurringOccurrences + 2 },
    })

    expect(result.allowed).toBe(false)
    expect(result.errors.some((entry) => entry.includes("limited"))).toBe(true)
  })
})

describe("cal.com webhook mapping", () => {
  it("maps cancel event to cancelled booking record", () => {
    const mapped = toBookingInsert({
      triggerEvent: "BOOKING_CANCELLED",
      payload: {
        bookingId: 404,
        eventTypeId: 77,
        eventTypeSlug: "shoreline-kitchen",
        title: "Kitchen",
        startTime: "2026-02-18T19:00:00.000Z",
        endTime: "2026-02-18T20:00:00.000Z",
        metadata: {
          propertyId: "shoreline-house",
          amenityId: "shoreline-kitchen",
          amenityName: "Kitchen",
        },
      },
    })

    expect(mapped).not.toBeNull()
    expect(mapped?.status).toBe("cancelled")
    expect(mapped?.source).toBe("calcom")
    expect(mapped?.source_booking_id).toBe("404")
  })
})
