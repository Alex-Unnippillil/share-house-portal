import { createClient } from '@supabase/supabase-js'

import { createSupabaseInstrumentationConfig } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...createSupabaseInstrumentationConfig({
      helper: 'utils/supa-auth-admin',
      environment: 'server',
      context: { helper: 'utils/supa-auth-admin' },
    }),
  }
)

// Access auth admin api
export const adminAuthClient = supabase.auth.admin
