import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import {
  DEFAULT_PLAN_CODE,
  PLAN_DEFINITIONS,
  RATE_LIMIT_RULES,
  type PlanCode,
  type PlanFeature,
  type TenantPlanOverrides,
  resolveQuotaForTenant,
} from './index'
import {
  fetchTenantPlan,
  recordTenantFeatureUsage,
  type TenantPlanRow,
  type UsageCounterRecord,
} from './service'

export interface PlanRateLimitHeaders {
  [header: string]: string
}

export interface PlanRateLimitResult {
  blocked: boolean
  response?: NextResponse
  headers?: PlanRateLimitHeaders
}

interface TenantContext {
  tenantId: string
  planCode: PlanCode
  overrides: TenantPlanOverrides | null
}

interface RateLimitRuleMatch {
  feature: PlanFeature
}

export async function enforcePlanRateLimit({
  request,
  user,
  now = new Date(),
}: {
  request: NextRequest
  user?: User | null
  now?: Date
}): Promise<PlanRateLimitResult> {
  const rule = findMatchingRule(request)
  if (!rule) {
    return { blocked: false }
  }

  const tenantId = resolveTenantId(request, user)
  if (!tenantId) {
    return { blocked: false }
  }

  const tenantContext = await loadTenantContext(tenantId)
  const planDefinition =
    PLAN_DEFINITIONS[tenantContext.planCode] ??
    PLAN_DEFINITIONS[DEFAULT_PLAN_CODE]
  const quota = resolveQuotaForTenant(
    tenantContext.planCode,
    rule.feature,
    tenantContext.overrides
  )

  if (!quota || quota.limit === null) {
    return { blocked: false }
  }

  const usage = await recordTenantFeatureUsage({
    tenantId,
    feature: rule.feature,
    windowSeconds: quota.windowSeconds,
    limit: quota.limit,
    now,
  })

  if (!usage) {
    return { blocked: false }
  }

  const remaining = Math.max(quota.limit - usage.usage, 0)
  const reset = computeResetSeconds(now, usage, quota.windowSeconds)
  const policyDescriptor = `${quota.limit};w=${quota.windowSeconds};policy="${rule.feature}:${tenantContext.planCode}"`

  const headers: PlanRateLimitHeaders = {
    'RateLimit-Limit': String(quota.limit),
    'RateLimit-Remaining': String(Math.max(remaining, 0)),
    'RateLimit-Reset': String(reset),
    'RateLimit-Policy': policyDescriptor,
  }

  if (usage.usage > quota.limit) {
    const response = NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: `Tenant ${tenantId} exceeded the ${rule.feature} quota for the ${tenantContext.planCode} plan.`,
        feature: rule.feature,
        plan: {
          code: tenantContext.planCode,
          name: planDefinition.name,
        },
        upgradeUrl: planDefinition.upgradeUrl,
        limit: quota.limit,
        windowSeconds: quota.windowSeconds,
      },
      { status: 429 }
    )

    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
    response.headers.set('RateLimit-Remaining', '0')
    response.headers.set('Retry-After', String(reset))

    if (planDefinition.upgradeUrl) {
      response.headers.set(
        'Link',
        `<${planDefinition.upgradeUrl}>; rel="upgrade"; title="View plan upgrade options"`
      )
    }

    return { blocked: true, response }
  }

  return {
    blocked: false,
    headers,
  }
}

async function loadTenantContext(tenantId: string): Promise<TenantContext> {
  const tenantPlan: TenantPlanRow | null = await fetchTenantPlan(tenantId)

  if (!tenantPlan) {
    return {
      tenantId,
      planCode: DEFAULT_PLAN_CODE,
      overrides: null,
    }
  }

  const planCode =
    tenantPlan.plan_code in PLAN_DEFINITIONS
      ? tenantPlan.plan_code
      : DEFAULT_PLAN_CODE

  return {
    tenantId,
    planCode,
    overrides: tenantPlan.overrides ?? null,
  }
}

function findMatchingRule(request: NextRequest): RateLimitRuleMatch | null {
  const pathname = request.nextUrl.pathname
  const method = request.method.toUpperCase()

  for (const rule of RATE_LIMIT_RULES) {
    if (!rule.matcher.test(pathname)) {
      continue
    }

    if (rule.methods && !rule.methods.includes(method)) {
      continue
    }

    return { feature: rule.feature }
  }

  return null
}

function resolveTenantId(request: NextRequest, user?: User | null): string | null {
  const headerTenant =
    request.headers.get('x-tenant-id') ?? request.headers.get('x-household-id')
  if (headerTenant) {
    return headerTenant
  }

  const metadata = user?.app_metadata ?? {}
  const userMetadata = user?.user_metadata ?? {}
  const candidate =
    (metadata.tenant_id as string | undefined) ??
    (metadata.household_id as string | undefined) ??
    (userMetadata.tenant_id as string | undefined)

  return candidate ?? null
}

function computeResetSeconds(
  now: Date,
  usage: UsageCounterRecord,
  fallbackWindowSeconds: number
): number {
  const windowEnd = usage.windowEnd
  if (windowEnd) {
    const endsAtMs = Date.parse(windowEnd)
    if (Number.isFinite(endsAtMs) && endsAtMs > now.getTime()) {
      return Math.max(Math.ceil((endsAtMs - now.getTime()) / 1000), 0)
    }
  }

  return Math.max(Math.ceil(fallbackWindowSeconds), 0)
}
