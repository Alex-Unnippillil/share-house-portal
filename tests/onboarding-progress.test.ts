import { describe, expect, it } from "vitest"

import {
  DEFAULT_STEP_STATE,
  calculateCompletion,
  collectEmergencyContacts,
  mergeCompletedSteps,
} from "@/app/onboarding/progress"

describe("onboarding progress helpers", () => {
  it("persists newly completed steps without duplicating existing entries", () => {
    const result = mergeCompletedSteps(["unit_assignment"], "rent_share")

    expect(result).toEqual(["unit_assignment", "rent_share"])
  })

  it("returns 100% completion when every step is complete", () => {
    const state = {
      ...DEFAULT_STEP_STATE,
      unit_assignment: true,
      rent_share: true,
      emergency_contacts: true,
    }

    const completion = calculateCompletion(state)

    expect(completion.completed).toBe(completion.total)
    expect(completion.percent).toBe(100)
  })

  it("deduplicates emergency contacts stored across profile fields and metadata", () => {
    const contacts = collectEmergencyContacts({
      emergency_contacts: [
        { name: "Alex" as const, phone: "123", relationship: "Sibling" },
        { name: "Morgan" as const, phone: "555" },
      ],
      metadata: {
        emergency_contacts: [
          { name: "Alex", phone: "123", relationship: "Sibling" },
          { name: "Charlie", phone: "999", notes: "Lives nearby" },
        ],
      },
    })

    expect(contacts).toHaveLength(3)
    expect(contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Alex", phone: "123", relationship: "Sibling" }),
        expect.objectContaining({ name: "Morgan", phone: "555" }),
        expect.objectContaining({ name: "Charlie", phone: "999", notes: "Lives nearby" }),
      ]),
    )
  })
})
