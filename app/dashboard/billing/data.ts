import "server-only"

type BillingPlan = {
  id: string
  name: string
  price: number
  interval: "monthly" | "yearly"
  currency: "USD"
  description: string
  perks: string[]
  recommended?: boolean
  stripePriceId?: string
}

type CouponSummary = {
  code: string
  description: string
}

export type BillingTrial = {
  startedAt: string
  trialEndsAt: string
  gracePeriodDays: number
  convertedAt?: string
  cancelledAt?: string
  couponExtensions?: Array<{
    code: string
    days: number
    appliedAt: string
  }>
}

export type BillingOverview = {
  tenantId: string
  tenantName: string
  unitLabel: string
  currentPlanId: string
  autopayEnabled: boolean
  autopayDay: number
  commitmentMonths: number
  availablePlans: BillingPlan[]
  trial: BillingTrial
  recentCoupons: CouponSummary[]
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getBillingOverview(): Promise<BillingOverview> {
  await wait(180)

  return {
    tenantId: "tenant_jordan",
    tenantName: "Jordan Blake",
    unitLabel: "Unit 3B",
    currentPlanId: "shared-plus",
    autopayEnabled: true,
    autopayDay: 1,
    commitmentMonths: 12,
    availablePlans: [
      {
        id: "shared-standard",
        name: "Shared Standard",
        price: 1099,
        interval: "monthly",
        currency: "USD",
        description: "Base rent share with monthly reporting",
        perks: [
          "Automated rent reminders",
          "Shared ledger exports",
          "Maintenance request tracking",
        ],
        stripePriceId: "price_standard_monthly",
      },
      {
        id: "shared-plus",
        name: "Shared Plus",
        price: 1260,
        interval: "monthly",
        currency: "USD",
        description: "Includes utilities reconciliation and amenity scheduling",
        perks: [
          "Everything in Standard",
          "Amenity booking credits",
          "Auto-split utility adjustments",
        ],
        recommended: true,
        stripePriceId: "price_plus_monthly",
      },
      {
        id: "shared-premium",
        name: "Shared Premium",
        price: 1399,
        interval: "monthly",
        currency: "USD",
        description: "Adds concierge move-in support and overnight guest passes",
        perks: [
          "Priority maintenance dispatch",
          "Unlimited guest passes",
          "Dedicated property manager chat",
        ],
        stripePriceId: "price_premium_monthly",
      },
    ],
    trial: {
      startedAt: "2024-07-01T08:00:00.000Z",
      trialEndsAt: "2024-07-31T08:00:00.000Z",
      gracePeriodDays: 7,
      couponExtensions: [
        {
          code: "ONBOARD25",
          days: 5,
          appliedAt: "2024-07-05T14:00:00.000Z",
        },
      ],
    },
    recentCoupons: [
      {
        code: "FREEMONTH",
        description: "Last used 3 days ago by Unit 4C",
      },
      {
        code: "LOYALTY10",
        description: "Popular with roommates keeping the same lease",
      },
      {
        code: "SUMMER50",
        description: "$50 credit while supplies last",
      },
    ],
  }
}

