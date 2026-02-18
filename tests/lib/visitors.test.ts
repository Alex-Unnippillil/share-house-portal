import { describe, expect, it } from "vitest"

import { createVisitorLogCsv, evaluateVisitorPolicy } from "@/lib/visitors"

describe("evaluateVisitorPolicy", () => {
  it("rejects stay exceeding max nights", () => {
    const result = evaluateVisitorPolicy(
      {
        maxConsecutiveNights: 2,
        requiresManagerApproval: true,
        blackoutWindows: [],
      },
      {
        checkInDate: new Date("2025-03-01T00:00:00.000Z"),
        checkOutDate: new Date("2025-03-05T00:00:00.000Z"),
        currentUnitActiveStays: [],
      }
    )

    expect(result.allowed).toBe(false)
    expect(result.violations).toContain("Stay exceeds max consecutive nights (2)")
  })

  it("rejects blackout overlap and booking conflict", () => {
    const result = evaluateVisitorPolicy(
      {
        maxConsecutiveNights: 5,
        requiresManagerApproval: true,
        blackoutWindows: [{ start: "2025-03-02", end: "2025-03-04", reason: "Inspection" }],
      },
      {
        checkInDate: new Date("2025-03-03T00:00:00.000Z"),
        checkOutDate: new Date("2025-03-04T12:00:00.000Z"),
        currentUnitActiveStays: [
          {
            checkInDate: "2025-03-03T00:00:00.000Z",
            checkOutDate: "2025-03-05T00:00:00.000Z",
            status: "approved",
          },
        ],
      }
    )

    expect(result.allowed).toBe(false)
    expect(result.violations).toHaveLength(2)
  })
})

describe("createVisitorLogCsv", () => {
  it("escapes commas and quotes", () => {
    const csv = createVisitorLogCsv([
      {
        guestName: 'Casey, "CJ"',
        hostName: "Alex",
        hostRoommateName: "Jamie",
        arrivalDate: "2025-03-01",
        departureDate: "2025-03-02",
        reason: "Late-night event",
        status: "pending",
        requiresApproval: true,
        approvedAt: "",
        createdAt: "2025-03-01",
      },
    ])

    expect(csv).toContain('"Casey, ""CJ"""')
  })
})
