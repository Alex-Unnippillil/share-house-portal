import { describe, expect, it } from "vitest"

import {
  MAX_LIMIT,
  MAX_PAGE,
  notificationsQuerySchema,
} from "@/app/api/notifications/route"

describe("notifications query schema", () => {
  it("rejects requests missing pagination parameters", () => {
    expect(notificationsQuerySchema.safeParse({}).success).toBe(false)

    const missingPage = notificationsQuerySchema.safeParse({
      limit: "10",
    })
    expect(missingPage.success).toBe(false)

    const missingLimit = notificationsQuerySchema.safeParse({
      page: "1",
    })
    expect(missingLimit.success).toBe(false)
  })

  it("rejects page values that exceed the maximum", () => {
    const result = notificationsQuerySchema.safeParse({
      page: String(MAX_PAGE + 1),
      limit: "10",
    })

    expect(result.success).toBe(false)
    if (result.success) return

    const { fieldErrors } = result.error.flatten()
    expect(fieldErrors.page?.[0]).toContain("cannot exceed")
  })

  it("rejects limit values that exceed the maximum", () => {
    const result = notificationsQuerySchema.safeParse({
      page: "1",
      limit: String(MAX_LIMIT + 1),
    })

    expect(result.success).toBe(false)
    if (result.success) return

    const { fieldErrors } = result.error.flatten()
    expect(fieldErrors.limit?.[0]).toContain("cannot exceed")
  })

  it("parses valid pagination parameters", () => {
    const result = notificationsQuerySchema.safeParse({
      page: "2",
      limit: "25",
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.page).toBe(2)
    expect(result.data.limit).toBe(25)
  })
})
