import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

import { PackageServiceError, assertEnv } from './errors'

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVIC_ROLE_KEY

  if (!url) {
    throw new PackageServiceError('NEXT_PUBLIC_SUPABASE_URL is not configured', 500)
  }

  const key = assertEnv(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY')

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
