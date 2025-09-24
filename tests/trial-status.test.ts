import { describe, expect, it } from "vitest"

import { evaluateTrialStatus, type TrialRecord } from "@/lib/payments/trials"

const baseRecord: TrialRecord = {
  tenantId: "tenant_jordan",
  planId: "shared-plus",
  startedAt: "2024-07-01T08:00:00.000Z",
  trialEndsAt: "2024-07-31T08:00:00.000Z",
  couponExtensions: [],
}

describe("trial status evaluation", () => {
  it("treats trials as active when still within the extended period", () => {
    const status = evaluateTrialStatus(
      {
        ...baseRecord,
        couponExtensions: [{ code: "FREEMONTH", days: 7, appliedAt: "2024-07-10T10:00:00.000Z" }],
      },
      {
        now: new Date("2024-08-02T12:00:00.000Z"),
        gracePeriodDays: 5,
        pendingExtensionDays: 3,
      }
    )

    expect(status.status).toBe("active")
    expect(status.endsAt).toBe("2024-08-10T08:00:00.000Z")
  })

  it("marks trials as converted when a conversion timestamp is recorded", () => {
    const status = evaluateTrialStatus(
      {
        ...baseRecord,
        convertedAt: "2024-07-20T08:00:00.000Z",
      },
      { now: new Date("2024-07-25T12:00:00.000Z") }
    )

    expect(status.status).toBe("converted")
    expect(status.convertedAt).toBe("2024-07-20T08:00:00.000Z")
  })

  it("expires trials after the grace period ends", () => {
    const status = evaluateTrialStatus(baseRecord, {
      now: new Date("2024-08-10T12:00:00.000Z"),
      gracePeriodDays: 5,
    })

    expect(status.status).toBe("expired")
    expect(status.endedAt).toBe("2024-07-31T08:00:00.000Z")
  })
})

