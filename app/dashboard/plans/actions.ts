'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

import type { Database } from '@/lib/supabase'
import {
  DEFAULT_PLAN_CODE,
  PLAN_DEFINITIONS,
  PLAN_FEATURES,
  type PlanCode,
  type PlanFeature,
  type TenantPlanOverrides,
} from '@/lib/rate-limit'
import { fetchTenantPlan } from '@/lib/rate-limit/service'

interface OverrideParseResult<T> {
  provided: boolean
  value?: T
  valid: boolean
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const createServiceClient = () => {
  if (!supabaseUrl || !serviceKey) {
    return null
  }

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function updatePlanOverride(formData: FormData) {
  const tenantId = String(formData.get('tenant_id') ?? '').trim()
  const feature = parseFeature(formData.get('feature'))
  const resetFlag = formData.get('reset') === 'true'
  const planCodeInput = parsePlanCode(formData.get('plan_code'))

  if (!tenantId || !feature) {
    return {
      ok: false,
      error: 'Tenant identifier and feature are required to update quotas.',
    }
  }

  if (!supabaseUrl || !serviceKey) {
    return {
      ok: false,
      error: 'Supabase service credentials are not configured.',
    }
  }

  const client = createServiceClient()
  if (!client) {
    return {
      ok: false,
      error: 'Unable to initialize Supabase client for plan overrides.',
    }
  }

  const existingPlan = await fetchTenantPlan(tenantId)
  const currentOverrides: TenantPlanOverrides = {
    ...(existingPlan?.overrides ?? {}),
  }
  const featureOverride: {
    limit?: number | null
    windowSeconds?: number
  } = { ...(currentOverrides[feature] ?? {}) }

  if (resetFlag) {
    delete currentOverrides[feature]
  } else {
    const limitOverride = parseLimitOverride(formData.get('limit'))
    const windowOverride = parseWindowOverride(formData.get('window_seconds'))

    if (!limitOverride.valid || !windowOverride.valid) {
      return {
        ok: false,
        error: 'Override values must be positive numbers or blank to inherit plan defaults.',
      }
    }

    if (limitOverride.provided) {
      if (limitOverride.value === undefined) {
        delete featureOverride.limit
      } else {
        featureOverride.limit = limitOverride.value
      }
    }

    if (windowOverride.provided) {
      if (windowOverride.value === undefined) {
        delete featureOverride.windowSeconds
      } else {
        featureOverride.windowSeconds = windowOverride.value
      }
    }

    if (Object.keys(featureOverride).length > 0) {
      currentOverrides[feature] = featureOverride
    } else {
      delete currentOverrides[feature]
    }
  }

  const sanitizedOverrides =
    Object.keys(currentOverrides).length > 0 ? currentOverrides : null

  const planCode =
    planCodeInput && planCodeInput in PLAN_DEFINITIONS
      ? planCodeInput
      : existingPlan?.plan_code ?? DEFAULT_PLAN_CODE

  const { error } = await client
    .from('tenant_plans')
    .upsert(
      {
        tenant_id: tenantId,
        plan_code: planCode,
        overrides: sanitizedOverrides,
      },
      { onConflict: 'tenant_id' }
    )

  if (error) {
    console.error('Failed to persist tenant plan override', error)
    return {
      ok: false,
      error: 'Unable to update plan override at this time.',
    }
  }

  revalidatePath('/dashboard/plans')

  return { ok: true }
}

function parseFeature(value: FormDataEntryValue | null): PlanFeature | null {
  if (typeof value !== 'string') {
    return null
  }

  return PLAN_FEATURES.includes(value as PlanFeature)
    ? (value as PlanFeature)
    : null
}

function parsePlanCode(value: FormDataEntryValue | null): PlanCode | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  return value.trim() as PlanCode
}

function parseLimitOverride(
  value: FormDataEntryValue | null
): OverrideParseResult<number | null> {
  if (value === null) {
    return { provided: false, valid: true }
  }

  const raw = String(value).trim()
  if (raw.length === 0) {
    return { provided: true, value: undefined, valid: true }
  }

  if (raw.toLowerCase() === 'unlimited') {
    return { provided: true, value: null, valid: true }
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { provided: true, valid: false }
  }

  return { provided: true, value: Math.floor(parsed), valid: true }
}

function parseWindowOverride(
  value: FormDataEntryValue | null
): OverrideParseResult<number> {
  if (value === null) {
    return { provided: false, valid: true }
  }

  const raw = String(value).trim()
  if (raw.length === 0) {
    return { provided: true, value: undefined, valid: true }
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { provided: true, valid: false }
  }

  return { provided: true, value: Math.floor(parsed), valid: true }
}
