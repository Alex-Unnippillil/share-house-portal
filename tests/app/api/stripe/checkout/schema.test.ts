import { describe, expect, it } from "vitest"

import { checkoutBodySchema } from "@/app/api/stripe/checkout/schema"

describe("checkoutBodySchema", () => {
  const basePayload = { priceId: "price_123" }

  it("rejects a non-positive quantity", () => {
    const result = checkoutBodySchema.safeParse({
      ...basePayload,
      quantity: 0,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.quantity).toEqual([
        "quantity must be a positive integer",
      ])
    }
  })

  it("rejects an invalid mode", () => {
    const result = checkoutBodySchema.safeParse({
      ...basePayload,
      // @ts-expect-error testing invalid mode value
      mode: "invalid",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.mode).toEqual([
        "mode must be payment or subscription",
      ])
    }
  })

  it("rejects metadata with non-string values", () => {
    const result = checkoutBodySchema.safeParse({
      ...basePayload,
      metadata: {
        foo: 123 as unknown as string,
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "metadata values must be strings",
      )
      expect(result.error.issues[0]?.path).toEqual(["metadata", "foo"])
    }
  })
})
