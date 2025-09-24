import type { Database, Json } from "@/lib/supabase"

export type TenantPlanId = "shared" | "plus" | "premium"

export interface TenantBillingPlan {
  id: TenantPlanId
  label: string
  description: string
  stripePriceId: string
  amount: number
  currency: string
  interval: "month" | "year"
}

const PLAN_CATALOG: Record<TenantPlanId, TenantBillingPlan> = {
  shared: {
    id: "shared",
    label: "Shared Living",
    description: "Standard roommate plan covering shared unit rent and utilities.",
    stripePriceId: "price_roomsily_shared_monthly",
    amount: 1260,
    currency: "USD",
    interval: "month",
  },
  plus: {
    id: "plus",
    label: "Shared Living Plus",
    description: "Enhanced roommate plan with split maintenance and amenity coverage.",
    stripePriceId: "price_roomsily_plus_monthly",
    amount: 1390,
    currency: "USD",
    interval: "month",
  },
  premium: {
    id: "premium",
    label: "Premium Suite",
    description: "Premium plan for private suites with bundled concierge services.",
    stripePriceId: "price_roomsily_premium_monthly",
    amount: 1550,
    currency: "USD",
    interval: "month",
  },
}

const DEFAULT_PLAN_ID: TenantPlanId = "shared"

type ProfilesTable = Database["public"]["Tables"]["profiles"]
export type BillingProfileRow = Pick<
  ProfilesTable["Row"],
  "stripe_customer_id" | "unit_id" | "metadata"
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeCurrency(input: unknown, fallback: string): string {
  if (typeof input !== "string" || !input.trim()) {
    return fallback
  }
  return input.trim().toUpperCase()
}

function resolvePlanId(raw: unknown): TenantPlanId {
  if (typeof raw === "string" && raw in PLAN_CATALOG) {
    return raw as TenantPlanId
  }
  return DEFAULT_PLAN_ID
}

export function resolveTenantPlan(metadata: Json | null | undefined): TenantBillingPlan {
  const basePlan = PLAN_CATALOG[DEFAULT_PLAN_ID]
  if (!metadata || !isRecord(metadata)) {
    return basePlan
  }

  const billing = isRecord(metadata.billing) ? metadata.billing : null

  const planId = resolvePlanId(billing?.plan)
  const catalogPlan = PLAN_CATALOG[planId] ?? basePlan

  const priceId =
    typeof billing?.price_id === "string" && billing.price_id.trim()
      ? billing.price_id.trim()
      : catalogPlan.stripePriceId

  const currency = normalizeCurrency(billing?.currency, catalogPlan.currency)

  return {
    ...catalogPlan,
    stripePriceId: priceId,
    currency,
  }
}

export interface TenantBillingContext {
  tenantId: string
  unitId: string | null
  stripeCustomerId: string | null
  plan: TenantBillingPlan
}

export function buildTenantBillingContext({
  userId,
  profile,
}: {
  userId: string
  profile: BillingProfileRow | null | undefined
}): TenantBillingContext {
  return {
    tenantId: userId,
    unitId: profile?.unit_id ?? null,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
    plan: resolveTenantPlan(profile?.metadata ?? null),
  }
}

export interface CheckoutSessionPayload {
  priceId: string
  quantity: number
  mode: "subscription"
  metadata: Record<string, string>
  customerId?: string
}

export function buildCheckoutSessionPayload({
  plan,
  tenantId,
  unitId,
  stripeCustomerId,
}: {
  plan: TenantBillingPlan
  tenantId?: string | null
  unitId?: string | null
  stripeCustomerId?: string | null
}): CheckoutSessionPayload {
  const metadata: Record<string, string> = {
    plan_id: plan.id,
    plan_interval: plan.interval,
  }

  if (tenantId) {
    metadata.tenant_id = tenantId
  }

  if (unitId) {
    metadata.unit_id = unitId
  }

  return {
    priceId: plan.stripePriceId,
    quantity: 1,
    mode: "subscription",
    metadata,
    customerId: stripeCustomerId ?? undefined,
  }
}
