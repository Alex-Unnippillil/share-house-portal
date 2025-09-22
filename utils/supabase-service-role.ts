import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

let serviceClient: ReturnType<typeof createClient<Database>> | null = null

export function getServiceRoleSupabase() {
  if (serviceClient) {
    return serviceClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Supabase service role credentials are not configured')
  }

  serviceClient = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceClient
}
