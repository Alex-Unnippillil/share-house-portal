import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_PLAN_CODE,
  FEATURE_METADATA,
  PLAN_DEFINITIONS,
  PLAN_FEATURES,
  formatQuotaLimit,
  formatQuotaWindow,
  resolveQuotaForTenant,
  type PlanFeature,
} from '@/lib/rate-limit'
import {
  fetchAllTenantPlans,
  fetchUsageCounters,
  type TenantPlanRow,
  type UsageCounterRecord,
} from '@/lib/rate-limit/service'

import { updatePlanOverride } from './actions'

interface TenantFeatureView {
  feature: PlanFeature
  title: string
  description: string
  baseLimit: number | null
  baseWindowSeconds: number
  overrideLimit?: number | null
  overrideWindowSeconds?: number
  effectiveLimit: number | null
  effectiveWindowSeconds: number
  usage?: UsageCounterRecord
}

interface TenantPlanView {
  tenantId: string
  planCode: keyof typeof PLAN_DEFINITIONS
  planName: string
  planDescription: string
  planUpgradeUrl: string
  updatedAt: string | null
  features: TenantFeatureView[]
}

interface DashboardData {
  supabaseConfigured: boolean
  tenants: TenantPlanRow[]
  usageMap: Map<string, UsageCounterRecord>
}

