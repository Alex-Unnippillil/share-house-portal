import { describe, expect, it } from "vitest"

import {
  isWithinQuietHours,
  shouldSendDigest,
  type DigestFrequency,
} from "@/lib/notifications/digest"

describe("isWithinQuietHours", () => {
  it("returns true when current time falls within an overnight window", () => {
    const now = new Date("2024-01-01T23:30:00")
    expect(isWithinQuietHours(now, "22:00:00", "06:00:00")).toBe(true)
  })

  it("returns false when quiet hours are not configured", () => {
    const now = new Date("2024-01-01T12:00:00")
    expect(isWithinQuietHours(now, null, "06:00:00")).toBe(false)
    expect(isWithinQuietHours(now, "22:00:00", null)).toBe(false)
  })
})

describe("shouldSendDigest", () => {
  const frequency: DigestFrequency = "daily"

  it("skips sending when inside quiet hours", () => {
    const now = new Date("2024-01-01T23:00:00")
    const lastDigestAt = new Date("2023-12-31T09:00:00")

    const result = shouldSendDigest({
      now,
      frequency,
      lastDigestAt,
      quietHoursStart: "22:00:00",
      quietHoursEnd: "06:00:00",
    })

    expect(result.eligible).toBe(false)
    expect(result.reason).toBe("within_quiet_hours")
  })

  it("skips when the digest interval has not elapsed", () => {
    const now = new Date("2024-01-02T09:00:00")
    const lastDigestAt = new Date(now.getTime() - 10 * 60 * 60 * 1000)

    const result = shouldSendDigest({
      now,
      frequency,
      lastDigestAt,
      quietHoursStart: null,
      quietHoursEnd: null,
    })

    expect(result.eligible).toBe(false)
    expect(result.reason).toBe("interval_not_met")
    expect(result.windowStart.toISOString()).toBe(lastDigestAt.toISOString())
  })

  it("allows sending once the interval has elapsed and outside quiet hours", () => {
    const now = new Date("2024-01-02T09:30:00")
    const lastDigestAt = new Date(now.getTime() - 26 * 60 * 60 * 1000)

    const result = shouldSendDigest({
      now,
      frequency,
      lastDigestAt,
      quietHoursStart: "22:00:00",
      quietHoursEnd: "06:00:00",
    })

    expect(result.eligible).toBe(true)
    const expectedWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    expect(result.windowStart.toISOString()).toBe(expectedWindowStart.toISOString())
  })
})
