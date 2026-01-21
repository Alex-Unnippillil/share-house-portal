import Stripe from "stripe"

import { getStripe } from "@/lib/stripe"

export type CouponDiscount =
  | {
      type: "percent"
      percentOff: number
      duration: "once" | "repeating" | "forever"
    }
  | {
      type: "amount"
      amountOff: number
      currency: string
      duration: "once" | "repeating" | "forever"
    }

export type CouponValidationResult = {
  valid: boolean
  code: string
  source: "stripe" | "internal"
  message: string
  couponName?: string
  discount?: CouponDiscount
  trialExtensionDays?: number
  expiresAt?: string | null
  restrictions?: string[]
}

export type CouponEligibilityContext = {
  planId: string
  tenantStatus: "new" | "existing"
  isTrialActive: boolean
  commitmentMonths: number
}

type ValidateCouponOptions = {
  now?: Date
  stripeClient?: Stripe | null
  strategy?: "prefer-stripe" | "internal-only"
}

type InternalCouponRule = {
  code: string
  name: string
  expiresAt?: string
  maxRedemptions?: number
  redemptions?: number
  eligiblePlans?: string[]
  eligibleTenantStatuses?: Array<"new" | "existing">
  minimumCommitmentMonths?: number
  allowIfTrialActive?: boolean
  discount: CouponDiscount
  trialExtensionDays?: number
  restrictions?: string[]
}

const INTERNAL_COUPONS: InternalCouponRule[] = [
  {
    code: "FREEMONTH",
    name: "Free month for new roommates",
    expiresAt: "2024-12-31T23:59:59.000Z",
    maxRedemptions: 500,
    redemptions: 132,
    eligiblePlans: ["shared-plus", "shared-premium"],
    eligibleTenantStatuses: ["new"],
    minimumCommitmentMonths: 6,
    allowIfTrialActive: true,
    discount: { type: "percent", percentOff: 100, duration: "once" },
    trialExtensionDays: 30,
    restrictions: [
      "Applies to first payment only",
      "Requires at least a 6 month commitment",
    ],
  },
  {
    code: "LOYALTY10",
    name: "Loyalty 10% recurring discount",
    expiresAt: "2025-06-30T23:59:59.000Z",
    eligiblePlans: ["shared-plus", "shared-premium", "shared-standard"],
    eligibleTenantStatuses: ["existing"],
    minimumCommitmentMonths: 3,
    allowIfTrialActive: false,
    discount: { type: "percent", percentOff: 10, duration: "repeating" },
    restrictions: [
      "Discount applies for the first 6 renewals",
      "Not available during an active trial",
    ],
  },
  {
    code: "SUMMER50",
    name: "Summer move-in $50 credit",
    expiresAt: "2024-08-31T23:59:59.000Z",
    maxRedemptions: 250,
    redemptions: 250,
    eligiblePlans: ["shared-standard", "shared-plus"],
    eligibleTenantStatuses: ["new", "existing"],
    minimumCommitmentMonths: 1,
    allowIfTrialActive: true,
    discount: { type: "amount", amountOff: 50, currency: "USD", duration: "once" },
    restrictions: ["Limited to the first 250 redemptions"],
  },
  {
    code: "EXPIRED25",
    name: "Expired 25% off",
    expiresAt: "2023-12-31T23:59:59.000Z",
    eligiblePlans: ["shared-standard"],
    eligibleTenantStatuses: ["new", "existing"],
    minimumCommitmentMonths: 1,
    allowIfTrialActive: true,
    discount: { type: "percent", percentOff: 25, duration: "once" },
  },
]

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

function tryGetStripeClient(provided?: Stripe | null): Stripe | null {
  if (provided) return provided
  try {
    return getStripe()
  } catch (error) {
    return null
  }
}

function isPast(dateIso?: string | null, now: Date = new Date()) {
  if (!dateIso) return false
  const timestamp = new Date(dateIso).getTime()
  if (Number.isNaN(timestamp)) return false
  return timestamp < now.getTime()
}

