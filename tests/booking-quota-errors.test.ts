import { describe, expect, it } from "vitest"

import {
  DAILY_LIMIT_DETAIL,
  WEEKLY_LIMIT_DETAIL,
  translateBookingQuotaError,
} from "@/lib/booking-quota"

describe("translateBookingQuotaError", () => {
  it("returns a helpful message for daily quota violations", () => {
    const message = translateBookingQuotaError({
      code: "P0001",
      details: DAILY_LIMIT_DETAIL,
      message: "Daily booking quota reached (2 bookings allowed per day).",
    })

    expect(message).toContain("daily booking quota")
    expect(message).toContain("2 daily reservations")
  })

  it("returns a helpful message for weekly quota violations", () => {
    const message = translateBookingQuotaError({
      code: "P0001",
      details: WEEKLY_LIMIT_DETAIL,
      message: "Weekly booking quota reached (5 bookings allowed per week).",
    })

    expect(message).toContain("weekly booking quota")
    expect(message).toContain("5 weekly bookings")
  })

  it("falls back when the error is unrelated", () => {
    expect(
      translateBookingQuotaError({
        code: "23505",
        details: "duplicate key value",
        message: "duplicate key",
      })
    ).toBeNull()
  })

  it("handles quota errors without a numeric hint", () => {
    const message = translateBookingQuotaError({
      code: "P0001",
      details: DAILY_LIMIT_DETAIL,
      message: "Daily booking quota reached.",
    })

    expect(message).toContain("daily booking quota")
    expect(message).toContain("allowed number of daily bookings")
  })
})
