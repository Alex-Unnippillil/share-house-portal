import 'server-only'

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

import type {
  AppEnvironment,
  FeatureFlagName,
} from '@/config/feature-flags'
import {
  featureFlagNames,
  getDefaultFlagsForEnv,
} from '@/config/feature-flags'
import type { Database } from './supabase'

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn(
      'Supabase credentials missing — feature flags will fall back to defaults.',
    )
    return null
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

const getCachedAdminClient = cache(getSupabaseAdminClient)

export function getRuntimeEnvironment(): AppEnvironment {
  const vercelEnv = process.env.VERCEL_ENV
  if (
    vercelEnv === 'production' ||
    vercelEnv === 'preview' ||
    vercelEnv === 'development'
  ) {
    return vercelEnv
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export const resolveFeatureFlags = cache(
  async (
    environment: AppEnvironment = getRuntimeEnvironment(),
  ): Promise<Record<FeatureFlagName, boolean>> => {
    const defaults = getDefaultFlagsForEnv(environment)
    const client = getCachedAdminClient()

    if (!client) {
      return defaults
    }

    const { data, error } = await client
      .from('feature_flags')
      .select('slug, enabled')
      .eq('environment', environment)

    if (error) {
      console.error('Failed to load feature flag overrides from Supabase', error)
      return defaults
    }

    const overrides = { ...defaults }
    for (const row of data ?? []) {
      if (featureFlagNames.includes(row.slug as FeatureFlagName)) {
        overrides[row.slug as FeatureFlagName] = row.enabled
      }
    }

    return overrides
  },
)

export async function getFeatureFlagValue(
  flag: FeatureFlagName,
  environment?: AppEnvironment,
): Promise<boolean> {
  const flags = await resolveFeatureFlags(environment)
  return flags[flag]
}

export type FeatureFlagSnapshot = Awaited<ReturnType<typeof resolveFeatureFlags>>