export default async function PlansDashboardPage() {
  const dashboard = await loadDashboardData()
  const viewModels = buildTenantViews(dashboard.tenants, dashboard.usageMap)

  return (
    <div className="space-y-8 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Plan quotas &amp; overrides</h1>
        <p className="text-sm text-muted-foreground">
          Inspect Supabase-backed usage counters and tailor allowances per tenant plan. Overrides take effect immediately
          for rate-limit checks enforced in middleware.
        </p>
        {!dashboard.supabaseConfigured && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to edit live quotas.
            The examples below illustrate how overrides will render once Supabase credentials are available.
          </div>
        )}
      </header>

      {dashboard.supabaseConfigured && viewModels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
          No tenant plans were found. Create tenant profiles to manage quota overrides.
        </div>
      ) : (
        <div className="grid gap-6">
          {viewModels.map((tenant) => (
            <Card key={tenant.tenantId} className="shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{tenant.tenantId}</CardTitle>
                    <CardDescription>
                      {tenant.planName} • {tenant.planDescription}
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
                    <Link href={tenant.planUpgradeUrl} target="_blank" rel="noreferrer">
                      View plan options
                    </Link>
                  </Button>
                </div>
                {tenant.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {new Date(tenant.updatedAt).toLocaleString('en-US', { hour12: false })}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {tenant.features.map((feature, index) => (
                  <section
                    key={`${tenant.tenantId}-${feature.feature}`}
                    className={index === 0 ? 'space-y-4' : 'space-y-4 border-t pt-4'}
                  >
                    <header className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground/80">
                          {feature.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Plan default: {formatQuotaLimit(feature.baseLimit)}</div>
                        <div>Window: {formatQuotaWindow(feature.baseWindowSeconds)}</div>
                        <div className="font-medium text-foreground">
                          Effective: {formatQuotaLimit(feature.effectiveLimit)} •{' '}
                          {formatQuotaWindow(feature.effectiveWindowSeconds)}
                        </div>
                      </div>
                    </header>

                    {feature.usage && (
                      <UsageSummary usage={feature.usage} effectiveLimit={feature.effectiveLimit} />
                    )}

                    <form
                      action={updatePlanOverride}
                      className="grid gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 md:grid-cols-12 md:items-end"
                    >
                      <input type="hidden" name="tenant_id" value={tenant.tenantId} />
                      <input type="hidden" name="feature" value={feature.feature} />
                      <input type="hidden" name="plan_code" value={tenant.planCode} />

                      <div className="space-y-2 md:col-span-4">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Override limit
                        </label>
                        <Input
                          name="limit"
                          defaultValue={formatLimitInput(feature.overrideLimit)}
                          placeholder={
                            feature.baseLimit === null
                              ? 'Unlimited by default'
                              : `Default: ${feature.baseLimit.toLocaleString('en-US')}`
                          }
                          disabled={!dashboard.supabaseConfigured}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a number to cap usage, “unlimited” to lift the cap, or leave blank to inherit the plan.
                        </p>
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Window (seconds)
                        </label>
                        <Input
                          name="window_seconds"
                          defaultValue={feature.overrideWindowSeconds?.toString() ?? ''}
                          placeholder={`Default: ${feature.baseWindowSeconds}`}
                          disabled={!dashboard.supabaseConfigured}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank to reuse the plan window or supply a custom rolling window in seconds.
                        </p>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground md:col-span-3">
                        {feature.effectiveLimit === null ? (
                          <p>Unlimited requests allowed for this feature.</p>
                        ) : (
                          <p>
                            Remaining allowance:{' '}
                            <span className="font-medium text-foreground">
                              {Math.max(feature.effectiveLimit - (feature.usage?.usage ?? 0), 0).toLocaleString('en-US')}
                            </span>
                          </p>
                        )}
                        <p className="text-xs">
                          Overrides sync to Supabase immediately after saving.
                        </p>
                      </div>

                      <div className="flex gap-2 md:col-span-2 md:justify-end">
                        <Button type="submit" disabled={!dashboard.supabaseConfigured}>
                          Save override
                        </Button>
                        <Button
                          type="submit"
                          name="reset"
                          value="true"
                          variant="outline"
                          disabled={!dashboard.supabaseConfigured}
                        >
                          Reset
                        </Button>
                      </div>
                    </form>
                  </section>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function buildTenantViews(
  plans: TenantPlanRow[],
  usageMap: Map<string, UsageCounterRecord>
): TenantPlanView[] {
  return plans.map((plan) => {
    const planDefinition =
      PLAN_DEFINITIONS[plan.plan_code] ?? PLAN_DEFINITIONS[DEFAULT_PLAN_CODE]

    const features = PLAN_FEATURES.map((feature): TenantFeatureView => {
      const baseQuota = planDefinition.quotas[feature]
      const effectiveQuota = resolveQuotaForTenant(plan.plan_code, feature, plan.overrides)
      const usage = usageMap.get(`${plan.tenant_id}:${feature}`)

      return {
        feature,
        title: FEATURE_METADATA[feature].title,
        description: FEATURE_METADATA[feature].description,
        baseLimit: baseQuota?.limit ?? null,
        baseWindowSeconds: baseQuota?.windowSeconds ?? 0,
        overrideLimit: plan.overrides?.[feature]?.limit,
        overrideWindowSeconds: plan.overrides?.[feature]?.windowSeconds,
        effectiveLimit: effectiveQuota?.limit ?? baseQuota?.limit ?? null,
        effectiveWindowSeconds:
          effectiveQuota?.windowSeconds ?? baseQuota?.windowSeconds ?? 0,
        usage,
      }
    })

    return {
      tenantId: plan.tenant_id,
      planCode: plan.plan_code,
      planName: planDefinition.name,
      planDescription: planDefinition.description,
      planUpgradeUrl: planDefinition.upgradeUrl,
      updatedAt: plan.updated_at ?? null,
      features,
    }
  })
}

async function loadDashboardData(): Promise<DashboardData> {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  if (!supabaseConfigured) {
    const fallbackUsage = buildFallbackUsage()
    return {
      supabaseConfigured,
      tenants: FALLBACK_TENANT_PLANS,
      usageMap: buildUsageMap(fallbackUsage),
    }
  }

  const [plans, usage] = await Promise.all([
    fetchAllTenantPlans(),
    fetchUsageCounters(),
  ])

  return {
    supabaseConfigured,
    tenants: plans,
    usageMap: buildUsageMap(usage),
  }
}

function buildUsageMap(records: UsageCounterRecord[]): Map<string, UsageCounterRecord> {
  const map = new Map<string, UsageCounterRecord>()
  for (const record of records) {
    map.set(`${record.tenantId}:${record.feature}`, record)
  }
  return map
}

function formatLimitInput(value: number | null | undefined): string {
  if (value === null) {
    return 'unlimited'
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  return ''
}

function UsageSummary({
  usage,
  effectiveLimit,
}: {
  usage: UsageCounterRecord
  effectiveLimit: number | null
}) {
  const limitText =
    effectiveLimit === null
      ? `${usage.usage.toLocaleString('en-US')} calls logged`
      : `${usage.usage.toLocaleString('en-US')} of ${effectiveLimit.toLocaleString('en-US')} used`

  const resetText = usage.windowEnd
    ? new Date(usage.windowEnd).toLocaleString('en-US', { hour12: false })
    : null

  return (
    <div className="rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Usage:</span> {limitText}
      {resetText && <span className="ml-2">• Resets at {resetText}</span>}
    </div>
  )
}

function buildFallbackUsage(): UsageCounterRecord[] {
  const now = Date.now()
  return [
    {
      tenantId: 'demo-household',
      feature: 'documents',
      usage: 118,
      windowStart: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      windowEnd: new Date(now + 18 * 60 * 60 * 1000).toISOString(),
      limit: 200,
    },
    {
      tenantId: 'lofts-portfolio',
      feature: 'amenity_bookings',
      usage: 940,
      windowStart: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      windowEnd: new Date(now + 12 * 60 * 60 * 1000).toISOString(),
      limit: 1600,
    },
  ]
}

const FALLBACK_TENANT_PLANS: TenantPlanRow[] = [
  {
    tenant_id: 'demo-household',
    plan_code: 'starter',
    overrides: {
      documents: { limit: 200 },
      messages: { windowSeconds: 1800 },
    },
  },
  {
    tenant_id: 'lofts-portfolio',
    plan_code: 'growth',
    overrides: {
      amenity_bookings: { limit: 1600 },
    },
  },
]
