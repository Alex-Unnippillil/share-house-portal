import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'
import { createInstrumentedFetch } from '@/utils/observability/query-logging'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createInstrumentedFetch({
        operation: 'auth-admin',
        metadata: { client: 'supabase-auth-admin' },
      }),
    },
  }
)

// Access auth admin api
export const adminAuthClient = supabase.auth.admin