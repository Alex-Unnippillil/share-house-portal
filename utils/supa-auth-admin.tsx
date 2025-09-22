import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'
import { createSupabaseClientLoggingConfig } from '@/utils/supabase/logging'

const loggingConfig = createSupabaseClientLoggingConfig({
  traceId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined,
  source: 'service-role',
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...loggingConfig,
  },
)

// Access auth admin api
export const adminAuthClient = supabase.auth.admin
