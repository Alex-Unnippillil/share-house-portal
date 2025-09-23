import { describe, expect, it } from "vitest"

import { parseQuickAddCommand } from "@/lib/nlp/quick-add"

describe("quick add parser", () => {
  const referenceDate = new Date("2024-07-24T10:00:00Z")

  it("extracts currency and due date for invoices", () => {
    const result = parseQuickAddCommand("Add invoice 200 CAD due Fri", {
      referenceDate,
    })

    expect(result.intent).toBe("invoice")
    expect(result.isReady).toBe(true)
    expect(result.payload).not.toBeNull()

    const payload = result.payload!
    expect(payload.amount).toBe(200)
    expect(payload.currency).toBe("CAD")
    expect(payload.dueDate).toBe("2024-07-26")
  })

  it("detects amenity bookings and time ranges", () => {
    const result = parseQuickAddCommand(
      "Book the kitchen tomorrow 6-8pm for dinner",
      { referenceDate },
    )

    expect(result.intent).toBe("booking")
    expect(result.isReady).toBe(true)
    expect(result.payload).not.toBeNull()

    const payload = result.payload!
    expect(payload.amenityId).toBe("kitchen")
    expect(payload.hasExplicitEnd).toBe(true)

    const start = new Date(payload.startTime).getTime()
    const end = new Date(payload.endTime).getTime()
    expect(end - start).toBe(2 * 60 * 60 * 1000)
  })

  it("classifies maintenance issues with priority", () => {
    const result = parseQuickAddCommand(
      "Log maintenance urgent leak under sink",
      { referenceDate },
    )

    expect(result.intent).toBe("maintenance")
    expect(result.isReady).toBe(true)
    expect(result.payload).not.toBeNull()

    const payload = result.payload!
    expect(payload.priority).toBe("urgent")
    expect(payload.title.toLowerCase()).toContain("leak")
  })
})
