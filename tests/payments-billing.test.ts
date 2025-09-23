import { describe, expect, it } from "vitest"

import {
  buildCheckoutSessionPayload,
  buildTenantBillingContext,
  resolveTenantPlan,
  type BillingProfileRow,
} from "@/lib/payments/billing"

const baseProfile: BillingProfileRow = {
  stripe_customer_id: "cus_test_123",
  unit_id: "unit-99",
  metadata: {
    billing: {
      plan: "plus",
      currency: "usd",
      price_id: "price_custom_plus",
    },
  },
}

describe("tenant billing context", () => {
  it("retains the stored Stripe customer id for authenticated tenants", () => {
    const context = buildTenantBillingContext({ userId: "user-1", profile: baseProfile })

    expect(context.tenantId).toBe("user-1")
    expect(context.stripeCustomerId).toBe("cus_test_123")
    expect(context.unitId).toBe("unit-99")
    expect(context.plan.id).toBe("plus")
    expect(context.plan.stripePriceId).toBe("price_custom_plus")
    expect(context.plan.currency).toBe("USD")
  })

  it("falls back to the default plan when metadata is missing", () => {
    const context = buildTenantBillingContext({
      userId: "user-2",
      profile: { stripe_customer_id: null, unit_id: null, metadata: null },
    })

    expect(context.plan.id).toBe("shared")
    expect(context.plan.stripePriceId).toBe("price_roomsily_shared_monthly")
  })
})

describe("checkout payload", () => {
  it("prefills checkout metadata with plan, tenant, and unit details", () => {
    const plan = resolveTenantPlan(baseProfile.metadata)
    const payload = buildCheckoutSessionPayload({
      plan,
      tenantId: "tenant-123",
      unitId: "unit-456",
      stripeCustomerId: "cus_456",
    })

    expect(payload.priceId).toBe("price_custom_plus")
    expect(payload.mode).toBe("subscription")
    expect(payload.metadata).toMatchObject({
      tenant_id: "tenant-123",
      unit_id: "unit-456",
      plan_id: "plus",
      plan_interval: "month",
    })
    expect(payload.customerId).toBe("cus_456")
  })

  it("omits optional fields when tenant context is unavailable", () => {
    const plan = resolveTenantPlan(null)
    const payload = buildCheckoutSessionPayload({ plan })

    expect(payload.metadata).toMatchObject({ plan_id: plan.id })
    expect(payload.customerId).toBeUndefined()
  })
})
