import {
  DEFAULT_PLAN_CODE,
  PLAN_DEFINITIONS,
  PLAN_FEATURES,
  parseTenantOverrides,
  type PlanCode,
  type PlanFeature,
  type TenantPlanOverrides,
} from './index'

export interface TenantPlanRow {
  tenant_id: string
  plan_code: PlanCode
  overrides: TenantPlanOverrides | null
  updated_at?: string | null
}

export interface UsageCounterRecord {
  tenantId: string
  feature: PlanFeature
  usage: number
  windowStart: string
  windowEnd: string
  limit?: number | null
}

interface RawUsageRow {
  tenant_id?: string
  feature?: string
  usage?: number
  window_start?: string
  window_end?: string
  limit?: number | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const baseHeaders = serviceKey
  ? {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  : null

export async function fetchTenantPlan(tenantId: string): Promise<TenantPlanRow | null> {
  if (!supabaseUrl || !serviceKey || !baseHeaders) {
    return null
  }

  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    select: 'tenant_id,plan_code,overrides',
    limit: '1',
  })

  const response = await fetch(`${supabaseUrl}/rest/v1/tenant_plans?${params.toString()}`, {
    headers: {
      ...baseHeaders,
      Prefer: 'return=representation',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('Failed to load tenant plan', await safeReadError(response))
    return null
  }

  const payload = (await response.json()) as Array<{
    tenant_id: string
    plan_code: PlanCode
    overrides: unknown
  }>

  const record = payload?.[0]
  if (!record) {
    return null
  }

  return {
    tenant_id: record.tenant_id,
    plan_code: record.plan_code,
    overrides: parseTenantOverrides(record.overrides),
  }
}

export interface RecordTenantUsageOptions {
  tenantId: string
  feature: PlanFeature
  windowSeconds: number
  limit: number
  amount?: number
  now?: Date
}

export async function recordTenantFeatureUsage(
  options: RecordTenantUsageOptions
): Promise<UsageCounterRecord | null> {
  if (!supabaseUrl || !serviceKey || !baseHeaders) {
    return null
  }

  const amount = options.amount ?? 1
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()

  try {
    const existingParams = new URLSearchParams({
      tenant_id: `eq.${options.tenantId}`,
      feature: `eq.${options.feature}`,
      select: 'tenant_id,feature,usage,window_start,window_end,limit',
      limit: '1',
    })

    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/tenant_plan_usage_counters?${existingParams.toString()}`,
      {
        headers: baseHeaders,
        cache: 'no-store',
      }
    )

    if (!existingResponse.ok) {
      console.error('Failed to read plan usage counter', await safeReadError(existingResponse))
      return null
    }

    const existingPayload = (await existingResponse.json()) as RawUsageRow[]
    const existing = existingPayload?.[0]

    let usage = amount
    let windowStart = nowIso
    let windowEnd = new Date(now.getTime() + options.windowSeconds * 1000).toISOString()

    if (existing) {
      const windowEndMs = existing.window_end ? Date.parse(existing.window_end) : Number.NaN
      if (Number.isFinite(windowEndMs) && windowEndMs > now.getTime()) {
        usage = (existing.usage ?? 0) + amount
        windowStart = existing.window_start ?? windowStart
        windowEnd = existing.window_end ?? windowEnd
      }
    }

    const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/tenant_plan_usage_counters`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        tenant_id: options.tenantId,
        feature: options.feature,
        usage,
        window_start: windowStart,
        window_end: windowEnd,
        limit: options.limit,
        updated_at: nowIso,
      }),
    })

    if (!upsertResponse.ok) {
      console.error('Failed to upsert plan usage counter', await safeReadError(upsertResponse))
      return null
    }

    const upsertPayload = await upsertResponse.json()
    const record: RawUsageRow | undefined = Array.isArray(upsertPayload)
      ? upsertPayload[0]
      : upsertPayload

    return {
      tenantId: record?.tenant_id ?? options.tenantId,
      feature: options.feature,
      usage: typeof record?.usage === 'number' ? record!.usage : usage,
      windowStart: record?.window_start ?? windowStart,
      windowEnd: record?.window_end ?? windowEnd,
      limit:
        typeof record?.limit === 'number' || record?.limit === null
          ? record.limit
          : options.limit,
    }
  } catch (error) {
    console.error('Unexpected error while recording tenant usage', error)
    return null
  }
}

export async function fetchAllTenantPlans(): Promise<TenantPlanRow[]> {
  if (!supabaseUrl || !serviceKey || !baseHeaders) {
    return []
  }

  const params = new URLSearchParams({
    select: 'tenant_id,plan_code,overrides,updated_at',
    order: 'tenant_id',
  })

  const response = await fetch(`${supabaseUrl}/rest/v1/tenant_plans?${params.toString()}`, {
    headers: {
      ...baseHeaders,
      Prefer: 'return=representation',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('Failed to list tenant plans', await safeReadError(response))
    return []
  }

  const payload = (await response.json()) as Array<{
    tenant_id: string
    plan_code: string
    overrides: unknown
    updated_at?: string | null
  }>

  return payload.map((row) => {
    const planCode =
      row.plan_code in PLAN_DEFINITIONS
        ? (row.plan_code as PlanCode)
        : DEFAULT_PLAN_CODE

    return {
      tenant_id: row.tenant_id,
      plan_code: planCode,
      overrides: parseTenantOverrides(row.overrides),
      updated_at: row.updated_at ?? null,
    }
  })
}

export async function fetchUsageCounters(): Promise<UsageCounterRecord[]> {
  if (!supabaseUrl || !serviceKey || !baseHeaders) {
    return []
  }

  const params = new URLSearchParams({
    select: 'tenant_id,feature,usage,window_start,window_end,limit',
  })

  const response = await fetch(
    `${supabaseUrl}/rest/v1/tenant_plan_usage_counters?${params.toString()}`,
    {
      headers: baseHeaders,
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    console.error('Failed to load tenant usage counters', await safeReadError(response))
    return []
  }

  const payload = (await response.json()) as RawUsageRow[]

  return payload
    .map((row) => {
      if (!row.feature || !PLAN_FEATURES.includes(row.feature as PlanFeature)) {
        return null
      }

      return {
        tenantId: row.tenant_id ?? '',
        feature: row.feature as PlanFeature,
        usage: row.usage ?? 0,
        windowStart: row.window_start ?? '',
        windowEnd: row.window_end ?? '',
        limit: row.limit ?? null,
      }
    })
    .filter((value): value is UsageCounterRecord => value !== null && value.tenantId.length > 0)
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text || response.statusText
  } catch {
    return response.statusText
  }
}
