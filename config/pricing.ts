export type PricingPlanId = "starter" | "plus" | "concierge"

export type PricingPlan = {
  id: PricingPlanId
  name: string
  tagline: string
  priceMonthly: number
  priceSuffix: string
  currency: string
  description: string
  ctaLabel: string
  priceId: string
  badge?: string
  mostPopular?: boolean
  perks: string[]
  usage: Array<{ label: string; value: string }>
  support: string
}

const priceIds = {
  starter:
    process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ??
    "price_roomsily_starter",
  plus:
    process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID ??
    "price_roomsily_plus",
  concierge:
    process.env.NEXT_PUBLIC_STRIPE_CONCIERGE_PRICE_ID ??
    "price_roomsily_concierge",
} satisfies Record<PricingPlanId, string>

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "New households",
    tagline: "Centralize rent, guests, and docs for a single home.",
    priceMonthly: 0,
    priceSuffix: "per unit / month",
    currency: "USD",
    description:
      "Launch Roomsily with core rent tracking, visitor policies, and roommate messaging in one hub.",
    ctaLabel: "Launch for free",
    priceId: priceIds.starter,
    perks: [
      "Stripe-powered rent ledger with receipt history",
      "Documenso document vault with version tracking",
      "Visitor approvals and overnight stay guardrails",
    ],
    usage: [
      { label: "Units included", value: "1 property" },
      { label: "Roommates", value: "Up to 5" },
    ],
    support: "Email support during business hours",
  },
  {
    id: "plus",
    name: "Roommate Plus",
    badge: "Most popular",
    tagline: "Automate autopay, amenity usage, and policy enforcement.",
    priceMonthly: 49,
    priceSuffix: "per unit / month",
    currency: "USD",
    description:
      "Unlock autopay workflows, unlimited amenity calendars, and realtime community analytics for growing portfolios.",
    ctaLabel: "Upgrade to Plus",
    priceId: priceIds.plus,
    mostPopular: true,
    perks: [
      "Autopay cadence builder with late fee automation",
      "Unlimited Cal.com amenity calendars with conflict prevention",
      "Realtime roommate feed with polls and escalations",
    ],
    usage: [
      { label: "Units included", value: "Up to 5 properties" },
      { label: "Roommates", value: "Up to 25 per workspace" },
    ],
    support: "Priority in-app chat and next-day onboarding",
  },
  {
    id: "concierge",
    name: "Community Concierge",
    tagline: "Dedicated success, analytics, and API extensions for scaled operators.",
    priceMonthly: 129,
    priceSuffix: "per unit / month",
    currency: "USD",
    description:
      "Partner with Roomsily experts for white-glove onboarding, SLAs, and data exports that plug into your back office.",
    ctaLabel: "Upgrade to Concierge",
    priceId: priceIds.concierge,
    perks: [
      "Dedicated success manager with quarterly planning",
      "Documenso + Cal.com automation playbooks",
      "BI-ready exports and maintenance SLA tracking",
    ],
    usage: [
      { label: "Units included", value: "Unlimited properties" },
      { label: "Roommates", value: "Unlimited members" },
    ],
    support: "24/7 concierge with on-call escalation",
  },
]

export type FeatureMatrixRow = {
  label: string
  description?: string
  plans: Record<PricingPlanId, string | boolean>
}

export type FeatureMatrixSection = {
  category: string
  features: FeatureMatrixRow[]
}

export const PRICING_FEATURE_MATRIX: FeatureMatrixSection[] = [
  {
    category: "Payments & Finance",
    features: [
      {
        label: "Autopay cadence builder",
        description:
          "Design rent schedules, grace periods, and automatic late fee nudges.",
        plans: {
          starter: false,
          plus: true,
          concierge: true,
        },
      },
      {
        label: "Partial & catch-up payments",
        plans: {
          starter: true,
          plus: true,
          concierge: true,
        },
      },
      {
        label: "Stripe Billing seats included",
        plans: {
          starter: "Up to 5 roommates",
          plus: "Up to 25 roommates",
          concierge: "Unlimited",
        },
      },
      {
        label: "Automated receipt exports",
        plans: {
          starter: "Monthly CSV",
          plus: "Weekly CSV + PDF",
          concierge: "Realtime webhooks",
        },
      },
    ],
  },
  {
    category: "Operations & Community",
    features: [
      {
        label: "Amenity calendars",
        plans: {
          starter: "2 amenities",
          plus: "Unlimited amenities",
          concierge: "Unlimited + VIP slots",
        },
      },
      {
        label: "Visitor policy automation",
        plans: {
          starter: true,
          plus: true,
          concierge: true,
        },
      },
      {
        label: "Documenso workflows",
        plans: {
          starter: "3 active templates",
          plus: "Unlimited templates",
          concierge: "Unlimited + custom branding",
        },
      },
      {
        label: "Roommate messaging",
        description:
          "Realtime threads, polls, and escalation paths for property teams.",
        plans: {
          starter: true,
          plus: true,
          concierge: true,
        },
      },
    ],
  },
  {
    category: "Support & Governance",
    features: [
      {
        label: "Support response time",
        plans: {
          starter: "24h email",
          plus: "4h in-app chat",
          concierge: "1h concierge",
        },
      },
      {
        label: "Role-based access control",
        plans: {
          starter: true,
          plus: true,
          concierge: true,
        },
      },
      {
        label: "Analytics & reporting",
        plans: {
          starter: "Rent + booking dashboards",
          plus: "Payments, amenities & retention",
          concierge: "Custom SQL + BI exports",
        },
      },
      {
        label: "Service-level agreements",
        plans: {
          starter: false,
          plus: false,
          concierge: true,
        },
      },
    ],
  },
]
