import { describe, expect, it } from "vitest"

import { validateCouponCode } from "@/lib/payments/coupons"

const baseContext = {
  planId: "shared-plus",
  tenantStatus: "new" as const,
  isTrialActive: true,
  commitmentMonths: 12,
}

const baseOptions = {
  strategy: "internal-only" as const,
  now: new Date("2024-07-15T12:00:00.000Z"),
}

describe("coupon validation", () => {
  it("approves free month coupon for eligible new roommates", async () => {
    const result = await validateCouponCode("FREEMONTH", baseContext, baseOptions)

    expect(result.valid).toBe(true)
    expect(result.trialExtensionDays).toBe(30)
    expect(result.discount?.type).toBe("percent")
  })

  it("rejects coupons that have expired", async () => {
    const result = await validateCouponCode("EXPIRED25", baseContext, baseOptions)

    expect(result.valid).toBe(false)
    expect(result.message).toContain("expired")
  })

  it("rejects coupons when the usage limit is reached", async () => {
    const result = await validateCouponCode("SUMMER50", baseContext, baseOptions)

    expect(result.valid).toBe(false)
    expect(result.message).toContain("usage limit")
  })

  it("prevents applying coupons to ineligible plans", async () => {
    const result = await validateCouponCode(
      "FREEMONTH",
      { ...baseContext, planId: "shared-standard" },
      baseOptions
    )

    expect(result.valid).toBe(false)
    expect(result.message).toContain("not eligible")
  })

  it("prevents loyalty coupon during an active trial", async () => {
    const result = await validateCouponCode(
      "LOYALTY10",
      { ...baseContext, tenantStatus: "existing" },
      baseOptions
    )

    expect(result.valid).toBe(false)
    expect(result.message).toContain("trial")
  })
})