async function validateWithStripe(
  code: string,
  context: CouponEligibilityContext,
  now: Date,
  stripe: Stripe
): Promise<CouponValidationResult | null> {
  try {
    const promotionCodes = await stripe.promotionCodes.list({
      code,
      limit: 1,
      expand: ["data.coupon"],
    })

    const promotion = promotionCodes.data[0]
    if (!promotion) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon code not found",
      }
    }

    const coupon = promotion.coupon as Stripe.Coupon

    if (!promotion.active || coupon.valid === false) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon is not active",
      }
    }

    if (coupon.redeems_by && coupon.redeems_by * 1000 < now.getTime()) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon has expired",
      }
    }

    const totalRedemptions = promotion.times_redeemed ?? 0
    const maxRedeems = promotion.max_redemptions ?? coupon.max_redemptions
    if (maxRedeems && totalRedemptions >= maxRedeems) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon usage limit reached",
      }
    }

    if (
      promotion.restrictions?.first_time_transaction &&
      context.tenantStatus === "existing"
    ) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon is limited to new tenants",
      }
    }

    const requiredPlan = promotion.metadata?.plan || coupon.metadata?.plan
    if (requiredPlan && requiredPlan !== context.planId) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon is not eligible for the selected plan",
      }
    }

    if (
      promotion.metadata?.minimum_commitment &&
      context.commitmentMonths < Number(promotion.metadata.minimum_commitment)
    ) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon requires a longer commitment",
      }
    }

    if (
      promotion.metadata?.allow_trial === "false" &&
      context.isTrialActive
    ) {
      return {
        valid: false,
        code,
        source: "stripe",
        message: "Coupon cannot be used during a trial",
      }
    }

    const discount: CouponDiscount | undefined = coupon.percent_off
      ? {
          type: "percent",
          percentOff: coupon.percent_off,
          duration: coupon.duration,
        }
      : coupon.amount_off && coupon.currency
        ? {
            type: "amount",
            amountOff: coupon.amount_off / 100,
            currency: coupon.currency.toUpperCase(),
            duration: coupon.duration,
          }
        : undefined

    const trialExtensionDays = promotion.metadata?.trial_extension_days
      ? Number(promotion.metadata.trial_extension_days)
      : undefined

    const restrictions: string[] = []
    if (promotion.metadata?.notes) restrictions.push(promotion.metadata.notes)
    if (promotion.restrictions?.first_time_transaction)
      restrictions.push("Only valid for first-time payments")

    return {
      valid: true,
      code,
      source: "stripe",
      message: "Coupon applied",
      couponName: coupon.name ?? code,
      discount,
      trialExtensionDays,
      expiresAt: coupon.redeems_by
        ? new Date(coupon.redeems_by * 1000).toISOString()
        : null,
      restrictions: restrictions.length ? restrictions : undefined,
    }
  } catch (error) {
    console.error("Stripe coupon validation failed", error)
    return {
      valid: false,
      code,
      source: "stripe",
      message: "Unable to validate coupon with Stripe",
    }
  }
}

function validateInternally(
  code: string,
  context: CouponEligibilityContext,
  now: Date
): CouponValidationResult {
  const rule = INTERNAL_COUPONS.find(
    (item) => normalizeCode(item.code) === code
  )

  if (!rule) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon code not recognised",
    }
  }

  if (isPast(rule.expiresAt, now)) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon has expired",
    }
  }

  if (
    typeof rule.maxRedemptions === "number" &&
    typeof rule.redemptions === "number" &&
    rule.redemptions >= rule.maxRedemptions
  ) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon usage limit reached",
    }
  }

  if (
    rule.eligiblePlans &&
    !rule.eligiblePlans.includes(context.planId)
  ) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon is not eligible for the selected plan",
    }
  }

  if (
    rule.eligibleTenantStatuses &&
    !rule.eligibleTenantStatuses.includes(context.tenantStatus)
  ) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon is restricted to different tenants",
    }
  }

  if (
    rule.minimumCommitmentMonths &&
    context.commitmentMonths < rule.minimumCommitmentMonths
  ) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon requires a longer commitment",
    }
  }

  if (!rule.allowIfTrialActive && context.isTrialActive) {
    return {
      valid: false,
      code,
      source: "internal",
      message: "Coupon cannot be used during a trial",
    }
  }

  return {
    valid: true,
    code,
    source: "internal",
    message: "Coupon applied",
    couponName: rule.name,
    discount: rule.discount,
    trialExtensionDays: rule.trialExtensionDays,
    expiresAt: rule.expiresAt ?? null,
    restrictions: rule.restrictions,
  }
}

export async function validateCouponCode(
  couponCode: string,
  context: CouponEligibilityContext,
  options: ValidateCouponOptions = {}
): Promise<CouponValidationResult> {
  const now = options.now ?? new Date()
  const normalizedCode = normalizeCode(couponCode)

  if (!normalizedCode) {
    return {
      valid: false,
      code: normalizedCode,
      source: "internal",
      message: "Enter a coupon code",
    }
  }

  const strategy = options.strategy ?? "prefer-stripe"

  if (strategy !== "internal-only") {
    const stripe = tryGetStripeClient(options.stripeClient)
    if (stripe) {
      const result = await validateWithStripe(
        normalizedCode,
        context,
        now,
        stripe
      )
      if (result && result.valid) return result
      if (result && result.source === "stripe") {
        // If Stripe definitively reported a failure, respect it.
        if (strategy === "stripe-only") return result
        // Continue to internal fallback when strategy allows.
        if (result.valid === false && result.message === "Coupon code not found") {
          // allow internal fallback if code not found in Stripe
        } else if (strategy === "prefer-stripe") {
          return result
        }
      }
    }
  }

  return validateInternally(normalizedCode, context, now)
}

export function listInternalCoupons() {
  return INTERNAL_COUPONS.map((coupon) => ({
    code: coupon.code,
    name: coupon.name,
    expiresAt: coupon.expiresAt ?? null,
    restrictions: coupon.restrictions ?? [],
  }))
}

